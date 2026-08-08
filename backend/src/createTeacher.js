const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_demo';

async function seedTeacher() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    let teacher = await User.findOne({ email: 'teacher@lms.com' });
    if (teacher) {
      teacher.role = 'teacher';
      teacher.password = 'password123'; // Will be hashed by pre-save hook
      await teacher.save();
      console.log('Updated existing teacher account: teacher@lms.com / password123');
    } else {
      teacher = await User.create({
        name: 'Teacher Admin',
        email: 'teacher@lms.com',
        password: 'password123',
        role: 'teacher'
      });
      console.log('Created new teacher account: teacher@lms.com / password123');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding teacher:', error);
    process.exit(1);
  }
}

seedTeacher();
