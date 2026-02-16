const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  gameState: { 
    type: String, 
    enum: ['WAITING', 'PICKING', 'GUESSING', 'RESULT', 'PLAYING', 'FINISHED'], 
    default: 'WAITING' 
  },
  roles: [{ type: String }], // Array to store shuffled roles for the round
  pickedRoles: { type: Number, default: 0 }, // Track how many players picked
  turnIndex: { type: Number, default: 0 },
  gameType: { 
    type: String, 
    enum: ['raja_mantri', 'four_kind'], 
    default: 'raja_mantri' 
  },
  gameHistory: [{
      winner: { type: String }, // username
      timestamp: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Room', RoomSchema);
