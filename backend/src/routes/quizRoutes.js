const express = require('express');
const router = express.Router();
const {
  configureLiveAssessment,
  deleteQuiz,
  getQuizById,
  submitQuiz,
  getQuizResults,
} = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.patch('/:id/live', protect, authorize('teacher', 'admin'), configureLiveAssessment);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteQuiz);

router.route('/:id')
  .get(protect, getQuizById);

router.route('/:id/submit')
  .post(protect, authorize('student'), submitQuiz);

router.route('/:id/results')
  .get(protect, getQuizResults);

module.exports = router;
