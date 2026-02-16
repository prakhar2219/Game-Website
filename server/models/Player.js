const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  username: { type: String, required: true },
  socketId: { type: String, required: true },
  roomCode: { type: String, required: true },
  currRole: { type: String, default: null }, // 'Raja', 'Mantri', 'Chor', 'Sipahi'
  currPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  isHost: { type: Boolean, default: false },
  cards: [{ type: String }], // Array of card values for Four of a Kind
  incomingCard: { type: String, default: null } // Card received but not yet added to hand (if needed for animation/state)
});

module.exports = mongoose.model('Player', PlayerSchema);
