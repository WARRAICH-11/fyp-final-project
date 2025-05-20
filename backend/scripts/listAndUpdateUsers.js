const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Function to list all users
async function listAllUsers() {
  try {
    const users = await User.find().select('_id fullName email role');
    
    console.log('\n=== All Users ===');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User Details:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Name: ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    });
    
    return users;
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
}

// Function to update a user's role
async function updateUserRole(userId, newRole) {
  try {
    if (!['user', 'mentor', 'admin'].includes(newRole)) {
      console.log('Invalid role. Must be one of: user, mentor, admin');
      return false;
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.log(`No user found with ID: ${userId}`);
      return false;
    }
    
    const oldRole = user.role;
    user.role = newRole;
    await user.save();
    
    console.log(`\nUser role updated successfully:`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Old Role: ${oldRole}`);
    console.log(`   New Role: ${user.role}`);
    
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    // List all users
    const users = await listAllUsers();
    
    if (users.length === 0) {
      console.log('No users found in the database.');
      process.exit(0);
    }
    
    // Check if any arguments were provided
    if (process.argv.length >= 4) {
      const userIndex = parseInt(process.argv[2]) - 1;
      const newRole = process.argv[3];
      
      if (isNaN(userIndex) || userIndex < 0 || userIndex >= users.length) {
        console.log('Invalid user index.');
        process.exit(1);
      }
      
      const userId = users[userIndex]._id;
      await updateUserRole(userId, newRole);
    } else {
      console.log('\nTo update a user\'s role, run:');
      console.log('node listAndUpdateUsers.js <user_index> <new_role>');
      console.log('Example: node listAndUpdateUsers.js 1 admin');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
