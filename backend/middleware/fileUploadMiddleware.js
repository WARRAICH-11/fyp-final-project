const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create files directory if it doesn't exist
const filesDir = path.join(__dirname, '../files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
  console.log('Created files directory at:', filesDir);
}

// Set storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Make sure the directory exists
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
      console.log('Created files directory at:', filesDir);
    }
    console.log('Saving file to:', filesDir);
    cb(null, filesDir);
  },
  filename: function(req, file, cb) {
    // Generate a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// Check file type
const fileFilter = (req, file, cb) => {
  console.log('Received file:', file.originalname, 'Mimetype:', file.mimetype);
  
  // Accept all file types for now to debug
  return cb(null, true);
  
  /* Uncomment this for production
  // Allowed file types
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z/;
  
  // Check extension
  const extension = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mime type
  const mimeType = file.mimetype.startsWith('image/') || 
                  file.mimetype.startsWith('application/') || 
                  file.mimetype === 'text/plain';

  if (extension && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('File type not supported. Allowed types: images, documents, spreadsheets, presentations, text files, and archives.'));
  }
  */
};

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

module.exports = { upload, handleMulterError };
