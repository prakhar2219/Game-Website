const Room = require('../models/Room');
const Player = require('../models/Player');
const iplPlayers = require('../data/iplPlayers');

const TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'GT', 'SRH', 'LSG', 'DC', 'RR', 'PBKS'];

module.exports = (io, socket) => {

  // Start Draft
  socket.on('startIPLDraft', async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('players');
      if (!room || room.players.length !== 2) return; // Strict 2 player check

      // Initialize Squads and Team Limits (max 2 per team per player)
      const squads = {};
      const teamCounts = {};
      
      room.players.forEach(p => {
        const pid = p._id.toString();
        squads[pid] = [];
        teamCounts[pid] = {};
        TEAMS.forEach(t => {
          teamCounts[pid][t] = 0;
        });
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
      room.markModified('iplDraft');

      room.turnIndex = 0;
      await room.save();

      io.to(roomCode).emit('iplDraftStarted', { 
        squads,
        teamCounts,
        currentTurn: room.players[0]._id.toString()
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

      // Enforce turn on the server side based on socket
      const requestingPlayer = await Player.findOne({ roomCode, socketId: socket.id });
      if (!requestingPlayer) return;

      const currentTurnPlayerId = room.players[room.turnIndex].toString();
      if (requestingPlayer._id.toString() !== currentTurnPlayerId) {
        socket.emit('error', 'Not your turn to spin.');
        return;
      }

      const player = room.players[room.turnIndex];
      const playerId = player.toString();
      const playerTeamCounts = room.iplDraft.teamCounts?.[playerId] || {};

      // Filter available teams (Count < 2) for this player
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
        playerId: playerId
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

      const availableIds = room.iplDraft.availablePlayers || [];
      let teamPlayers = [];

      if (team === 'ANY') {
        // "ANY" should not directly return all players; the client will first
        // ask the user to pick a specific team, then call this again with that team.
        return;
      }

      teamPlayers = iplPlayers.filter(p => p.team === team && availableIds.includes(p.id));

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

      // Plain JS objects for squads and teamCounts
      const squadsContainer = room.iplDraft.squads || {};
      const teamCountsContainer = room.iplDraft.teamCounts || {};

      const existingSquad = squadsContainer[playerId] || [];

      if (existingSquad.length >= 15) return; // Max 15 validation

      const existingCounts = teamCountsContainer[playerId] || {};

      const team = playerObj.team;

      // Enforce max 2 players per team (server-side safety)
      if ((existingCounts[team] || 0) >= 2) {
        socket.emit('error', 'You already have 2 players from this team.');
        return;
      }

      const updatedSquad = [...existingSquad, playerObj];
      const updatedCounts = {
        ...existingCounts,
        [team]: (existingCounts[team] || 0) + 1
      };

      squadsContainer[playerId] = updatedSquad;
      teamCountsContainer[playerId] = updatedCounts;

      room.iplDraft.squads = squadsContainer;
      room.iplDraft.teamCounts = teamCountsContainer;

      // Remove from Available
      room.iplDraft.availablePlayers = room.iplDraft.availablePlayers.filter(id => id !== playerObj.id);

      // Check Win/End Condition (Total 15 players)
      if (updatedSquad.length >= 15 && room.players.every(p => {
          const pid = p._id.toString();
          if (pid === playerId) return true; // this player just reached 15
          const otherSquad = squadsContainer[pid] || [];
          return otherSquad.length >= 15;
      })) {
          room.gameState = 'FINISHED';
          await room.save();
          room.markModified('iplDraft');
          await room.save();

          io.to(roomCode).emit('iplDraftFinished', { squads: squadsContainer });
          return;
      }

      // Switch Turn
      const nextTurnIndex = (room.turnIndex + 1) % room.players.length;
      room.turnIndex = nextTurnIndex;
      
      // Clear Spinner
      room.iplDraft.currentSpinner = { team: null, spinning: false };
      room.markModified('iplDraft');
      await room.save();

      io.to(roomCode).emit('updateIPLDraft', {
        squads: squadsContainer,
        teamCounts: teamCountsContainer,
        lastPick: playerObj,
        nextTurn: room.players[nextTurnIndex]._id.toString(),
        availablePlayersCount: room.iplDraft.availablePlayers.length
      });

    } catch (err) {
      console.error(err);
    }
  });

};
