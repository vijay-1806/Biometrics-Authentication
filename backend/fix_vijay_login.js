const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixAndVerifyVijay() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');

    // 1. Generate single bcrypt hash for "123456"
    const salt = await bcrypt.genSalt(10);
    const singleHash = await bcrypt.hash('123456', salt);

    // 2. Use updateOne to bypass pre('save') hook (prevent double hashing)
    await User.updateOne(
      { email: 'vijay@gmail.com' },
      { $set: { password: singleHash } }
    );

    // 3. Retrieve user and verify matchPassword
    const user = await User.findOne({ email: 'vijay@gmail.com' }).select('+password');
    if (!user) {
      console.log('❌ User vijay@gmail.com not found!');
      mongoose.disconnect();
      return;
    }

    const isMatch = await user.matchPassword('123456');
    console.log(`==================================================`);
    console.log(`👤 Email:         ${user.email}`);
    console.log(`🔑 Password:      123456`);
    console.log(`🔒 Hashed in DB:  ${user.password}`);
    console.log(`✅ Match Test:    ${isMatch ? 'PASSED (SUCCESS!)' : 'FAILED'}`);
    console.log(`==================================================`);

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixAndVerifyVijay();
