require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let io;
try {
  io = require('socket.io-client');
} catch (e) {
  try {
    io = require('../frontend/node_modules/socket.io-client');
  } catch (err) {
    io = null;
  }
}

function postJSON(path, payload, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function createKeystrokes(count = 12) {
  const keys = ['c', 'o', 'n', 's', 't', ' ', 'x', ' ', '=', ' ', '1', ';'];
  const events = [];
  let baseTime = Date.now() - 3000;
  for (let i = 0; i < count; i++) {
    const k = keys[i % keys.length];
    events.push({ type: 'keydown', key: k, timestamp: baseTime });
    events.push({ type: 'keyup', key: k, timestamp: baseTime + 50 });
    baseTime += 120;
  }
  return events;
}

async function runSimulation() {
  console.log('==================================================');
  console.log('  SIMULATION: TAB SWITCH & COPY-PASTE DETECTION   ');
  console.log('==================================================\n');

  let dbConnected = false;
  let student = null;
  let teacher = null;
  let assignment = null;

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    dbConnected = true;
    console.log('✅ MongoDB connected successfully.');

    const User = require('./src/models/User');
    const Assignment = require('./src/models/Assignment');

    teacher = await User.findOne({ role: 'teacher' });
    student = await User.findOne({ role: 'student' });
    assignment = await Assignment.findOne();

    if (student) {
      console.log(`👤 Student Candidate: ${student.name} (${student.email})`);
    }
  } catch (err) {
    console.log(`⚠️ Direct MongoDB connection skipped (${err.message}). Make sure mongod is running for backend persistence.`);
  }

  const dummyStudentId = student ? student._id : '66d000000000000000000001';
  const studentToken = jwt.sign(
    { id: dummyStudentId, sessionId: student ? student.sessionId : undefined },
    process.env.JWT_SECRET || 'supersecretlmskey12345'
  );
  console.log('✅ Simulation authorization token ready.');

  // Connect Teacher Socket if module is present
  let teacherSocket = null;
  if (io) {
    teacherSocket = io('http://localhost:5000', { transports: ['websocket'] });
    const sessionPin = '999888';

    teacherSocket.emit('create-session', { examId: assignment ? assignment._id.toString() : 'demo_exam', pin: sessionPin });

    teacherSocket.on('student-anomaly', (data) => {
      console.log(`\n🔔 [SOCKET EVENT] Teacher received anomaly alert:`, data.alert?.alertType, data.alert?.topDeviatingFeatures);
    });

    teacherSocket.on('live_score', (data) => {
      console.log(`\n📊 [SOCKET EVENT] Teacher received live score update: tabBlurCount=${data.tabBlurCount}, pasteCount=${data.pasteCount}`);
    });
  }

  await new Promise(r => setTimeout(r, 500));

  // ----------------------------------------------------
  // SIMULATION TEST 1: TAB SWITCH EVENT
  // ----------------------------------------------------
  console.log('\n--- Test 1: Simulating Student Tab Switch (Alt+Tab / Window Blur) ---');
  const tabEvents = [
    ...createKeystrokes(6),
    { type: 'visibilitychange', hidden: true, source: 'visibilitychange', timestamp: Date.now() }
  ];
  const tabSwitchPayload = {
    events: tabEvents,
    session: 'simulation_session_001',
    context: 'exam',
    examId: assignment ? assignment._id.toString() : 'demo_exam',
    windowStartTime: Date.now() - 2000,
    windowEndTime: Date.now(),
    deviceInfo: { userAgent: 'Mozilla/5.0 Simulation', screenWidth: 1920, screenHeight: 1080 }
  };

  try {
    const tabRes = await postJSON('/api/behavior/score', tabSwitchPayload, studentToken);
    console.log(`✅ Backend Response (Tab Switch):`, tabRes);
  } catch (e) {
    console.error(`❌ Tab Switch API Call Failed:`, e.message);
  }

  // ----------------------------------------------------
  // SIMULATION TEST 2: COPY-PASTE EVENT
  // ----------------------------------------------------
  console.log('\n--- Test 2: Simulating Student Copy-Paste (Ctrl+V / Context Menu) ---');
  const pasteEvents = [
    ...createKeystrokes(6),
    { type: 'paste', timestamp: Date.now(), length: 450 }
  ];
  const pastePayload = {
    events: pasteEvents,
    session: 'simulation_session_001',
    context: 'exam',
    examId: assignment ? assignment._id.toString() : 'demo_exam',
    windowStartTime: Date.now() - 2000,
    windowEndTime: Date.now(),
    deviceInfo: { userAgent: 'Mozilla/5.0 Simulation', screenWidth: 1920, screenHeight: 1080 }
  };

  try {
    const pasteRes = await postJSON('/api/behavior/score', pastePayload, studentToken);
    console.log(`✅ Backend Response (Copy-Paste):`, pasteRes);
  } catch (e) {
    console.error(`❌ Copy-Paste API Call Failed:`, e.message);
  }

  // Wait 1 second for database write & socket propagation
  await new Promise(r => setTimeout(r, 1000));

  // ----------------------------------------------------
  // VERIFICATION: Check Database Records if connected
  // ----------------------------------------------------
  if (dbConnected && student) {
    console.log('\n--- Test 3: Verifying Database Records ---');
    const BehaviorSession = require('./src/models/BehaviorSession');
    const BehaviorAlert = require('./src/models/BehaviorAlert');

    const dbSession = await BehaviorSession.findOne({ student: student._id }).sort({ updatedAt: -1 });
    const alerts = await BehaviorAlert.find({ student: student._id }).sort({ createdAt: -1 }).limit(10);

    console.log(`📌 BehaviorSession tabBlurCount in DB: ${dbSession ? dbSession.tabBlurCount : 0}`);
    console.log(`📌 BehaviorSession pasteCount in DB:   ${dbSession ? dbSession.pasteCount : 0}`);
    console.log(`📌 Total BehaviorAlerts found in DB:   ${alerts.length}`);
    alerts.forEach(a => {
      console.log(`   └─ Alert [${a.alertType}] Severity: ${a.severity}, Features:`, JSON.stringify(a.topDeviatingFeatures));
    });
  }

  console.log('\n==================================================');
  console.log('🎉 SIMULATION COMPLETED');
  console.log('==================================================\n');

  if (teacherSocket) teacherSocket.disconnect();
  if (dbConnected) mongoose.disconnect();
  process.exit(0);
}

runSimulation();
