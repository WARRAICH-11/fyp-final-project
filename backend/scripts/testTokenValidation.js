const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'careerlabssecret123';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Generate JWT Token (current implementation)
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Generate Enhanced JWT Token (with role included)
const generateEnhancedToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Test token validation
async function testTokenValidation() {
  try {
    // Get an admin user
    const adminUser = await User.findOne({ role: 'admin' }).select('-password');
    
    if (!adminUser) {
      console.log('No admin user found in the database.');
      process.exit(1);
    }
    
    console.log('\n=== Test User ===');
    console.log(`ID: ${adminUser._id}`);
    console.log(`Name: ${adminUser.fullName}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    
    // Generate current token (with just ID)
    const currentToken = generateToken(adminUser._id);
    console.log('\n=== Current Token ===');
    console.log(currentToken);
    
    // Decode current token
    const decodedCurrent = jwt.verify(currentToken, JWT_SECRET);
    console.log('\n=== Decoded Current Token ===');
    console.log(decodedCurrent);
    
    // Generate enhanced token (with role)
    const enhancedToken = generateEnhancedToken(adminUser._id, adminUser.role);
    console.log('\n=== Enhanced Token (with role) ===');
    console.log(enhancedToken);
    
    // Decode enhanced token
    const decodedEnhanced = jwt.verify(enhancedToken, JWT_SECRET);
    console.log('\n=== Decoded Enhanced Token ===');
    console.log(decodedEnhanced);
    
    // Simulate the protect middleware
    console.log('\n=== Simulating Protect Middleware ===');
    console.log('1. Verifying token...');
    const decoded = jwt.verify(currentToken, JWT_SECRET);
    console.log('   Token verified:', decoded);
    
    console.log('2. Finding user by ID...');
    const user = await User.findById(decoded.id).select('-password');
    console.log('   User found:', {
      id: user._id,
      email: user.email,
      role: user.role
    });
    
    console.log('\n=== Conclusion ===');
    console.log('The current token implementation only includes the user ID.');
    console.log('The role is fetched from the database when the token is verified.');
    console.log('If the user\'s role in the database is correct, authorization should work.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testTokenValidation();
