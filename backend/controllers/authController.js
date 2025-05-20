const User = require('../models/User');
const jwt = require('jsonwebtoken');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'careerlabssecret123';

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', {
      ...req.body,
      password: req.body.password ? '[REDACTED]' : undefined
    });
    
    const { fullName, email, password, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format');
      return res.status(400).json({ success: false, message: 'Please provide a valid email' });
    }

    // Validate password length
    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    try {
      console.log('Creating new user with role:', role);
      const user = await User.create({
        fullName,
        email,
        password,
        role: role || 'user' // Provide default role if not specified
      });

      if (user) {
        console.log('User created successfully:', user._id);
        res.status(201).json({
          success: true,
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          },
          token: generateToken(user._id, user.role)
        });
      } else {
        console.log('Failed to create user - invalid data');
        res.status(400).json({ success: false, message: 'Invalid user data' });
      }
    } catch (createError) {
      console.error('Error creating user:', createError);
      if (createError.name === 'ValidationError') {
        // Get the first validation error message
        const firstError = Object.values(createError.errors)[0];
        return res.status(400).json({ success: false, message: firstError.message });
      }
      throw createError; // Throw to outer catch block for other errors
    }
  } catch (error) {
    console.error('Signup error details:', error);
    
    // Handle specific error types
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already in use' 
      });
    }
    
    // If connection issues
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection error. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log('Login request received:', {
      email: req.body.email,
      role: req.body.role,
      password: req.body.password ? '[REDACTED]' : undefined
    });
    
    const { email, password, role } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    console.log('User found?', !!user);

    // Check if user exists and password matches
    if (user) {
      const isMatch = await user.comparePassword(password);
      console.log('Password match?', isMatch);
      
      if (isMatch) {
        // Check if the role matches
        if (role && user.role !== role) {
          console.log('Role mismatch:', { requestedRole: role, actualRole: user.role });
          return res.status(401).json({ 
            success: false, 
            message: `You are not registered as a ${role}. Please login with the correct role.` 
          });
        }

        console.log('Login successful for user:', user._id);
        res.status(200).json({
          success: true,
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          },
          token: generateToken(user._id, user.role)
        });
      } else {
        console.log('Invalid password for user:', email);
        res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
    } else {
      console.log('No user found with email:', email);
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (user) {
      res.status(200).json({
        success: true,
        user
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}; 