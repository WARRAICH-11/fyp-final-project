const express = require('express');
const router = express.Router();
const { 
  getAllUsers,
  getUsersByRole,
  createMentor,
  updateMentor,
  deleteMentor,
  getMentees,
  sendFeedback,
  updateMenteeProgress
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Routes for users
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/role/:role', protect, authorize('admin', 'mentor'), getUsersByRole);
router.get('/mentees', protect, authorize('admin', 'mentor'), getMentees);

// Mentee management routes
router.post('/mentees/:id/feedback', protect, authorize('admin', 'mentor'), sendFeedback);
router.put('/mentees/:id/progress', protect, authorize('admin', 'mentor'), updateMenteeProgress);

// Mentor management routes
router.post('/mentors', protect, authorize('admin'), createMentor);
router.put('/mentors/:id', protect, authorize('admin'), updateMentor);
router.delete('/mentors/:id', protect, authorize('admin'), deleteMentor);

module.exports = router;
