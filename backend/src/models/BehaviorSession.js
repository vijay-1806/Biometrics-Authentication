const mongoose = require('mongoose');

const behaviorSessionSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    student: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.Mixed, // Quiz or Assignment ID
      required: true,
    },
    session: {
      type: String, // Unique session identifier for each exam run
      index: true,
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
    tabBlurCount: {
      type: Number,
      default: 0,
    },
    pasteCount: {
      type: Number,
      default: 0,
    },
    copyCount: {
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
