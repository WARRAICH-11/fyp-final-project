const express = require('express');
const router = express.Router();
const { signup, login, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);

module.exports = router;
