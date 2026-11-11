const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    course: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a quiz title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add quiz instructions'],
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    isExam: {
      type: Boolean,
      default: false,
    },
    questions: [
      {
        questionText: {
          type: String,
          required: true,
        },
        options: [
          {
            type: String,
            required: true,
          },
        ],
        correctAnswerIndex: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Quiz', quizSchema);
