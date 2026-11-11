const express = require('express');
const router = express.Router();
const {
  getCourses,
  getStudentLiveAssessments,
  resolveStudentSession,
  getCourseById,
  createCourse,
  enrollInCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getCourses)
  .post(protect, authorize('teacher', 'admin'), createCourse);

router.post('/live-assessments/join', protect, authorize('student'), resolveStudentSession);

router.get('/live-assessments', protect, authorize('student'), getStudentLiveAssessments);

router.route('/:id')
  .get(protect, getCourseById)
  .delete(protect, authorize('teacher', 'admin'), deleteCourse);
router.route('/:id/enroll').post(protect, authorize('student'), enrollInCourse);

module.exports = router;
