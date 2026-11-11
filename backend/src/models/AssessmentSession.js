const mongoose = require('mongoose');

const assessmentSessionSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  course: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  teacher: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  pin: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting', index: true },
  endReason: { type: String, enum: ['teacher_ended', 'time_limit', null], default: null },
  startedAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  participants: [{
    student: { type: mongoose.Schema.Types.Mixed, required: true },
    joinedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('AssessmentSession', assessmentSessionSchema);
