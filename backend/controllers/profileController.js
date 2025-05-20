const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    // Fields to update
    const {
      fullName,
      phone,
      location,
      bio,
      education,
      experience,
      skills,
      interests,
      languages,
      socialLinks,
      careerGoals,
      profileImage,
      projects,
      certifications,
      achievements
    } = req.body;

    // Build profile object
    const profileFields = {};
    
    if (fullName) profileFields.fullName = fullName;
    if (phone) profileFields.phone = phone;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (education) profileFields.education = education;
    if (experience) profileFields.experience = experience;
    if (skills) profileFields.skills = skills;
    if (interests) profileFields.interests = interests;
    if (languages) profileFields.languages = languages;
    if (socialLinks) profileFields.socialLinks = socialLinks;
    if (careerGoals) profileFields.careerGoals = careerGoals;
    if (profileImage) profileFields.profileImage = profileImage;
    if (projects) profileFields.projects = projects;
    if (certifications) profileFields.certifications = certifications;
    if (achievements) profileFields.achievements = achievements;

    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Upload profile image
// @route   POST /api/profile/upload-image
// @access  Private
exports.uploadProfileImage = async (req, res) => {
  try {
    // In a real implementation, you would handle file upload to a cloud storage service
    // For now, we'll just update the profile image URL
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    // Update user profile with new image URL
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profileImage: req.file.path } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: { imageUrl: req.file.path },
      message: 'Profile image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
