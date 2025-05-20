const express = require('express');
const router = express.Router();
const { 
  createAssessment,
  getAssessments,
  getAssessmentById,
  deleteAssessment,
  getAssessmentStats
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/authMiddleware');

// Routes for assessments
router.post('/', protect, createAssessment);
router.get('/', protect, getAssessments);
router.get('/stats', protect, getAssessmentStats);
router.get('/:id', protect, getAssessmentById);
router.delete('/:id', protect, deleteAssessment);

module.exports = router;
