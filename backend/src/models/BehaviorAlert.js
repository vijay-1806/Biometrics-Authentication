const mongoose = require('mongoose');

const behaviorAlertSchema = new mongoose.Schema(
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
    session: {
      type: String,
      required: true,
    },
    exam: {
      type: String,
    },
    alertType: {
      type: String,
      enum: ['behavioral_anomaly', 'paste_detected', 'copy_detected', 'tab_switch', 'device_change'],
      default: 'behavioral_anomaly',
      required: true
    },
    score: {
      type: Number,
      default: null,
    },
    // topDeviatingFeatures shape by alertType:
    //   behavioral_anomaly: [{ feature: string, zscore: number }, ...]
    //   paste_detected:     { pasteCount: number, totalPastedChars: number }
    //   copy_detected:      { copyCount: number, totalCopiedChars: number }
    //   tab_switch:         { tabBlurCount: number }
    //   device_change:      { from: {userAgent, screenWidth, screenHeight}, to: {...} }
    topDeviatingFeatures: {
      type: mongoose.Schema.Types.Mixed,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BehaviorAlert', behaviorAlertSchema);
