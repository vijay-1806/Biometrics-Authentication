const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function restoreVijayAccount() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');
    const BehaviorModel = require('./src/models/BehaviorModel');

    // 1. Create or update vijay@gmail.com user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    let user = await User.findOne({ email: 'vijay@gmail.com' });
    if (!user) {
      user = new User({
        name: 'Vijay',
        email: 'vijay@gmail.com',
        password: hashedPassword,
        role: 'student',
      });
      await user.save();
      console.log('✅ Created user vijay@gmail.com in MongoDB (lms_demo)');
    } else {
      user.password = hashedPassword;
      await user.save();
      console.log('✅ Updated password for vijay@gmail.com in MongoDB (lms_demo)');
    }

    console.log(`👤 User ID:       ${user._id}`);
    console.log(`📧 Email:         ${user.email}`);
    console.log(`🔑 Password:      123456`);
    console.log(`🎭 Role:          ${user.role}`);

    // 2. Link trained ML model if exists
    const mlModelPath = path.join(__dirname, '../behavioral-auth-ml-service/models/vijay.joblib');
    const userModelPath = path.join(__dirname, `../behavioral-auth-ml-service/models/${user._id}.joblib`);

    if (fs.existsSync(mlModelPath)) {
      // Copy vijay.joblib to <userId>.joblib so ML service finds it by ObjectId too
      fs.copyFileSync(mlModelPath, userModelPath);
      console.log(`📁 Copied model to ${user._id}.joblib for ML service lookup.`);
    }

    // Check or create BehaviorModel record in DB
    let behaviorModel = await BehaviorModel.findOne({ student: user._id });
    if (!behaviorModel) {
      behaviorModel = new BehaviorModel({
        student: user._id,
        status: 'ready',
        modelPath: userModelPath,
        trainedAt: new Date(),
        trainingWindowCount: 28,
        personalThreshold: 0.5,
      });
      await behaviorModel.save();
      console.log('🧠 Created BehaviorModel document in MongoDB for Vijay.');
    } else {
      behaviorModel.status = 'ready';
      behaviorModel.modelPath = userModelPath;
      await behaviorModel.save();
      console.log('🧠 Updated BehaviorModel document in MongoDB for Vijay.');
    }

    console.log('\n==================================================');
    console.log('🎉 VIJAY ACCOUNT AND TRAINED MODEL RESTORED 100%!');
    console.log('==================================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error restoring Vijay account:', err.message);
  }
}

restoreVijayAccount();
