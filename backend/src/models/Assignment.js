const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
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
      required: [true, 'Please add an assignment title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add instructions / description'],
    },
    starterCode: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      enum: ['javascript', 'python'],
      default: 'javascript',
    },
    testCases: [
      {
        input: {
          type: String,
          default: '',
        },
        expectedOutput: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
