const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');

async function fixAndVerifyTeacher() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');

    // Generate single bcrypt hash for "password123"
    const salt = await bcrypt.genSalt(10);
    const singleHash = await bcrypt.hash('password123', salt);

    let teacher = await User.findOne({ email: 'teacher@gmail.com' });
    if (!teacher) {
      teacher = new User({
        name: 'Teacher',
        email: 'teacher@gmail.com',
        password: singleHash,
        role: 'teacher',
      });
      await teacher.save();
      console.log('✅ Created teacher@gmail.com account');
    } else {
      await User.updateOne(
        { email: 'teacher@gmail.com' },
        { $set: { password: singleHash, role: 'teacher' } }
      );
      console.log('✅ Updated password for teacher@gmail.com');
    }

    const updatedTeacher = await User.findOne({ email: 'teacher@gmail.com' }).select('+password');
    const isMatch = await updatedTeacher.matchPassword('password123');

    console.log(`==================================================`);
    console.log(`👤 User ID:       ${updatedTeacher._id}`);
    console.log(`📧 Email:         ${updatedTeacher.email}`);
    console.log(`🔑 Password:      password123`);
    console.log(`🎭 Role:          ${updatedTeacher.role}`);
    console.log(`✅ Match Test:    ${isMatch ? 'PASSED (SUCCESS!)' : 'FAILED'}`);
    console.log(`==================================================\n`);

    await mongoose.disconnect();

    // Now test live API login via HTTP POST request
    const data = JSON.stringify({
      email: 'teacher@gmail.com',
      password: 'password123'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('🌐 Live Login Test Response (HTTP Status', res.statusCode + '):');
        console.log(body);
      });
    });

    req.on('error', (error) => {
      console.error('Request Error:', error.message);
    });

    req.write(data);
    req.end();

  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixAndVerifyTeacher();
