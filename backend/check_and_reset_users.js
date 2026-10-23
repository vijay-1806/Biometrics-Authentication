const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixAllPasswords() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');

    const salt = await bcrypt.genSalt(10);
    const hashVijay = await bcrypt.hash('123456', salt);
    const hashTeacher = await bcrypt.hash('password123', salt);

    await User.updateOne({ email: 'vijay@gmail.com' }, { $set: { password: hashVijay } });
    await User.updateOne({ email: 'teacher@gmail.com' }, { $set: { password: hashTeacher } });

    console.log('✅ Accounts updated successfully:');
    console.log(' - vijay@gmail.com  -> password: 123456');
    console.log(' - teacher@gmail.com -> password: password123');

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixAllPasswords();
