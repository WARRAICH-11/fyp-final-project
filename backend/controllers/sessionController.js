const Session = require('../models/Session');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// @desc    Book a new session with a mentor
// @route   POST /api/sessions
// @access  Private
exports.bookSession = async (req, res) => {
  try {
    const { mentorId, date, time, duration, topic, description } = req.body;
    
    // Validate required fields
    if (!mentorId || !date || !time || !topic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }
    
    // Check if mentor exists and is actually a mentor
    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mentor not found' 
      });
    }
    
    if (mentor.role !== 'mentor') {
      return res.status(400).json({ 
        success: false, 
        message: 'Selected user is not a mentor' 
      });
    }

    // Get user information
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Create new session
    const session = await Session.create({
      userId: req.user.id,
      mentorId,
      date,
      time,
      duration: duration || 60,
      topic,
      description,
      status: 'pending'
    });

    // Create notification for the mentor
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    await Notification.create({
      title: 'New Session Request',
      message: `${user.fullName} has requested a counseling session on ${formattedDate} at ${time} about "${topic}".`,
      type: 'info',
      sender: req.user.id,
      recipients: [{ user: mentorId, read: false }],
      targetRole: 'selected',
      createdAt: Date.now(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
    });
    
    res.status(201).json({
      success: true,
      data: session,
      message: 'Session booked successfully'
    });
  } catch (error) {
    console.error('Error booking session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all sessions for the current user (either as user or mentor)
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    // Check if user exists in the request
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated properly'
      });
    }

    const { role, status } = req.query;
    
    let query = {};
    
    // If role is specified, filter by role
    if (role === 'user') {
      query.userId = req.user.id;
    } else if (role === 'mentor') {
      query.mentorId = req.user.id;
    } else {
      // If no role specified, get all sessions where user is either the user or mentor
      query = {
        $or: [
          { userId: req.user.id },
          { mentorId: req.user.id }
        ]
      };
    }
    
    // If status is specified, filter by status
    if (status && ['pending', 'accepted', 'rejected', 'completed', 'canceled'].includes(status)) {
      query.status = status;
    }
    
    // Log the query for debugging
    console.log('Session query:', query);
    
    // Ensure the IDs are valid ObjectIds
    if (query.userId && !mongoose.Types.ObjectId.isValid(query.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    if (query.mentorId && !mongoose.Types.ObjectId.isValid(query.mentorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mentor ID format'
      });
    }
    
    // Find sessions with the query
    const sessions = await Session.find(query)
      .populate('userId', 'fullName email profileImage')
      .populate('mentorId', 'fullName email profileImage')
      .sort({ date: 1, time: 1 });
    
    // Log the number of sessions found
    console.log(`Found ${sessions.length} sessions for user ${req.user.id}`);
    
    if (!sessions || sessions.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Ensure proper default values for profileImage
    const processedSessions = sessions.map(session => {
      const sessionObj = session.toObject();
      
      // Set default profile image if not present
      if (sessionObj.userId && !sessionObj.userId.profileImage) {
        sessionObj.userId.profileImage = '/uploads/default-profile.png';
      }
      
      if (sessionObj.mentorId && !sessionObj.mentorId.profileImage) {
        sessionObj.mentorId.profileImage = '/uploads/default-profile.png';
      }
      
      return sessionObj;
    });
    
    // Log the response for debugging
    console.log('Sending sessions response:', {
      success: true,
      count: processedSessions.length
    });
    
    res.status(200).json({
      success: true,
      count: processedSessions.length,
      data: processedSessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sessions',
      error: error.message
    });
  }
};

