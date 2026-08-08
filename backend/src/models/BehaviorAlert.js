const mongoose = require('mongoose');

const behaviorAlertSchema = new mongoose.Schema(
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
    exam: {
      type: String,
    },
    alertType: {
      type: String,
      enum: ['behavioral_anomaly', 'paste_detected', 'device_change'],
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
    //   device_change:      { from: {userAgent, screenWidth, screenHeight}, to: {...} }
    topDeviatingFeatures: {
      type: mongoose.Schema.Types.Mixed,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: ''
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed,
    }
  },
  { timestamps: true }
);

behaviorAlertSchema.index({ student: 1, exam: 1, createdAt: -1 });
behaviorAlertSchema.index({ alertType: 1, reviewed: 1 }); // for dashboard filtering

module.exports = mongoose.model('BehaviorAlert', behaviorAlertSchema);
