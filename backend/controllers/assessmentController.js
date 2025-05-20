const Assessment = require('../models/Assessment');
const User = require('../models/User');

// @desc    Create a new assessment
// @route   POST /api/assessments
// @access  Private
exports.createAssessment = async (req, res) => {
  try {
    const { title, type, answers, results, skillLevels, recommendations, userProfile } = req.body;
    
    // Validate required fields
    if (!title || !type || !answers || !results || !recommendations || !userProfile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Create the assessment
    const assessment = await Assessment.create({
      userId: req.user.id,
      title,
      type,
      answers,
      results,
      skillLevels: skillLevels || {},
      recommendations,
      userProfile
    });
    
    // Update user's skills if provided
    if (skillLevels && Object.keys(skillLevels).length > 0) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.skills = { ...user.skills, ...skillLevels };
        await user.save();
      }
    }
    
    res.status(201).json({
      success: true,
      data: assessment,
      message: 'Assessment created successfully'
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all assessments for a user
// @route   GET /api/assessments
// @access  Private
exports.getAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user.id })
      .sort({ completedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: assessments.length,
      data: assessments
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get assessment by ID
// @route   GET /api/assessments/:id
// @access  Private
exports.getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    
    // Check if assessment exists
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    // Check if user owns the assessment
    if (assessment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this assessment'
      });
    }
    
    res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete assessment
// @route   DELETE /api/assessments/:id
// @access  Private
exports.deleteAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    
    // Check if assessment exists
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    // Check if user owns the assessment
    if (assessment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this assessment'
      });
    }
    
    await Assessment.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Assessment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get assessment statistics
// @route   GET /api/assessments/stats
// @access  Private
exports.getAssessmentStats = async (req, res) => {
  try {
    // Get total count of assessments
    const totalCount = await Assessment.countDocuments({ userId: req.user.id });
    
    // Get count by type
    const typeStats = await Assessment.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    // Get most recent assessment
    const recentAssessment = await Assessment.findOne({ userId: req.user.id })
      .sort({ completedAt: -1 })
      .limit(1);
    
    // Format type stats
    const typeCount = {};
    typeStats.forEach(stat => {
      typeCount[stat._id] = stat.count;
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalCount,
        typeCount,
        recentAssessment: recentAssessment || null
      }
    });
  } catch (error) {
    console.error('Error fetching assessment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
