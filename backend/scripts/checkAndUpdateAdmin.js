const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Email of the user you want to set as admin
const adminEmail = 'admin@example.com'; // Replace with your admin email

async function checkAndUpdateAdmin() {
  try {
    // Find the user by email
    const user = await User.findOne({ email: adminEmail });
    
    if (!user) {
      console.log(`No user found with email: ${adminEmail}`);
      process.exit(1);
    }
    
    console.log('User found:');
    console.log({
      id: user._id,
      email: user.email,
      name: user.fullName,
      currentRole: user.role
    });
    
    // If user is not admin, update to admin
    if (user.role !== 'admin') {
      console.log(`Updating user role from '${user.role}' to 'admin'`);
      
      user.role = 'admin';
      await user.save();
      
      console.log('User role updated successfully to admin');
    } else {
      console.log('User already has admin role');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndUpdateAdmin();
