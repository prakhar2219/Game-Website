const Player = require('../models/Player');
const Room = require('../models/Room');
const shuffle = require('../utils/shuffle');

// Card Deck: 4 groups of 4 identical cards (Values: A, K, Q, J)
const BASE_DECK = ['A', 'A', 'A', 'A', 'K', 'K', 'K', 'K', 'Q', 'Q', 'Q', 'Q', 'J', 'J', 'J', 'J'];

const roomTimers = {}; // roomCode -> timeoutId

const clearRoomTimer = (roomCode) => {
  if (roomTimers[roomCode]) {
    clearTimeout(roomTimers[roomCode]);
    delete roomTimers[roomCode];
  }
};

module.exports = (io, socket) => {

  const startTurnTimer = async (roomCode, turnPlayerId) => {
    clearRoomTimer(roomCode);

    const duration = 20000; // 20 seconds
    const timerStart = Date.now();

    // Emit timer start to clients
    io.to(roomCode).emit('timerUpdate', { 
      turnPlayerId,
      timerStart,
      duration 
    });

    roomTimers[roomCode] = setTimeout(async () => {
      console.log(`[${roomCode}] Timer expired for ${turnPlayerId}. Auto-passing.`);
      await handleAutoPass(roomCode, turnPlayerId);
    }, duration);
  };

  const handleAutoPass = async (roomCode, expectedTurnPlayerId) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('players');
      if (!room || room.gameState !== 'PLAYING') return;

      const currentPlayer = room.players[room.turnIndex];
      
      // Safety check: ensure turn hasn't changed race condition
      if (currentPlayer._id.toString() !== expectedTurnPlayerId.toString()) return;

      // Pick Random Card
      if (currentPlayer.cards.length === 0) return; // Should not happen
      const randomCardIndex = Math.floor(Math.random() * currentPlayer.cards.length);
      const cardToPass = currentPlayer.cards[randomCardIndex];

      await executePass(room, cardToPass, currentPlayer);

    } catch (err) {
      console.error(`Error in auto-pass for room ${roomCode}:`, err);
    }
  };

  const executePass = async (room, card, fromPlayer) => {
      const fromPlayerIndex = room.players.findIndex(p => p._id.equals(fromPlayer._id));
      if (fromPlayerIndex === -1) return;

      const toPlayerIndex = (fromPlayerIndex + 1) % 4;
      const toPlayer = room.players[toPlayerIndex];

      // Remove from sender
      const cardIdx = fromPlayer.cards.indexOf(card);
      if (cardIdx > -1) {
        fromPlayer.cards.splice(cardIdx, 1);
        await fromPlayer.save();
      }

      // Add to receiver
      toPlayer.cards.push(card);
      await toPlayer.save();

      // Notify updates
      io.to(fromPlayer.socketId).emit('updateHand', { cards: fromPlayer.cards });
      io.to(toPlayer.socketId).emit('updateHand', { cards: toPlayer.cards });

      // Update Turn
      room.turnIndex = toPlayerIndex;
      await room.save();

      const nextPlayer = room.players[toPlayerIndex];
      
      io.to(room.roomCode).emit('updateTurn', { 
        turnPlayerId: nextPlayer._id,
        lastAction: `Passed a card to ${toPlayer.username}`
      });

      // Start Timer for Next Player
      startTurnTimer(room.roomCode, nextPlayer._id);
  };

  // Start Game
  socket.on('startFourKindGame', async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('players');
      if (!room || room.players.length !== 4) return;

      // 1. Shuffle Deck
      let deck = shuffle([...BASE_DECK]);

      // 2. Distribute 4 cards to each player
      const updates = [];
      room.players.forEach((player, index) => {
        player.cards = deck.slice(index * 4, (index + 1) * 4);
        player.incomingCard = null;
        updates.push(player.save());
      });
      await Promise.all(updates);

      // 3. Set Turn (Circular)
      room.gameState = 'PLAYING';
      room.turnIndex = 0; 
      await room.save();

      // 4. Emit Game Start
      io.to(roomCode).emit('fourKindGameStarted');
      
      // 5. Emit Initial Hands
      for (const p of room.players) {
        io.to(p.socketId).emit('updateHand', { cards: p.cards });
      }

      // 6. Emit Turn & Start Timer
      const currentTurnPlayer = room.players[0];
      io.to(roomCode).emit('updateTurn', { 
        turnPlayerId: currentTurnPlayer._id,
        isFirstTurn: true
      });
      startTurnTimer(roomCode, currentTurnPlayer._id);

    } catch (err) {
      console.error(err);
    }
  });

  // Pass Card
  socket.on('passCard', async ({ roomCode, card, fromPlayerId }) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('players');
      if (!room) return;

      // Reset timer immediately to prevent auto-pass firing during processing
      clearRoomTimer(roomCode);

      const fromPlayer = room.players.find(p => p._id.toString() === fromPlayerId);
      if (!fromPlayer) return;

      // Validate turn
      const currentTurnPlayer = room.players[room.turnIndex];
      if (currentTurnPlayer._id.toString() !== fromPlayerId) return;

      await executePass(room, card, fromPlayer);

    } catch (err) {
      console.error(err);
    }
  });

  // Claim Victory / Win Check
  socket.on('checkWin', async ({ roomCode, playerId }) => {
     try {
         const player = await Player.findById(playerId);
         const room = await Room.findOne({ roomCode });
         
         if (!player || !room) return;
         if (player.cards.length < 4) return;
         
         const counts = {};
         player.cards.forEach(c => counts[c] = (counts[c] || 0) + 1);
         const hasFourOfKind = Object.values(counts).some(count => count >= 4);
         
         if (hasFourOfKind) {
             clearRoomTimer(roomCode); // Stop timer

             room.gameState = 'FINISHED';
             room.gameHistory.push({
                 winner: player.username,
                 timestamp: new Date()
             });
             await room.save();

             io.to(roomCode).emit('gameOver', { 
                 winner: player.username,
                 cards: player.cards,
                 history: room.gameHistory
             });
         }
     } catch (err) {
         console.error(err);
     }
  });

  // Next Round
  socket.on('nextFourKindRound', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode }).populate('players');
        if (!room || room.players.length !== 4) return;

        let deck = shuffle([...BASE_DECK]);
        const updates = [];
        room.players.forEach((player, index) => {
            player.cards = deck.slice(index * 4, (index + 1) * 4);
            player.incomingCard = null; 
            updates.push(player.save());
        });
        await Promise.all(updates);

        room.gameState = 'PLAYING';
        
        if (room.gameHistory.length > 0) {
            const lastWinnerName = room.gameHistory[room.gameHistory.length - 1].winner;
            const winnerIndex = room.players.findIndex(p => p.username === lastWinnerName);
            if (winnerIndex !== -1) {
                room.turnIndex = winnerIndex;
            } else {
                room.turnIndex = 0;
            }
        } else {
            room.turnIndex = 0;
        }

        await room.save();

        io.to(roomCode).emit('fourKindGameStarted');
        
        for (const p of room.players) {
            io.to(p.socketId).emit('updateHand', { cards: p.cards });
        }
        
        const currentTurnPlayer = room.players[room.turnIndex];
        io.to(roomCode).emit('updateTurn', { 
            turnPlayerId: currentTurnPlayer._id,
            isFirstTurn: true 
        });
        startTurnTimer(roomCode, currentTurnPlayer._id);

      } catch (err) {
          console.error(err);
      }
  });

  // Cleanup on disconnect (optional)
  // socket.on('disconnect', ...) // handled in main index.js, but we might want to clear timers if room empty
};
