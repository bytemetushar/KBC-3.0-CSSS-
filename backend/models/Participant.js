const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  totalTimeTaken: {
    type: Number,
    default: 0
  },
  answers: [{
    questionId: String,
    answer: String,
    status: String,
    timeTaken: Number,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Participant', ParticipantSchema);
