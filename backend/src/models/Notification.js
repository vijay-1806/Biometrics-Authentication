const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'success'], default: 'info' },
    from: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
    fromName: { type: String },
    // audience: 'students' | 'teachers' | specific userId
    audience: { type: String, default: 'students' },
    // For targeted notifications to a specific user
    recipient: { type: mongoose.Schema.Types.Mixed, ref: 'User', default: null },
    read: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.Mixed, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
