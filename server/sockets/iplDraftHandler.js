const Room = require('../models/Room');
const iplPlayers = require('../data/iplPlayers');

const TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'GT', 'SRH', 'LSG', 'DC', 'RR', 'PBKS'];

module.exports = (io, socket) => {

  // Start Draft
  socket.on('startIPLDraft', async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('players');
      if (!room || room.players.length !== 2) return; // Strict 2 player check

      // Initialize Squads
      const squads = {};
      const teamCounts = {};
      
      room.players.forEach(p => {
        squads[p._id] = [];
        teamCounts[p._id] = {};
        TEAMS.forEach(t => teamCounts[p._id][t] = 0);
      });

      // Initialize Game State
      room.gameState = 'PLAYING';
      room.gameType = 'ipl_draft';
      room.iplDraft = {
        squads,
        teamCounts,
        availablePlayers: iplPlayers.map(p => p.id), // Store IDs
        currentSpinner: {
          team: null,
          spinning: false
        }
      };
      
      room.turnIndex = 0;
      await room.save();

      io.to(roomCode).emit('iplDraftStarted', { 
        squads, 
        currentTurn: room.players[0]._id 
      });

    } catch (err) {
      console.error(err);
    }
  });

  // Spin Wheel
  socket.on('spinWheel', async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const player = room.players[room.turnIndex];
      const playerTeamCounts = room.iplDraft.teamCounts.get(player.toString());

      // Filter available teams (Count < 2)
      const availableTeams = TEAMS.filter(t => (playerTeamCounts?.[t] || 0) < 2);
      
      // Add "ANY" option? (Maybe always available or weighted?)
      // Requirement: "Any Team" Option
      // Let's add 'ANY' to the pool if valid.
      const spinPool = [...availableTeams, 'ANY'];

      // Random Select
      const randomTeam = spinPool[Math.floor(Math.random() * spinPool.length)];

      // Update State
      room.iplDraft.currentSpinner = {
        team: randomTeam,
        spinning: true
      };
      await room.save();

      // Emit Spin Event (Client handles animation)
      io.to(roomCode).emit('wheelSpinning', { 
        result: randomTeam,
        playerId: player 
      });

      // Reset spinning flag after delay (handled by pick or timeout?)
      // Actually client will request player list after animation.

    } catch (err) {
      console.error(err);
    }
  });

  // Get Players for Team (Client asks after spin lands)
  socket.on('getPlayersForTeam', async ({ roomCode, team }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      let availableIds = room.iplDraft.availablePlayers;
      let teamPlayers = [];

      if (team === 'ANY') {
          // Flatten all available players
          teamPlayers = iplPlayers.filter(p => availableIds.includes(p.id));
      } else {
          teamPlayers = iplPlayers.filter(p => p.team === team && availableIds.includes(p.id));
      }

      socket.emit('teamPlayersList', { team, players: teamPlayers });

    } catch (err) {
      console.error(err);
    }
  });

  // Pick Player
  socket.on('pickPlayer', async ({ roomCode, playerId, playerObj }) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('players');
      if (!room) return;

      // Validate Turn
      const turnPlayer = room.players[room.turnIndex];
      if (turnPlayer._id.toString() !== playerId) return;

      // Update Squad
      const currentSquad = room.iplDraft.squads.get(playerId) || [];
      if (currentSquad.length >= 15) return; // Max 15 validation

      room.iplDraft.squads.set(playerId, [...currentSquad, playerObj]);

      // Update Team Count
      const currentCounts = room.iplDraft.teamCounts.get(playerId);
      const team = playerObj.team;
      currentCounts[team] = (currentCounts[team] || 0) + 1;
      room.iplDraft.teamCounts.set(playerId, currentCounts);

      // Remove from Available
      room.iplDraft.availablePlayers = room.iplDraft.availablePlayers.filter(id => id !== playerObj.id);

      // Check Win/End Condition (Total 15 players)
      if (currentSquad.length + 1 >= 15 && room.players.every(p => {
          if (p._id.toString() === playerId) return true; // this player just reached 15
          return (room.iplDraft.squads.get(p._id.toString()) || []).length >= 15;
      })) {
          room.gameState = 'FINISHED';
          await room.save();
          io.to(roomCode).emit('iplDraftFinished', { squads: Object.fromEntries(room.iplDraft.squads) });
          return;
      }

      // Switch Turn
      const nextTurnIndex = (room.turnIndex + 1) % room.players.length;
      room.turnIndex = nextTurnIndex;
      
      // Clear Spinner
      room.iplDraft.currentSpinner = { team: null, spinning: false };
      
      await room.save();

      io.to(roomCode).emit('updateIPLDraft', {
        squads: Object.fromEntries(room.iplDraft.squads),
        teamCounts: Object.fromEntries(room.iplDraft.teamCounts),
        lastPick: playerObj,
        nextTurn: room.players[nextTurnIndex]._id,
        availablePlayersCount: room.iplDraft.availablePlayers.length
      });

    } catch (err) {
      console.error(err);
    }
  });

};
