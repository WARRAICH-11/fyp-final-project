const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipients: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, read: { type: Boolean, default: false }, readAt: Date }],
  targetRole: { type: String, enum: ['all', 'user', 'mentor', 'admin', 'selected'], default: 'all' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

module.exports = mongoose.model('Notification', NotificationSchema);
