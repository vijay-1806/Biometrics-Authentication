const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Course = require('../models/Course');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

async function visibleNotifications(user) {
  const userId = user._id;
  const role = user.role;
  // Determine audience filter based on role
  const audienceFilter = role === 'teacher' ? 'teachers' : role === 'admin' ? 'admins' : 'students';

  const courses = role === 'teacher'
    ? await Course.find({ teacher: userId }).distinct('_id')
    : role === 'student' ? await Course.find({ studentsEnrolled: userId }).distinct('_id')
    : role === 'admin' ? await Course.find().distinct('_id') : [];
  const adminIds = role === 'student' ? await User.find({ role: 'admin' }).distinct('_id') : [];
  return role === 'student'
    ? { $or: [{ audience: 'students', course: null, $or: [{ from: { $in: adminIds } }, { from: null }] }, { audience: 'students', course: { $in: courses } }, { recipient: userId }] }
    : { $or: [{ audience: audienceFilter, course: null }, { course: { $in: courses } }, { recipient: userId }] };
}

// GET /api/notifications — fetch notifications for the logged-in user
// Students see notifications where audience='students'
// Teachers see notifications where audience='teachers'
// Also includes any notification targeted directly to this user (recipient = userId)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    const notificationFilter = await visibleNotifications(req.user);
    const notifications = await Notification.find({ ...notificationFilter, dismissedBy: { $ne: userId } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Mark read status per-user (check readBy array)
    const result = notifications.map(n => ({
      ...n,
      read: n.readBy?.some(id => String(id) === String(userId)) || false,
    }));

    res.json(result);
  } catch (err) {
    console.error('Notification fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications — teacher or admin sends a notification
// Teachers can send to students; admins can send to teachers or students
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { title, message, type, audience, recipient, course: courseId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    // Admins can target teachers; teachers can only target students
    let resolvedAudience = audience || 'students';
    if (req.user.role === 'admin' && !['students', 'teachers', 'both'].includes(resolvedAudience)) return res.status(400).json({ message: 'Choose students, teachers, or both.' });
    if (req.user.role === 'teacher') {
      if (!courseId) return res.status(400).json({ message: 'Choose a course for this announcement.' });
      const course = await Course.findByRecordId(courseId).select('teacher');
      if (!course || String(course.teacher) !== String(req.user._id)) return res.status(403).json({ message: 'You can only announce to your own courses.' });
      resolvedAudience = 'students'; // Teachers can only notify students
    }

    const audiences = req.user.role === 'admin' && resolvedAudience === 'both' ? ['students', 'teachers'] : [resolvedAudience];
    const notifications = await Notification.create(audiences.map((target) => ({
      title,
      message,
      type: type || 'info',
      from: req.user._id,
      fromName: req.user.name,
      audience: target,
      course: req.user.role === 'teacher' ? courseId : null,
      recipient: recipient || null,
      readBy: [],
    })));

    res.status(201).json(notifications);
  } catch (err) {
    console.error('Notification create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/read-all — mark all relevant notifications as read for the current user
router.patch('/read-all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const readFilter = await visibleNotifications(req.user);

    await Notification.updateMany(
      { ...readFilter, readBy: { $ne: userId }, dismissedBy: { $ne: userId } },
      {
        $addToSet: { readBy: userId }
      }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read — mark a single notification as read for the current user
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const notification = await Notification.findOneAndUpdate({
      $and: [await visibleNotifications(req.user), Notification.findByRecordId(req.params.id).getFilter()],
      dismissedBy: { $ne: userId },
    }, { $addToSet: { readBy: userId } });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Removing a shared announcement affects only the current user's inbox.
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const notification = await Notification.findOne({
      $and: [await visibleNotifications(req.user), Notification.findByRecordId(req.params.id).getFilter()],
      dismissedBy: { $ne: userId },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (!notification.readBy.some(id => String(id) === String(userId))) {
      return res.status(409).json({ message: 'Read the notification before deleting it.' });
    }
    await Notification.updateOne({ _id: notification._id }, { $addToSet: { dismissedBy: userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Notification delete error:', err);
    res.status(500).json({ message: 'Could not delete notification' });
  }
});

module.exports = router;
