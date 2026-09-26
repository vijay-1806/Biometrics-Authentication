const express = require('express');
const { 
  postWindow, 
  scoreWindow, 
  listAlerts, 
  updateAlert,
  enrollPassage,
  getBiometricStatus,
  getPassage,
  retrainUser,
  getSessionReport,
  getTeacherAnalytics
} = require('../controllers/behaviorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const TrainingRequest = require('../models/TrainingRequest');
const Notification = require('../models/Notification');

const router = express.Router();

router.post('/window', protect, postWindow);
router.post('/score', protect, scoreWindow);

// Candidate Report & Teacher Analytics Routes
router.get('/report/:assessmentSessionId', protect, getSessionReport);
router.get('/analytics/:assessmentSessionId', protect, authorize('teacher', 'admin'), getTeacherAnalytics);

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

// ─── Training Request Routes ─────────────────────────────────────────────────

// GET /api/behavior/training-requests — students see their own requests; admins see all pending
router.get('/training-requests', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      const requests = await TrainingRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
      return res.json(requests);
    }
    // Student sees their own requests
    const requests = await TrainingRequest.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/behavior/training-requests — student submits a request
router.post('/training-requests', protect, async (req, res) => {
  try {
    const { reason, amount } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required.' });

    // Prevent duplicate pending requests
    const existing = await TrainingRequest.findOne({ student: req.user._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending request. Wait for admin to review it.' });
    }

    const request = await TrainingRequest.create({
      student: req.user._id,
      studentName: req.user.name,
      reason,
      amount: Math.min(20, Math.max(1, Number(amount) || 5)),
    });

    // Notify admins (create a notification for the admin)
    await Notification.create({
      title: 'Training Data Request',
      message: `${req.user.name} is requesting ${request.amount} additional ML training entries. Reason: ${reason}`,
      type: 'info',
      from: req.user._id,
      fromName: req.user.name,
      audience: 'admins',
    });

    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/behavior/training-requests/:id — admin approves or rejects a request
router.patch('/training-requests/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const request = await TrainingRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNote: adminNote || '',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Notify the student
    const verb = status === 'approved' ? 'approved' : 'rejected';
    const notifType = status === 'approved' ? 'success' : 'warning';
    await Notification.create({
      title: `Training Request ${status === 'approved' ? 'Approved ✓' : 'Rejected'}`,
      message: status === 'approved'
        ? `Your request for ${request.amount} additional training entries has been approved! You can now collect ${request.amount} more entries.`
        : `Your request for additional training entries was rejected. ${adminNote ? `Admin note: ${adminNote}` : ''}`,
      type: notifType,
      from: req.user._id,
      fromName: 'Admin',
      audience: 'students',
      recipient: request.student,
    });

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

