const express = require('express');
const router = express.Router();
const { 
  createNotification,
  getSentNotifications,
  getUserNotifications,
  markAsRead,
  deleteNotification,
  updateNotification
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Routes for notifications
router.post('/', protect, authorize('admin', 'mentor'), createNotification);
router.get('/sent', protect, authorize('admin', 'mentor'), getSentNotifications);
router.get('/', protect, getUserNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/:id', protect, authorize('admin', 'mentor'), updateNotification);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
