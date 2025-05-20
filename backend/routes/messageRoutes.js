const express = require('express');
const router = express.Router();
const { 
  sendMessage, 
  getConversation, 
  getConversations, 
  getChatContacts,
  markMessagesAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// Get all conversations and send message
router.route('/')
  .get(getConversations)
  .post(sendMessage);

// Get available chat contacts
router.get('/contacts', getChatContacts);

// Get conversation with specific user
router.get('/:userId', getConversation);

// Mark messages as read from a specific sender
router.put('/:senderId/read', markMessagesAsRead);

module.exports = router;
