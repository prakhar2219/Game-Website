const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  gameState: { 
    type: String, 
  gameState: {
    type: String,
    enum: ['WAITING', 'PICKING', 'GUESSING', 'RESULT', 'PLAYING', 'FINISHED'],
    default: 'WAITING'
  },
  turnIndex: { type: Number, default: 0 },
  gameType: { type: String, enum: ['raja_mantri', 'four_kind', 'ipl_draft'], default: 'raja_mantri' },

  // Raja Mantri Specific
  roles: [String],
  pickedRoles: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    role: String
  }],

  // Four of a Kind Specific
  gameHistory: [{
    winner: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  // IPL Spinner Draft Specific
  iplDraft: {
     squads: {
         type: Map,
         of: [Object], // Array of player objects {name, team, role, image}
         default: {}
     },
     teamCounts: {
         type: Map,
         of: Map, // playerID -> { "CSK": 1, "MI": 2 }
         default: {}
     },
     availablePlayers: [String], // Array of playerIDs
     currentSpinner: {
         team: String,
         spinning: Boolean
     }
  },
});

module.exports = mongoose.model('Room', RoomSchema);
