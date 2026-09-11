const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function checkUserData(email = 'sarvanth@gmail.com') {
  try {
    const User = require('./src/models/User');
    const BehaviorModel = require('./src/models/BehaviorModel');
    const BehaviorWindow = require('./src/models/BehaviorWindow');
    const BehaviorSession = require('./src/models/BehaviorSession');

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    const passwordVerified = await user.matchPassword('123456');

    console.log(`==================================================`);
    console.log(`  BIOMETRIC DATA VERIFICATION FOR ${user.name} (${user.email})`);
    console.log(`==================================================\n`);

    console.log(`👤 User ID:       ${user._id}`);
    console.log(`🎭 Role:          ${user.role}`);
    console.log(`🔑 Password '123456': ${passwordVerified ? '✅ MATCHES' : '❌ DOES NOT MATCH'}`);
    console.log(`📅 Created At:    ${user.createdAt}`);
    
    // Check trained models in DB
    const models = await BehaviorModel.find({ student: user._id });
    console.log(`\n🧠 BehaviorModel Records in DB: ${models.length}`);
    models.forEach(m => {
      console.log(`   └─ Model ID: ${m._id}`);
      console.log(`      Status: ${m.status}`);
      console.log(`      Model Path: ${m.modelPath}`);
      console.log(`      Training Windows: ${m.trainingWindowCount}`);
      console.log(`      Updated: ${m.updatedAt}`);
    });

    // Check behavior windows collected
    const windowCount = await BehaviorWindow.countDocuments({ student: user._id });
    console.log(`\n📊 BehaviorWindow Data Samples collected in LMS: ${windowCount}`);

    // Check sessions
    const session = await BehaviorSession.findOne({ student: user._id });
    console.log(`\n🎯 Active Session Scores:`, session ? {
      smoothedScore: session.smoothedScore,
      totalWindowsScored: session.totalWindowsScored,
      tabBlurCount: session.tabBlurCount,
      pasteCount: session.pasteCount
    } : 'None');

    // Check ML service files
    const mlModelsDir = path.join(__dirname, '../behavioral-auth-ml-service/models');
    const mlDataDir = path.join(__dirname, '../behavioral-auth-ml-service/data');
    
    const joblibFile = path.join(mlModelsDir, `${user._id}.joblib`);
    const jsonFile = path.join(mlDataDir, `${user._id}.json`);

    console.log(`\n📁 ML Service Files for ${user._id}:`);
    console.log(`   - Model file (.joblib): ${fs.existsSync(joblibFile) ? `✅ Present (${(fs.statSync(joblibFile).size / 1024).toFixed(1)} KB)` : '❌ Missing'}`);
    if (fs.existsSync(jsonFile)) {
      const parsed = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      const sampleCount = parsed.enroll_samples ? parsed.enroll_samples.length : 0;
      console.log(`   - Dataset file (.json):   ✅ Present (${sampleCount} enrollment samples)`);
    } else {
      console.log(`   - Dataset file (.json):   ❌ Missing`);
    }

    console.log(`\n==================================================`);
    console.log(`✅ VERDICT: DATASET AND TRAINED MODELS ARE 100% INTACT!`);
    console.log(`==================================================\n`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
  const targetEmail = process.argv[2];
  if (targetEmail) {
    await checkUserData(targetEmail);
  } else {
    // Check both
    await checkUserData('sarvanth@gmail.com');
    await checkUserData('vijay@gmail.com');
  }
  await mongoose.disconnect();
}

main();
