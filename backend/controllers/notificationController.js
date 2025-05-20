const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private/Admin/Mentor
exports.createNotification = async (req, res) => {
  try {
    console.log('Create notification request received:', req.body);
    console.log('User making request:', req.user ? req.user.id : 'No user ID');
    
    const { title, message, type, targetRole, expiresAt, selectedUsers } = req.body;
    
    // Validate required fields
    if (!title || !message) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide title and message for the notification' 
      });
    }
    
    // Check if user is mentor and restrict target role if needed
    if (req.user.role === 'mentor') {
      // Mentors can only send notifications to specific users or all users, not to admins or other mentors
      if (targetRole === 'admin' || targetRole === 'mentor') {
        return res.status(403).json({
          success: false,
          message: 'Mentors can only send notifications to users'
        });
      }
    }

    // Find recipients based on selection method
    let recipients = [];
    
    // If specific users are selected
    if (selectedUsers && selectedUsers.length > 0) {
      console.log('Sending notification to selected users:', selectedUsers);
      recipients = selectedUsers.map(userId => ({ user: userId }));
    }
    // Otherwise, use role-based targeting
    else if (targetRole === 'all') {
      console.log('Sending notification to all users');
      const users = await User.find({}, '_id');
      recipients = users.map(user => ({ user: user._id }));
      console.log(`Found ${recipients.length} recipients for 'all' role`);
    } else {
      console.log(`Sending notification to users with role: ${targetRole}`);
      const users = await User.find({ role: targetRole }, '_id');
      recipients = users.map(user => ({ user: user._id }));
      console.log(`Found ${recipients.length} recipients for '${targetRole}' role`);
    }

    if (recipients.length === 0) {
      console.log('No recipients found');
      return res.status(400).json({
        success: false,
        message: 'No recipients found for the notification'
      });
    }

    // Create notification object
    const notificationData = {
      title,
      message,
      type: type || 'info',
      sender: req.user.id,
      recipients,
      targetRole: selectedUsers && selectedUsers.length > 0 ? 'selected' : targetRole,
      expiresAt: expiresAt || null
    };
    
    console.log('Creating notification with data:', notificationData);

    // Create notification
    const notification = await Notification.create(notificationData);
    console.log('Notification created successfully:', notification._id);

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating notification',
      error: error.message
    });
  }
};

// @desc    Get all notifications for admin or mentor
// @route   GET /api/notifications/sent
// @access  Private/Admin/Mentor
exports.getSentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ sender: req.user.id })
      .sort({ createdAt: -1 })
      .populate('sender', 'fullName email profileImage');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getUserNotifications = async (req, res) => {
  try {
    // Find notifications where the user is a recipient
    const notifications = await Notification.find({
      'recipients.user': req.user.id
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'fullName email profileImage');

    // Format notifications for the specific user
    const userNotifications = notifications.map(notification => {
      const recipientData = notification.recipients.find(
        r => r.user.toString() === req.user.id.toString()
      );
      
      return {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        sender: notification.sender,
        read: recipientData ? recipientData.read : false,
        readAt: recipientData ? recipientData.readAt : null,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt
      };
    });

    res.status(200).json({
      success: true,
      count: userNotifications.length,
      data: userNotifications
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Find the recipient and update read status
    const recipientIndex = notification.recipients.findIndex(
      r => r.user.toString() === req.user.id.toString()
    );

    if (recipientIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'You are not a recipient of this notification'
      });
    }

    // Update read status
    notification.recipients[recipientIndex].read = true;
    notification.recipients[recipientIndex].readAt = Date.now();

    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update a notification (admin or mentor)
// @route   PUT /api/notifications/:id
// @access  Private/Admin/Mentor
exports.updateNotification = async (req, res) => {
  try {
    const { title, message, type, expiresAt, selectedUsers } = req.body;
    
    // Find the notification
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if the user is the sender of the notification
    if (notification.sender.toString() !== req.user.id.toString()) {
      console.log('Authorization failed for notification update:', {
        notificationSender: notification.sender.toString(),
        requestUser: req.user.id.toString(),
        userRole: req.user.role
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }
    
    console.log('Authorization passed for notification update:', {
      notificationId: notification._id,
      userRole: req.user.role,
      userId: req.user.id
    });
    
    // Update notification fields
    if (title) notification.title = title;
    if (message) notification.message = message;
    if (type) notification.type = type;
    if (expiresAt) notification.expiresAt = expiresAt;
    
    // Update recipients if selectedUsers is provided
    if (selectedUsers && selectedUsers.length > 0) {
      // Create new recipients array
      const newRecipients = selectedUsers.map(userId => ({
        user: userId,
        read: false,
        readAt: null
      }));
      
      notification.recipients = newRecipients;
      notification.targetRole = 'selected';
    }
    
    await notification.save();
    
    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete notification for user
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // If admin or mentor (sender) is deleting, remove the entire notification
    if ((req.user.role === 'admin' || req.user.role === 'mentor') && notification.sender.toString() === req.user.id.toString()) {
      await Notification.findByIdAndDelete(req.params.id);
      
      return res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    }

    // For regular users, just remove them from recipients
    const recipientIndex = notification.recipients.findIndex(
      r => r.user.toString() === req.user.id.toString()
    );

    if (recipientIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'You are not a recipient of this notification'
      });
    }

    // Remove user from recipients
    notification.recipients.splice(recipientIndex, 1);

    // If no recipients left, delete the notification
    if (notification.recipients.length === 0) {
      await Notification.findByIdAndDelete(req.params.id);
    } else {
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted for user'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
