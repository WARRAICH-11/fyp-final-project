const express = require('express');
const router = express.Router();
const { 
  uploadFile, 
  getFiles, 
  getFile, 
  updateFile, 
  deleteFile, 
  shareFile, 
  removeShare 
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create files directory if it doesn't exist
const filesDir = path.join(__dirname, '../files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
  console.log('Created files directory at:', filesDir);
}

// Set up multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, filesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

// Initialize upload middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// File routes
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/', protect, getFiles);
router.get('/:id', protect, getFile);
router.put('/:id', protect, updateFile);
router.delete('/:id', protect, deleteFile);
router.post('/:id/share', protect, shareFile);
router.delete('/:id/share/:userId', protect, removeShare);

module.exports = router;
