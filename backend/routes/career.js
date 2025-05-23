const express = require('express');
const router = express.Router();
const { predictCareer } = require('../controllers/careerController');

// POST /api/career/predict - Predict career path based on user data
router.post('/predict', predictCareer);

module.exports = router;
