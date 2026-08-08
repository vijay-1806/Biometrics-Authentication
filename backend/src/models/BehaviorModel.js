const mongoose = require('mongoose');

const behaviorModelSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    modelData: {
      // Could be a path to a file or the binary/blob data of the trained model
      type: mongoose.Schema.Types.Buffer,
    },
    scalerData: {
      type: mongoose.Schema.Types.Buffer,
    },
    status: {
      type: String,
      enum: ['training', 'ready', 'not_ready', 'failed'],
      default: 'training',
    },
    reason: {
      type: String,
    },
    modelPath: {
      type: String,
    },
    trainedAt: {
      type: Date,
    },
    trainingWindowCount: {
      type: Number,
    },
    baselineNormalRate: {
      type: Number,
    },
    personalThreshold: {
      type: Number,
    },
    scalerParams: {
      type: mongoose.Schema.Types.Mixed,
    },
    featuresCount: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BehaviorModel', behaviorModelSchema);
