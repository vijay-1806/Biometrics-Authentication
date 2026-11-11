const mongoose = require('mongoose');

const testBehavior = async () => {
  try {
    const baseURL = 'http://127.0.0.1:5000/api';
    
    // 1. Register a student
    const email = `test_${Date.now()}@test.com`;
    console.log('Registering test student:', email);
    let authRes = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: email,
        password: 'password123',
        role: 'student'
      })
    });
    
    const authData = await authRes.json();
    const token = authData.token;
    console.log('Got auth token:', token);
    
    // 2. Generate synthetic raw events payload
    // Events: 5 keydowns, 5 keyups, 10 mousemoves, 2 clicks
    const events = [];
    const startTime = Date.now() - 5000;
    
    // Keystrokes
    let ts = startTime;
    ['H','e','l','l','o'].forEach(key => {
      events.push({ type: 'keydown', key: key, timestamp: ts });
      events.push({ type: 'keyup', key: key, timestamp: ts + 50 }); // 50ms dwell
      ts += 150; // 100ms flight
    });
    
    // Mouse movements (straight line)
    for (let i = 0; i < 10; i++) {
      events.push({ type: 'mousemove', x: 100 + i*10, y: 100 + i*10, timestamp: ts + i*20 });
    }
    
    // Clicks
    events.push({ type: 'click', timestamp: ts + 300 });
    events.push({ type: 'click', timestamp: ts + 500 });

    const payload = {
      events,
      session: 'sess_12345',
      context: 'quiz',
      windowStartTime: startTime,
      windowEndTime: Date.now()
    };
    
    // 3. Post to /api/behavior/window
    console.log('Posting 5-sec window with', events.length, 'events');
    const res = await fetch(`${baseURL}/behavior/window`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });
    
    const resData = await res.json();
    console.log('Response:', resData.message);
    console.log('Saved Window Data:', resData.data.features);

    // 4. Verify in DB
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const BehaviorWindow = require('./src/models/BehaviorWindow');
    const count = await BehaviorWindow.countDocuments({ student: authData._id });
    console.log(`Verified DB: ${count} windows saved for this student.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
};

testBehavior();
