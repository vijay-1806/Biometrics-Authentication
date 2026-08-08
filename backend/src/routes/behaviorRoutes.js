const express = require('express');
const { 
  postWindow, 
  scoreWindow, 
  listAlerts, 
  updateAlert,
  enrollPassage,
  getBiometricStatus,
  getPassage,
  retrainUser
} = require('../controllers/behaviorController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/window', protect, postWindow);
router.post('/score', protect, scoreWindow);

// Enrollment, Status & Retraining Routes
router.post('/enroll', protect, enrollPassage);
router.get('/status', protect, getBiometricStatus);
router.get('/status/:studentId', protect, getBiometricStatus);
router.get('/passage/:kind', protect, getPassage);
router.post('/retrain', protect, retrainUser);
router.post('/retrain/:studentId', protect, retrainUser);

// Teacher/Admin dashboard routes
router.get('/alerts', protect, authorize('teacher', 'admin'), listAlerts);
router.patch('/alerts/:id', protect, authorize('teacher', 'admin'), updateAlert);

module.exports = router;
