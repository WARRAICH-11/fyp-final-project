const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Send a message to another user
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { recipientId, content } = req.body;

  if (!recipientId || !content) {
    res.status(400);
    throw new Error('Please provide recipient and message content');
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    res.status(404);
    throw new Error('Recipient not found');
  }

  // Create new message
  const message = await Message.create({
    sender: req.user.id,
    recipient: recipientId,
    content
  });

  // Populate sender info
  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'fullName profileImage role')
    .populate('recipient', 'fullName profileImage role');

  res.status(201).json({
    success: true,
    data: populatedMessage
  });
});

// @desc    Get conversation with a specific user
// @route   GET /api/messages/:userId
// @access  Private
const getConversation = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get messages between current user and the specified user
  const messages = await Message.find({
    $or: [
      { sender: req.user.id, recipient: userId },
      { sender: userId, recipient: req.user.id }
    ]
  })
    .sort({ createdAt: 1 })
    .populate('sender', 'fullName profileImage role')
    .populate('recipient', 'fullName profileImage role');

  // Mark messages as read if current user is the recipient
  await Message.updateMany(
    { sender: userId, recipient: req.user.id, read: false },
    { read: true }
  );

  res.status(200).json({
    success: true,
    data: messages
  });
});

// @desc    Get list of conversations
// @route   GET /api/messages
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  
  // Find all users the current user has exchanged messages with
  const messages = await Message.find({
    $or: [
      { sender: currentUserId },
      { recipient: currentUserId }
    ]
  }).sort({ createdAt: -1 });

  // Extract unique user IDs from conversations
  const userIds = new Set();
  messages.forEach(message => {
    if (message.sender.toString() !== currentUserId) {
      userIds.add(message.sender.toString());
    }
    if (message.recipient.toString() !== currentUserId) {
      userIds.add(message.recipient.toString());
    }
  });

  // Get conversation previews
  const conversations = [];
  for (const userId of userIds) {
    // Get the latest message
    const latestMessage = await Message.findOne({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'fullName profileImage role')
      .populate('recipient', 'fullName profileImage role');

    // Count unread messages
    const unreadCount = await Message.countDocuments({
      sender: userId,
      recipient: currentUserId,
      read: false
    });

    // Get user details
    const user = await User.findById(userId).select('fullName profileImage role');

    conversations.push({
      user,
      latestMessage,
      unreadCount
    });
  }

  // Sort conversations by latest message date
  conversations.sort((a, b) => 
    new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt)
  );

  res.status(200).json({
    success: true,
    data: conversations
  });
});

