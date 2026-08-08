const mongoose = require('mongoose');

const behaviorSessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz', // Quizzes with isExam=true
      required: true,
    },
    smoothedScore: {
      type: Number,
      default: 0.0,
    },
    history: {
      type: [Number],
      default: [],
    },
    alreadyFlaggedRecently: {
      type: Boolean,
      default: false,
    },
    flagTimeoutEnd: {
      type: Date,
      default: null,
    },
    totalWindowsScored: {
      type: Number,
      default: 0,
    },
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed,
    },
    initialDeviceInfo: {
      type: mongoose.Schema.Types.Mixed,
    },
    deviceChangeFlagged: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically clear sessions after 24 hours (86400 seconds)
behaviorSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('BehaviorSession', behaviorSessionSchema);
