const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/notifications — fetch notifications for the logged-in user
// Students see notifications where audience='students'
// Teachers see notifications where audience='teachers'
// Also includes any notification targeted directly to this user (recipient = userId)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    // Determine audience filter based on role
    const audienceFilter = role === 'teacher' ? 'teachers' : role === 'admin' ? 'admins' : 'students';

    const notifications = await Notification.find({
      $or: [
        { audience: audienceFilter },
        { recipient: userId },
      ]
    })
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
    const { title, message, type, audience, recipient } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    // Admins can target teachers; teachers can only target students
    let resolvedAudience = audience || 'students';
    if (req.user.role === 'teacher') {
      resolvedAudience = 'students'; // Teachers can only notify students
    }

    const notif = await Notification.create({
      title,
      message,
      type: type || 'info',
      from: req.user._id,
      fromName: req.user.name,
      audience: resolvedAudience,
      recipient: recipient || null,
      readBy: [],
    });

    res.status(201).json(notif);
  } catch (err) {
    console.error('Notification create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/read-all — mark all relevant notifications as read for the current user
router.patch('/read-all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const audienceFilter = role === 'teacher' ? 'teachers' : role === 'admin' ? 'admins' : 'students';

    await Notification.updateMany(
      {
        $or: [
          { audience: audienceFilter },
          { recipient: userId },
        ],
        readBy: { $ne: userId }
      },
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
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: userId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