// @desc    Get available chat contacts based on user role
// @route   GET /api/messages/contacts
// @access  Private
const getChatContacts = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user.id);
  let contacts = [];
  let contactsWithMessages = [];

  // First, find all users the current user has exchanged messages with
  const messages = await Message.find({
    $or: [
      { sender: currentUser._id },
      { recipient: currentUser._id }
    ]
  }).sort({ createdAt: -1 });

  // Extract unique user IDs from conversations
  const messageUserIds = new Set();
  messages.forEach(message => {
    if (message.sender.toString() !== currentUser._id.toString()) {
      messageUserIds.add(message.sender.toString());
    }
    if (message.recipient.toString() !== currentUser._id.toString()) {
      messageUserIds.add(message.recipient.toString());
    }
  });

  // Get users with existing conversations
  if (messageUserIds.size > 0) {
    contactsWithMessages = await User.find({
      _id: { $in: Array.from(messageUserIds) }
    }).select('_id fullName profileImage role lastSeen');
  }

  // Different logic based on user role to get potential contacts
  try {
    switch (currentUser.role) {
      case 'user':
        // Users can chat with their assigned mentor and admin
        if (currentUser.mentor) {
          const mentor = await User.findById(currentUser.mentor)
            .select('_id fullName profileImage role lastSeen');
          if (mentor) {
            contacts.push(mentor);
          }
        }
        
        // Add admins to contacts
        const admins = await User.find({ role: 'admin' })
          .select('_id fullName profileImage role lastSeen');
        contacts = [...contacts, ...admins];
        
        // For testing: Add mentors to contacts (remove in production)
        const mentors = await User.find({ role: 'mentor' })
          .select('_id fullName profileImage role lastSeen');
        contacts = [...contacts, ...mentors];
        break;
        
      case 'mentor':
        // Mentors can chat with their assigned mentees and admins
        const mentees = await User.find({ mentor: currentUser._id })
          .select('_id fullName profileImage role lastSeen');
        
        // Add admins to contacts
        const mentorAdmins = await User.find({ role: 'admin' })
          .select('_id fullName profileImage role lastSeen');
        
        // For testing: Add all users (remove in production)
        const allUsers = await User.find({ role: 'user' })
          .select('_id fullName profileImage role lastSeen');
        
        contacts = [...contacts, ...mentees, ...mentorAdmins, ...allUsers];
        break;
        
      case 'admin':
        // Admins can chat with all users
        const allUsersForAdmin = await User.find({ _id: { $ne: currentUser._id } })
          .select('_id fullName profileImage role lastSeen');
        contacts = allUsersForAdmin;
        break;
        
      default:
        // Default case for any other role - allow access to admins
        const defaultAdmins = await User.find({ role: 'admin' })
          .select('_id fullName profileImage role lastSeen');
        contacts = defaultAdmins;
    }
  } catch (error) {
    console.error('Error in role-based contact fetching:', error);
    // Fallback - return at least admins if there's an error
    const fallbackAdmins = await User.find({ role: 'admin' })
      .select('_id fullName profileImage role lastSeen');
    contacts = fallbackAdmins;
  }

  // Merge contacts and remove duplicates
  const allContacts = [...contactsWithMessages];
  
  // Add contacts that don't already exist in the list
  contacts.forEach(contact => {
    if (!allContacts.some(c => c._id.toString() === contact._id.toString())) {
      allContacts.push(contact);
    }
  });

  // Get unread counts for each contact
  const contactsWithUnreadCounts = await Promise.all(allContacts.map(async (contact) => {
    // Count unread messages from this contact
    const unreadCount = await Message.countDocuments({
      sender: contact._id,
      recipient: currentUser._id,
      read: false
    });

    // Get the latest message with this contact
    const latestMessage = await Message.findOne({
      $or: [
        { sender: currentUser._id, recipient: contact._id },
        { sender: contact._id, recipient: currentUser._id }
      ]
    }).sort({ createdAt: -1 });

    // Format the time for display
    let lastMessageTime = '';
    if (latestMessage) {
      const messageDate = new Date(latestMessage.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Today - show time
        lastMessageTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        // Yesterday
        lastMessageTime = 'Yesterday';
      } else if (diffDays < 7) {
        // Within a week - show day name
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        lastMessageTime = days[messageDate.getDay()];
      } else {
        // Older - show date
        lastMessageTime = messageDate.toLocaleDateString();
      }
    }

    return {
      _id: contact._id,
      fullName: contact.fullName,
      profileImage: contact.profileImage,
      role: contact.role,
      unreadCount,
      lastMessageTime
    };
  }));

  // Sort contacts: first by unread messages, then by latest message time
  contactsWithUnreadCounts.sort((a, b) => {
    // First sort by unread count (descending)
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    
    // If unread counts are the same, sort by latest message time
    if (a.lastMessageTime && b.lastMessageTime) {
      return b.lastMessageTime.localeCompare(a.lastMessageTime);
    }
    
    // If one has a message and the other doesn't, prioritize the one with a message
    if (a.lastMessageTime && !b.lastMessageTime) return -1;
    if (!a.lastMessageTime && b.lastMessageTime) return 1;
    
    // If neither has messages, sort by name
    return a.fullName.localeCompare(b.fullName);
  });

  res.status(200).json({
    success: true,
    data: contactsWithUnreadCounts
  });
});

// Cache to track recent read operations by recipient and sender
const readOperationsCache = new Map();

// @desc    Mark messages as read from a specific sender
// @route   PUT /api/messages/:senderId/read
// @access  Private
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const senderId = req.params.senderId;
  const recipientId = req.user.id;
  
  // Create a cache key for this recipient-sender pair
  const cacheKey = `${recipientId}-${senderId}`;
  const now = Date.now();
  const lastOperation = readOperationsCache.get(cacheKey) || 0;
  
  // If we've processed this request recently (within 5 seconds), return success without DB operation
  if (now - lastOperation < 5000) {
    return res.status(200).json({
      success: true,
      message: 'Messages already marked as read recently',
      count: 0,
      cached: true
    });
  }
  
  // Update the cache with the current timestamp
  readOperationsCache.set(cacheKey, now);
  
  // Clean up old cache entries (older than 1 minute)
  for (const [key, timestamp] of readOperationsCache.entries()) {
    if (now - timestamp > 60000) {
      readOperationsCache.delete(key);
    }
  }
  
  // Check if sender exists
  const sender = await User.findById(senderId);
  if (!sender) {
    res.status(404);
    throw new Error('Sender not found');
  }
  
  // Mark all messages from this sender as read
  const result = await Message.updateMany(
    { sender: senderId, recipient: recipientId, read: false },
    { read: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Messages marked as read',
    count: result.nModified || 0
  });
});

module.exports = {
  sendMessage,
  getConversation,
  getConversations,
  getChatContacts,
  markMessagesAsRead
};
