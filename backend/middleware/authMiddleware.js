const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'careerlabssecret123';

// Protect routes
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, no token provided' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Add user to request object
      req.user = await User.findById(decoded.id).select('-password');
      
      // Log user information for debugging
      console.log('User authenticated:', {
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        path: req.originalUrl,
        method: req.method
      });
      
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token failed' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorization check:', { 
      userId: req.user._id,
      userRole: req.user.role, 
      requiredRoles: roles,
      path: req.originalUrl,
      method: req.method
    });
    
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({
        success: false,
        message: 'User not found in request'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`Role mismatch: User has role '${req.user.role}' but needs one of:`, roles);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this resource`
      });
    }
    
    console.log('Authorization successful');
    next();
  };
};

module.exports = { protect, authorize }; 