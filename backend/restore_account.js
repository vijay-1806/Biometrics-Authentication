const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixPassword() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');

    // Hash ONCE directly into the database field to avoid pre-save double-hashing
    const salt = await bcrypt.genSalt(10);
    const singleHash = await bcrypt.hash('123456', salt);

    await User.updateOne(
      { email: 'vijay@gmail.com' },
      { $set: { password: singleHash } }
    );

    const teacherHash = await bcrypt.hash('password123', salt);
    await User.updateOne(
      { email: 'teacher@gmail.com' },
      { $set: { password: teacherHash } }
    );

    console.log('==================================================');
    console.log('🎉 SINGLE-HASH PASSWORD RESET COMPLETE!');
    console.log('==================================================');
    console.log('✅ vijay@gmail.com password set to: 123456');
    console.log('✅ teacher@gmail.com password set to: password123');
    console.log('==================================================\n');

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixPassword();