// @desc    Get a single session by ID
// @route   GET /api/sessions/:id
// @access  Private
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('userId', 'fullName email profileImage')
      .populate('mentorId', 'fullName email profileImage');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check if the current user is either the user or mentor of this session
    if (session.userId._id.toString() !== req.user.id && 
        session.mentorId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this session'
      });
    }
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update session status (accept/reject)
// @route   PUT /api/sessions/:id/status
// @access  Private/Mentor
exports.updateSessionStatus = async (req, res) => {
  try {
    const { status, meetingLink, notes } = req.body;
    
    // Validate status
    if (!status || !['accepted', 'rejected', 'completed', 'canceled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }
    
    const session = await Session.findById(req.params.id)
      .populate('userId', 'fullName email profileImage')
      .populate('mentorId', 'fullName email profileImage');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Only mentor can accept/reject, only user can cancel
    if ((status === 'accepted' || status === 'rejected' || status === 'completed') && 
        session.mentorId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the mentor can accept, reject, or complete sessions'
      });
    }
    
    if (status === 'canceled' && session.userId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the user can cancel sessions'
      });
    }
    
    // Update session
    const updateData = { status };
    if (meetingLink) updateData.meetingLink = meetingLink;
    if (notes) updateData.notes = notes;
    
    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('userId', 'fullName email profileImage')
     .populate('mentorId', 'fullName email profileImage');

    // Create notification for the user about session status update
    if (status === 'accepted' || status === 'rejected') {
      const formattedDate = new Date(session.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const notificationType = status === 'accepted' ? 'success' : 'info';
      const notificationTitle = status === 'accepted' ? 'Session Accepted' : 'Session Declined';
      const notificationMessage = status === 'accepted' 
        ? `Your session request for ${formattedDate} at ${session.time} has been accepted by ${session.mentorId.fullName}.` 
        : `Your session request for ${formattedDate} at ${session.time} has been declined by ${session.mentorId.fullName}.`;

      await Notification.create({
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        sender: req.user.id,
        recipients: [{ user: session.userId._id, read: false }],
        targetRole: 'selected',
        createdAt: Date.now(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
      });
    }
    
    res.status(200).json({
      success: true,
      data: updatedSession,
      message: `Session ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update session feedback
// @route   PUT /api/sessions/:id/feedback
// @access  Private/Mentor
exports.updateSessionFeedback = async (req, res) => {
  try {
    const { feedback } = req.body;
    
    if (!feedback) {
      return res.status(400).json({
        success: false,
        message: 'Please provide feedback content'
      });
    }
    
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Only mentor can add feedback
    if (session.mentorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the mentor can add feedback to this session'
      });
    }
    
    // Session must be completed to add feedback
    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be added to completed sessions'
      });
    }
    
    // Update session with feedback
    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      { $set: { feedback } },
      { new: true, runValidators: true }
    ).populate('userId', 'fullName email profileImage')
     .populate('mentorId', 'fullName email profileImage');
    
    res.status(200).json({
      success: true,
      data: updatedSession,
      message: 'Session feedback added successfully'
    });
  } catch (error) {
    console.error('Error updating session feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get available mentors
// @route   GET /api/sessions/mentors
// @access  Private
exports.getAvailableMentors = async (req, res) => {
  try {
    // Check if user exists in the request
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated properly'
      });
    }

    console.log(`Fetching mentors for user: ${req.user.id}`);

    // Find all users with role 'mentor'
    const mentors = await User.find({ role: 'mentor' })
      .select('_id fullName email profileImage bio skills specialty mentorExperience')
      .sort({ fullName: 1 });
    
    console.log(`Found ${mentors.length} mentors in database`);
    
    if (!mentors || mentors.length === 0) {
      console.log('No mentors found in database');
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Ensure proper default values for profileImage
    const processedMentors = mentors.map(mentor => {
      const mentorObj = mentor.toObject();
      
      // Set default profile image if not present
      if (!mentorObj.profileImage) {
        mentorObj.profileImage = '/uploads/default-profile.png';
      }
      
      // Ensure skills is an array
      if (!mentorObj.skills) {
        mentorObj.skills = [];
      }
      
      // Add placeholder for specialty if not present
      if (!mentorObj.specialty) {
        mentorObj.specialty = 'General Career Counseling';
      }
      
      // Add placeholder for experience if not present
      if (!mentorObj.mentorExperience) {
        mentorObj.experience = '1+ years';
      }
      
      return mentorObj;
    });
    
    // Log the response for debugging
    console.log('Sending mentors response:', {
      success: true,
      count: processedMentors.length
    });
    
    res.status(200).json({
      success: true,
      count: processedMentors.length,
      data: processedMentors
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching mentors',
      error: error.message
    });
  }
};
