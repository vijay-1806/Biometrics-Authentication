const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
  const BehaviorSession = require('./src/models/BehaviorSession');
  const BehaviorAlert = require('./src/models/BehaviorAlert');

  const sessions = await BehaviorSession.find().sort({ updatedAt: -1 }).limit(5);
  const alerts = await BehaviorAlert.find().sort({ createdAt: -1 }).limit(10);

  console.log('=== LATEST BEHAVIOR SESSIONS ===');
  sessions.forEach(s => {
    console.log(`Student: ${s.student}, tabBlurCount: ${s.tabBlurCount}, pasteCount: ${s.pasteCount}, score: ${s.smoothedScore}`);
  });

  console.log('\n=== LATEST BEHAVIOR ALERTS ===');
  alerts.forEach(a => {
    console.log(`Alert: [${a.alertType}] Student: ${a.student}, Exam: ${a.exam}, Features:`, JSON.stringify(a.topDeviatingFeatures));
  });

  mongoose.disconnect();
}

check();
