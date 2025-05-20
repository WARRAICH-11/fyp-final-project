const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  bookSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  updateSessionFeedback,
  getAvailableMentors
} = require('../controllers/sessionController');

// Get available mentors
router.get('/mentors', protect, getAvailableMentors);

// Book a session
router.post('/', protect, bookSession);

// Get all sessions for current user
router.get('/', protect, getSessions);

// Get single session
router.get('/:id', protect, getSessionById);

// Update session status
router.put('/:id/status', protect, updateSessionStatus);

// Update session feedback
router.put('/:id/feedback', protect, updateSessionFeedback);

module.exports = router;
