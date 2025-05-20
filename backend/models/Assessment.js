const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['personality', 'skills', 'career', 'comprehensive'],
    required: true
  },
  answers: {
    type: Object,
    required: true
  },
  results: {
    type: Object,
    required: true
  },
  skillLevels: {
    type: Object,
    default: {}
  },
  recommendations: {
    type: Object,
    required: true
  },
  userProfile: {
    type: Object,
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Assessment', AssessmentSchema);
