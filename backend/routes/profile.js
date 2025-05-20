const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, uploadProfileImage } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Profile routes
router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
router.post('/upload-image', protect, upload.single('image'), uploadProfileImage);

module.exports = router;
