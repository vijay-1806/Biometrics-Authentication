const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    title: {
      type: String,
      required: [true, 'Please add a course title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    teacher: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: true,
    },
    studentsEnrolled: [
      {
        type: mongoose.Schema.Types.Mixed,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);
