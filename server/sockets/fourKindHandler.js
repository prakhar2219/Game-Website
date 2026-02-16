const Player = require('../models/Player');
const Room = require('../models/Room');
const shuffle = require('../utils/shuffle');

// Card Deck: 4 groups of 4 identical cards (Values: A, K, Q, J)
const BASE_DECK = ['A', 'A', 'A', 'A', 'K', 'K', 'K', 'K', 'Q', 'Q', 'Q', 'Q', 'J', 'J', 'J', 'J'];

module.exports = (io, socket) => {
  
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
      room.turnIndex = 0; // Starts with player 0 (Host usually)
      await room.save();

      // 4. Emit Game Start
      io.to(roomCode).emit('fourKindGameStarted');
      
      // 5. Emit Initial Hands
      for (const p of room.players) {
        io.to(p.socketId).emit('updateHand', { cards: p.cards });
      }

      // 6. Emit Turn Info
      const currentTurnPlayer = room.players[0];
      io.to(roomCode).emit('updateTurn', { 
        turnPlayerId: currentTurnPlayer._id,
        isFirstTurn: true // Special flag for first move handling
      });

    } catch (err) {
      console.error(err);
    }
  });

  // Pass Card
  socket.on('passCard', async ({ roomCode, card, fromPlayerId }) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('players');
      if (!room) return;

      const fromPlayerIndex = room.players.findIndex(p => p._id.toString() === fromPlayerId);
      if (fromPlayerIndex === -1) return;

      // Calculate Next Player (Circular)
      const toPlayerIndex = (fromPlayerIndex + 1) % 4;
      const fromPlayer = room.players[fromPlayerIndex];
      const toPlayer = room.players[toPlayerIndex];

      // Remove card from sender
      const cardIdx = fromPlayer.cards.indexOf(card);
      if (cardIdx > -1) {
        fromPlayer.cards.splice(cardIdx, 1);
        await fromPlayer.save();
      }

      // Add to receiver (as incoming or direct?)
      // For simplicity/speed: Add directly to hand. 
      // User must then have 5 cards and discard 1.
      toPlayer.cards.push(card);
      await toPlayer.save();

      // Notify updates
      io.to(fromPlayer.socketId).emit('updateHand', { cards: fromPlayer.cards });
      io.to(toPlayer.socketId).emit('updateHand', { cards: toPlayer.cards });

      // Check Win Condition for Receiver?
      // Usually you check win when you have 4 matching.
      // But now they have 5. They need to discard to win? 
      // Or if they have 4 matching + 1 extra?
      // Let's check if any 4 cards match.
      // Actually standard rule: You pass, then you check? 
      // Or you receive, check, then pass?
      // "Goal: First player to have all 4 same cards wins"
      // If I have A A A A K, I win? Yes.

      // Update Turn
      room.turnIndex = toPlayerIndex;
      await room.save();

      io.to(roomCode).emit('updateTurn', { 
        turnPlayerId: toPlayer._id,
        lastAction: `Passed a card to ${toPlayer.username}`
      });

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
         
         // Basic validation (must have at least 4 cards)
         if (player.cards.length < 4) return;
         
         // Check counts
         const counts = {};
         player.cards.forEach(c => counts[c] = (counts[c] || 0) + 1);
         
         // If any card has count 4
         const hasFourOfKind = Object.values(counts).some(count => count >= 4);
         
         if (hasFourOfKind) {
             // 1. Update Room State
             room.gameState = 'FINISHED';
             
             // 2. Add to History
             // We need to keep only last 5? Or all? Let's keep all for now.
             room.gameHistory.push({
                 winner: player.username,
                 timestamp: new Date()
             });
             await room.save();

             // 3. Emit Game Over
             io.to(roomCode).emit('gameOver', { 
                 winner: player.username,
                 cards: player.cards,
                 history: room.gameHistory
             });
         } else {
             // False claim logic? For now just ignore or toast error to user socket
             // socket.emit('error', 'Not a valid hand!');
         }
     } catch (err) {
         console.error(err);
     }
  });

  // Next Round (Winner starts)
  socket.on('nextFourKindRound', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode }).populate('players');
        if (!room || room.players.length !== 4) return;

        // 1. Shuffle Deck
        let deck = shuffle([...BASE_DECK]);

        // 2. Distribute 4 cards to each player
        const updates = [];
        room.players.forEach((player, index) => {
            player.cards = deck.slice(index * 4, (index + 1) * 4);
            player.incomingCard = null; // Clear any pending
            updates.push(player.save());
        });
        await Promise.all(updates);

        // 3. Reset Game State
        room.gameState = 'PLAYING';
        
        // Winner should start? 
        // Need to find winner index.
        // Or just start with random/circular?
        // User asked: "winning player must start the game"
        // We know the winner from history?
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

        // 4. Emit Events
        io.to(roomCode).emit('fourKindGameStarted');
        
        for (const p of room.players) {
            io.to(p.socketId).emit('updateHand', { cards: p.cards });
        }
        
        const currentTurnPlayer = room.players[room.turnIndex];
        io.to(roomCode).emit('updateTurn', { 
            turnPlayerId: currentTurnPlayer._id,
            isFirstTurn: true 
        });

      } catch (err) {
          console.error(err);
      }
  });
};
