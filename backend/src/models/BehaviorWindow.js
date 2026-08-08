const mongoose = require('mongoose');

const behaviorWindowSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    session: {
      type: String,
      required: true,
    },
    context: {
      type: String,
      enum: ['quiz', 'assignment', 'code', 'exam', 'general'],
      required: true,
    },
    windowStartTime: {
      type: Date,
      required: true,
    },
    windowEndTime: {
      type: Date,
      required: true,
    },
    biometricFeatures: {
      dwellTimeMean: { type: Number, default: 0 },
      dwellTimeStd: { type: Number, default: 0 },
      flightTimeMean: { type: Number, default: 0 },
      flightTimeStd: { type: Number, default: 0 },
      typingSpeed: { type: Number, default: 0 },
      backspaceRate: { type: Number, default: 0 },
      mouseSpeedMean: { type: Number, default: 0 },
      mouseSpeedStd: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      pathCurvature: { type: Number, default: 0 },
    },
    explicitFlags: {
      tabBlurCount: { type: Number, default: 0 },
      pasteCount: { type: Number, default: 0 },
      totalPastedChars: { type: Number, default: 0 }
    },
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BehaviorWindow', behaviorWindowSchema);
