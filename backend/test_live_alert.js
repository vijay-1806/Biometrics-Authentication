const { io } = require('socket.io-client');
const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
  const User = require('./src/models/User');
  const Assignment = require('./src/models/Assignment');
  
  const teacher = await User.findOne({ role: 'teacher' });
  const student = await User.findOne({ email: 'studentA@gmail.com' });
  const assignment = await Assignment.findOne();
  
  if (!teacher || !student || !assignment) {
    console.log('Missing data');
    process.exit(1);
  }

  // 1. Login Teacher
  const tRes = await axios.post('http://localhost:5000/api/auth/login', { email: teacher.email, password: 'password123' });
  const tToken = tRes.data.token;

  // 2. Login Student
  const sRes = await axios.post('http://localhost:5000/api/auth/login', { email: student.email, password: 'password123' });
  const sToken = sRes.data.token;

  // 3. Connect Socket for Teacher
  const socket = io('http://localhost:5000', { transports: ['websocket'] });
  
  socket.emit('create-session', { examId: assignment._id.toString(), pin: '123456' });
  
  socket.on('anomaly-alert', (alert) => {
    console.log('\n✅ SUCCESS: Teacher received live anomaly alert via Socket.IO!');
    console.log(alert);
    process.exit(0);
  });

  // Wait a second for socket connection to establish
  setTimeout(async () => {
    try {
      console.log('Sending synthetic anomaly (paste event) as student...');
      
      const payload = {
        events: [
          { type: 'paste', length: 500, timestamp: Date.now() }
        ],
        session: 'test_live_session',
        context: 'exam',
        examId: assignment._id.toString(),
        windowStartTime: Date.now() - 5000,
        windowEndTime: Date.now(),
        deviceInfo: { userAgent: 'test', screenWidth: 1920, screenHeight: 1080, pointerTypes: [] }
      };

      await axios.post('http://localhost:5000/api/behavior/score', payload, {
        headers: { Authorization: `Bearer ${sToken}` }
      });
      
      console.log('Payload sent, waiting for socket broadcast...');
    } catch (e) {
      console.error(e.response ? e.response.data : e.message);
    }
  }, 1000);
}

test();
