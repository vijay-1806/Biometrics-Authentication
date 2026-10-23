const mongoose = require('mongoose');

const trainingRequestSchema = new mongoose.Schema(
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
    studentName: { type: String },
    reason: { type: String, required: true },
    amount: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrainingRequest', trainingRequestSchema);
