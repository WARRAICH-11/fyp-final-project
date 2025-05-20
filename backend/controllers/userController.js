const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('_id fullName email role profileImage')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private/Admin
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    // Validate role
    if (!['user', 'mentor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    const users = await User.find({ role })
      .select('_id fullName email role profileImage')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.role}s:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create a new mentor
// @route   POST /api/users/mentors
// @access  Private/Admin
exports.createMentor = async (req, res) => {
  try {
    const { fullName, email, password, specialty, experience, bio } = req.body;
    
    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create mentor
    const mentor = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: 'mentor',
      specialty,
      experience,
      bio,
      profileImage: '/uploads/default-profile.png'
    });
    
    res.status(201).json({
      success: true,
      data: {
        _id: mentor._id,
        fullName: mentor.fullName,
        email: mentor.email,
        role: mentor.role,
        specialty: mentor.specialty,
        experience: mentor.experience,
        bio: mentor.bio,
        profileImage: mentor.profileImage
      },
      message: 'Mentor created successfully'
    });
  } catch (error) {
    console.error('Error creating mentor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update a mentor
// @route   PUT /api/users/mentors/:id
// @access  Private/Admin
exports.updateMentor = async (req, res) => {
  try {
    const { fullName, email, specialty, experience, bio, status } = req.body;
    
    // Find mentor by ID
    const mentor = await User.findById(req.params.id);
    
    // Check if mentor exists
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    // Check if mentor is actually a mentor
    if (mentor.role !== 'mentor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a mentor'
      });
    }
    
    // Update fields
    if (fullName) mentor.fullName = fullName;
    if (email) mentor.email = email;
    if (specialty) mentor.specialty = specialty;
    if (experience) mentor.experience = experience;
    if (bio) mentor.bio = bio;
    if (status) mentor.status = status;
    
    // Save updated mentor
    await mentor.save();
    
    res.status(200).json({
      success: true,
      data: {
        _id: mentor._id,
        fullName: mentor.fullName,
        email: mentor.email,
        role: mentor.role,
        specialty: mentor.specialty,
        experience: mentor.experience,
        bio: mentor.bio,
        status: mentor.status,
        profileImage: mentor.profileImage
      },
      message: 'Mentor updated successfully'
    });
  } catch (error) {
    console.error('Error updating mentor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete a mentor
// @route   DELETE /api/users/mentors/:id
// @access  Private/Admin
exports.deleteMentor = async (req, res) => {
  try {
    // Find mentor by ID
    const mentor = await User.findById(req.params.id);
    
    // Check if mentor exists
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    // Check if mentor is actually a mentor
    if (mentor.role !== 'mentor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a mentor'
      });
    }
    
    // Delete mentor
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Mentor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting mentor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get mentees for a mentor
// @route   GET /api/users/mentees
// @access  Private/Mentor
exports.getMentees = async (req, res) => {
  try {
    // Check if the current user is a mentor
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    let mentees = [];
    
    if (currentUser.role === 'mentor') {
      // If user is a mentor, find all users assigned to this mentor
      mentees = await User.find({ 
        mentor: currentUser._id,
        role: 'user'
      })
      .select('_id fullName email profileImage specialty progress createdAt')
      .sort({ fullName: 1 });
    } else if (currentUser.role === 'admin') {
      // If user is an admin, find all users with role 'user'
      mentees = await User.find({ role: 'user' })
        .select('_id fullName email profileImage specialty progress createdAt mentor')
        .sort({ fullName: 1 });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access mentee data'
      });
    }
    
    res.status(200).json({
      success: true,
      count: mentees.length,
      data: mentees
    });
  } catch (error) {
    console.error('Error fetching mentees:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Send feedback to a mentee
// @route   POST /api/users/mentees/:id/feedback
// @access  Private/Mentor
exports.sendFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    // Validate input
    if (!feedback || !feedback.text) {
      return res.status(400).json({
        success: false,
        message: 'Feedback text is required'
      });
    }
    
    // Find mentee by ID
    const mentee = await User.findById(id);
    
    // Check if mentee exists
    if (!mentee) {
      return res.status(404).json({
        success: false,
        message: 'Mentee not found'
      });
    }
    
    // Check if mentee is actually a user
    if (mentee.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Target is not a mentee'
      });
    }
    
    // Add feedback to mentee's feedback array
    const newFeedback = {
      mentorId: req.user.id,
      text: feedback.text,
      date: feedback.date || new Date()
    };
    
    // If mentee doesn't have a feedback array, create one
    if (!mentee.feedback) {
      mentee.feedback = [];
    }
    
    mentee.feedback.push(newFeedback);
    await mentee.save();
    
    res.status(200).json({
      success: true,
      message: 'Feedback sent successfully',
      data: newFeedback
    });
  } catch (error) {
    console.error('Error sending feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update mentee progress
// @route   PUT /api/users/mentees/:id/progress
// @access  Private/Mentor
exports.updateMenteeProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    
    // Validate input
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be a number between 0 and 100'
      });
    }
    
    // Find mentee by ID
    const mentee = await User.findById(id);
    
    // Check if mentee exists
    if (!mentee) {
      return res.status(404).json({
        success: false,
        message: 'Mentee not found'
      });
    }
    
    // Check if mentee is actually a user
    if (mentee.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Target is not a mentee'
      });
    }
    
    // Update progress
    mentee.progress = progress;
    await mentee.save();
    
    res.status(200).json({
      success: true,
      message: 'Mentee progress updated successfully',
      data: {
        id: mentee._id,
        progress: mentee.progress
      }
    });
  } catch (error) {
    console.error('Error updating mentee progress:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
