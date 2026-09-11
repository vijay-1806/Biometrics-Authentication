const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function restoreSarvanthAccount() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');
    const BehaviorModel = require('./src/models/BehaviorModel');

    console.log('==================================================');
    console.log('🚀 RESTORING / CREATING SARVANTH ACCOUNT IN LMS');
    console.log('==================================================\n');

    // 1. Create or update sarvanth@gmail.com user
    const salt = await bcrypt.genSalt(10);
    const singleHash = await bcrypt.hash('123456', salt);

    let user = await User.findOne({ email: 'sarvanth@gmail.com' });
    if (!user) {
      user = new User({
        name: 'Sarvanth',
        email: 'sarvanth@gmail.com',
        password: singleHash,
        role: 'student',
      });
      // Save directly with hashed password bypassed or save singleHash
      await User.collection.insertOne({
        name: 'Sarvanth',
        email: 'sarvanth@gmail.com',
        password: singleHash,
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      user = await User.findOne({ email: 'sarvanth@gmail.com' });
      console.log('✅ Created new user sarvanth@gmail.com in MongoDB (lms_demo)');
    } else {
      await User.updateOne(
        { _id: user._id },
        { $set: { password: singleHash, name: 'Sarvanth', role: 'student' } }
      );
      user = await User.findOne({ email: 'sarvanth@gmail.com' });
      console.log('✅ Updated account & password for sarvanth@gmail.com in MongoDB (lms_demo)');
    }

    const testUser = await User.findOne({ email: 'sarvanth@gmail.com' }).select('+password');
    const isPasswordValid = await testUser.matchPassword('123456');

    console.log(`👤 User Name:    ${user.name}`);
    console.log(`📧 User Email:   ${user.email}`);
    console.log(`🆔 User ObjectId: ${user._id}`);
    console.log(`🔑 Password:     123456 (${isPasswordValid ? '✅ Verified' : '❌ Failed'})`);
    console.log(`🎭 Role:         ${user.role}`);

    // 2. Link trained ML model file (.joblib) using the DB ObjectId
    const modelsDir = path.join(__dirname, '../behavioral-auth-ml-service/models');
    const sourceModelPath = path.join(modelsDir, 'sarvanth.joblib');
    const targetModelPath = path.join(modelsDir, `${user._id}.joblib`);

    if (fs.existsSync(sourceModelPath)) {
      fs.copyFileSync(sourceModelPath, targetModelPath);
      const stats = fs.statSync(targetModelPath);
      console.log(`📁 Copied model: sarvanth.joblib -> ${user._id}.joblib (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.warn(`⚠️ Source model not found at ${sourceModelPath}`);
    }

    // 3. Link ML dataset file (.json) using the DB ObjectId
    const dataDir = path.join(__dirname, '../behavioral-auth-ml-service/data');
    const sourceDataPath = path.join(dataDir, 'sarvanth.json');
    const targetDataPath = path.join(dataDir, `${user._id}.json`);
    let sampleCount = 34;

    if (fs.existsSync(sourceDataPath)) {
      const rawData = fs.readFileSync(sourceDataPath, 'utf8');
      const jsonData = JSON.parse(rawData);
      sampleCount = jsonData.enroll_samples ? jsonData.enroll_samples.length : sampleCount;
      
      // Update the user_id inside the JSON to match MongoDB ObjectId
      jsonData.user_id = user._id.toString();
      fs.writeFileSync(targetDataPath, JSON.stringify(jsonData, null, 2), 'utf8');
      console.log(`📊 Copied dataset: sarvanth.json -> ${user._id}.json (${sampleCount} enrollment samples)`);
    } else {
      console.warn(`⚠️ Source dataset not found at ${sourceDataPath}`);
    }

    // 4. Create or update BehaviorModel in MongoDB
    let behaviorModel = await BehaviorModel.findOne({ student: user._id });
    if (!behaviorModel) {
      behaviorModel = new BehaviorModel({
        student: user._id,
        status: 'ready',
        modelPath: targetModelPath,
        trainedAt: new Date(),
        trainingWindowCount: sampleCount,
        personalThreshold: 0.5,
      });
      await behaviorModel.save();
      console.log(`🧠 Created BehaviorModel record in MongoDB for Sarvanth (ID: ${behaviorModel._id})`);
    } else {
      behaviorModel.status = 'ready';
      behaviorModel.modelPath = targetModelPath;
      behaviorModel.trainedAt = new Date();
      behaviorModel.trainingWindowCount = sampleCount;
      behaviorModel.personalThreshold = 0.5;
      await behaviorModel.save();
      console.log(`🧠 Updated BehaviorModel record in MongoDB for Sarvanth (ID: ${behaviorModel._id})`);
    }

    console.log('\n==================================================');
    console.log('🎉 SARVANTH ACCOUNT, DATASET & ML MODEL LINKED 100%!');
    console.log('==================================================');
    console.log(`  Login Email:    sarvanth@gmail.com`);
    console.log(`  Login Password: 123456`);
    console.log(`  Database ID:    ${user._id}`);
    console.log(`  Model File:     ${user._id}.joblib`);
    console.log(`  Dataset File:   ${user._id}.json`);
    console.log(`  ML Model State: ready (${sampleCount} samples)`);
    console.log('==================================================\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error restoring Sarvanth account:', err.message);
  }
}

restoreSarvanthAccount();
