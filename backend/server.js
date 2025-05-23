const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const DB_URI = 'mongodb+srv://Manii_11:usman1234@cluster1.thrb5il.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1';

// MongoDB Connection with improved options
mongoose.connect(DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(() => {
  console.log('Connected to MongoDB successfully');
  
  // Verify connection by checking database
  mongoose.connection.db.admin().ping((err, result) => {
    if (err) {
      console.error('MongoDB ping error:', err);
    } else {
      console.log('MongoDB ping successful:', result);
    }
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit if cannot connect to MongoDB
});

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/files', require('./routes/files'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/career', require('./routes/career'));
app.use('/api/careers', require('./routes/careerRoutes'));

// Serve static files from files directory
app.use('/files', express.static(path.join(__dirname, 'files')));

// Basic route
app.get('/', (req, res) => {
  res.send('CareerLabs API is running');
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'careerlabssecret123');
    
    // Make sure we have the required fields
    if (!decoded.id) {
      return next(new Error('Authentication error: Invalid token payload'));
    }
    
    socket.userId = decoded.id;
    socket.userRole = decoded.role || 'user'; // Default to 'user' if role is not in token
    
    console.log(`Socket auth successful: ${socket.userId}, Role: ${socket.userRole}`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Track online users with additional info
const onlineUsers = new Map(); // Map userId -> {userId, userRole, socketId, lastActive}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}, Role: ${socket.userRole}`);
  
  // Add user to online users with additional info
  onlineUsers.set(socket.userId, {
    userId: socket.userId,
    userRole: socket.userRole,
    socketId: socket.id,
    lastActive: new Date()
  });
  
  // Join a personal room for receiving messages
  socket.join(socket.userId);
  
  // Join a role-based room for broadcasting to specific roles
  if (socket.userRole) {
    socket.join(`role:${socket.userRole}`);
  }
  
  // Broadcast updated online users list
  const onlineUsersList = Array.from(onlineUsers.keys());
  io.emit('online_users', onlineUsersList);
  
  // Handle get online users request
  socket.on('get_online_users', () => {
    socket.emit('online_users', Array.from(onlineUsers.keys()));
  });
  
  // Handle sending messages
  socket.on('send_message', (message) => {
    if (!message || !message.recipient || !message.recipient._id) {
      console.error('Invalid message format:', message);
      return;
    }
    
    // Update sender's last active time
    if (onlineUsers.has(socket.userId)) {
      const userData = onlineUsers.get(socket.userId);
      userData.lastActive = new Date();
      onlineUsers.set(socket.userId, userData);
    }
    
    // Emit to recipient's room
    io.to(message.recipient._id).emit('new_message', message);
    
    // Also emit to sender to confirm message was sent
    // This is helpful for multi-device scenarios
    socket.emit('message_sent', {
      messageId: message._id,
      recipientId: message.recipient._id,
      timestamp: new Date()
    });
    
    console.log(`Message sent from ${message.sender.fullName} to ${message.recipient.fullName}`);
  });
  
  // Handle user typing indicator
  socket.on('typing', (data) => {
    if (data && data.recipientId) {
      io.to(data.recipientId).emit('user_typing', {
        userId: socket.userId,
        typing: data.typing
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    
    // Remove user from online users
    onlineUsers.delete(socket.userId);
    
    // Broadcast updated online users list
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.IO support`);
}); 