const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function linkUserModel(userEmailOrId, customModelName = null) {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const User = require('./src/models/User');
    const BehaviorModel = require('./src/models/BehaviorModel');

    // 1. Find user by email or ObjectId
    let user;
    if (mongoose.Types.ObjectId.isValid(userEmailOrId)) {
      user = await User.findById(userEmailOrId);
    } else {
      user = await User.findOne({ email: userEmailOrId });
    }

    if (!user) {
      console.error(`❌ User '${userEmailOrId}' not found in MongoDB!`);
      await mongoose.disconnect();
      return;
    }

    console.log(`==================================================`);
    console.log(`🔗 LINKING ML MODEL TO USER ACCOUNT`);
    console.log(`==================================================`);
    console.log(`👤 User Name:    ${user.name}`);
    console.log(`📧 User Email:   ${user.email}`);
    console.log(`🆔 User ObjectId: ${user._id}`);

    const modelsDir = path.join(__dirname, '../behavioral-auth-ml-service/models');
    const targetModelPath = path.join(modelsDir, `${user._id}.joblib`);

    // 2. Locate trained .joblib file
    let sourceModelPath = targetModelPath;

    if (!fs.existsSync(sourceModelPath)) {
      // Check custom name if provided (e.g. vijay.joblib)
      const possibleNames = [
        customModelName,
        `${user.name.toLowerCase()}.joblib`,
        'vijay.joblib',
      ].filter(Boolean);

      for (const name of possibleNames) {
        const p = path.join(modelsDir, name.endsWith('.joblib') ? name : `${name}.joblib`);
        if (fs.existsSync(p)) {
          sourceModelPath = p;
          break;
        }
      }
    }

    if (fs.existsSync(sourceModelPath)) {
      if (sourceModelPath !== targetModelPath) {
        fs.copyFileSync(sourceModelPath, targetModelPath);
        console.log(`📁 Copied '${path.basename(sourceModelPath)}' -> '${path.basename(targetModelPath)}'`);
      } else {
        console.log(`📁 ML model file confirmed at '${path.basename(targetModelPath)}'`);
      }
    } else {
      console.warn(`⚠️ Warning: No .joblib model file found in ${modelsDir}`);
    }

    // 3. Upsert BehaviorModel in MongoDB
    let behaviorModel = await BehaviorModel.findOne({ student: user._id });

    if (!behaviorModel) {
      behaviorModel = new BehaviorModel({
        student: user._id,
        status: 'ready',
        modelPath: targetModelPath,
        trainedAt: new Date(),
        trainingWindowCount: 20,
        personalThreshold: 0.5,
      });
      await behaviorModel.save();
      console.log(`🧠 Created new BehaviorModel record in MongoDB (ID: ${behaviorModel._id})`);
    } else {
      behaviorModel.status = 'ready';
      behaviorModel.modelPath = targetModelPath;
      behaviorModel.trainedAt = new Date();
      await behaviorModel.save();
      console.log(`🧠 Updated existing BehaviorModel record in MongoDB (ID: ${behaviorModel._id})`);
    }

    console.log(`==================================================`);
    console.log(`✅ ML MODEL LINKING COMPLETE FOR ${user.email}!`);
    console.log(`==================================================\n`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error linking model:', err.message);
  }
}

// Execute for vijay@gmail.com by default
const target = process.argv[2] || 'vijay@gmail.com';
linkUserModel(target);
