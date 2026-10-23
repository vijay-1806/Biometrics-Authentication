const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setPassword() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');
    
    const user = await User.findOne({ email: 'vijay@gmail.com' });
    if (user) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash('123456', salt);
      await user.save();
      console.log('✅ Password for vijay@gmail.com set back to: 123456');
    }
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

setPassword();
