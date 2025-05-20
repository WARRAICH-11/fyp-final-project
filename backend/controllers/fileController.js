const File = require('../models/File');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Upload a file
// @route   POST /api/files/upload
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    console.log('Upload request received');
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname);

    // Create file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/files/${req.file.filename}`;

    // Create new file record
    const file = await File.create({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: fileUrl,
      owner: req.user.id,
      category: req.body.category || 'other',
      description: req.body.description || '',
      isPublic: req.body.isPublic === 'true'
    });

    console.log('File saved successfully with ID:', file._id);

    res.status(201).json({
      success: true,
      data: file,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
      error: error.message
    });
  }
};

// @desc    Get all files for current user
// @route   GET /api/files
// @access  Private
exports.getFiles = async (req, res) => {
  try {
    // Get user's own files
    const ownFiles = await File.find({ owner: req.user.id });
    
    // Get files shared with user
    const sharedFiles = await File.find({
      'sharedWith.user': req.user.id
    }).populate('owner', 'fullName email');

    res.status(200).json({
      success: true,
      data: {
        ownFiles,
        sharedFiles
      }
    });
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get a single file
// @route   GET /api/files/:id
// @access  Private
exports.getFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate('owner', 'fullName email');

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check if user has access to the file
    const isOwner = file.owner._id.toString() === req.user.id;
    const isSharedWithUser = file.sharedWith.some(share => share.user.toString() === req.user.id);
    const isPublic = file.isPublic;

    if (!isOwner && !isSharedWithUser && !isPublic) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this file' });
    }

    res.status(200).json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update file details
// @route   PUT /api/files/:id
// @access  Private
exports.updateFile = async (req, res) => {
  try {
    let file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check if user is the owner
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this file' });
    }

    // Update fields
    const { category, description, isPublic } = req.body;
    
    if (category) file.category = category;
    if (description !== undefined) file.description = description;
    if (isPublic !== undefined) file.isPublic = isPublic;
    
    file.updatedAt = Date.now();

    await file.save();

    res.status(200).json({
      success: true,
      data: file,
      message: 'File updated successfully'
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete a file
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check if user is the owner
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this file' });
    }

    // Delete file from filesystem
    fs.unlink(file.path, async (err) => {
      if (err) {
        console.error('Error deleting file from filesystem:', err);
        // Continue with deletion from database even if file doesn't exist on filesystem
      }

      // Delete file from database
      await File.findByIdAndDelete(file._id);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Share a file with another user
// @route   POST /api/files/:id/share
// @access  Private
exports.shareFile = async (req, res) => {
  try {
    const { email, permission } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Find the user to share with
    const userToShareWith = await User.findOne({ email });

    if (!userToShareWith) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the file
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check if user is the owner
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to share this file' });
    }

    // Check if already shared with this user
    const alreadyShared = file.sharedWith.find(
      share => share.user.toString() === userToShareWith._id.toString()
    );

    if (alreadyShared) {
      // Update permission if already shared
      alreadyShared.permission = permission || 'view';
    } else {
      // Add new share
      file.sharedWith.push({
        user: userToShareWith._id,
        permission: permission || 'view'
      });
    }

    await file.save();

    res.status(200).json({
      success: true,
      data: file,
      message: `File shared with ${userToShareWith.fullName} successfully`
    });
  } catch (error) {
    console.error('Error sharing file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove share access for a user
// @route   DELETE /api/files/:id/share/:userId
// @access  Private
exports.removeShare = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check if user is the owner
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to modify sharing for this file' });
    }

    // Remove user from sharedWith array
    file.sharedWith = file.sharedWith.filter(
      share => share.user.toString() !== req.params.userId
    );

    await file.save();

    res.status(200).json({
      success: true,
      data: file,
      message: 'Share access removed successfully'
    });
  } catch (error) {
    console.error('Error removing share access:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
