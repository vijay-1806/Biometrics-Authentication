const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');
    
    const users = await User.find().select('name email role createdAt');
    console.log('=== USERS IN MONGO DB (lms_demo) ===');
    console.log(users);
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  }
}

checkUsers();
