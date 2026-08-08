const mongoose = require('mongoose');

const replay = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    
    // Dynamically load models
    const User = require('./src/models/User');
    const BehaviorWindow = require('./src/models/BehaviorWindow');
    const BehaviorAlert = require('./src/models/BehaviorAlert');
    const BehaviorModel = require('./src/models/BehaviorModel');
    const BehaviorSession = require('./src/models/BehaviorSession');

    // Find our two test students
    const studentA = await User.findOne({ email: 'studentA@gmail.com' });
    const studentB = await User.findOne({ email: 'studentB@gmail.com' });

    if (!studentA || !studentB) {
      console.log('Test students not found.');
      process.exit(1);
    }

    console.log(`Replaying Student B (${studentB.email}) windows onto Student A (${studentA.email}) model...`);

    // Fetch Student B's historical windows
    const windowsB = await BehaviorWindow.find({ student: studentB._id }).lean().limit(5);

    // Mock an exam ID
    const examId = new mongoose.Types.ObjectId();

    // Replay against Student A's model
    // We will simulate the Controller logic directly to bypass HTTP/Auth setup for this test script
    const { scoreWindow } = require('./src/controllers/behaviorController');
    
    let startTime = Date.now();
    let simulatedTime = startTime;
    const NUM_WINDOWS = 40; // 40 windows * 5s = 200 seconds (~3.3 minutes)

    for (let i = 0; i < NUM_WINDOWS; i++) {
      // Loop through the 5 real historical windows repeatedly
      const w = windowsB[i % windowsB.length];
      
      // Map old DB structure to new structure if necessary
      const biometricFeatures = w.biometricFeatures || w.features;
      const explicitFlags = w.explicitFlags || { pasteCount: 0, totalPastedChars: 0, tabBlurCount: 0 };

      const req = {
        user: { _id: studentA._id.toString() },
        body: {
          examId: examId.toString(),
          overrideFeatures: { biometricFeatures, explicitFlags },
          mockTime: simulatedTime
        }
      };

      const res = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { /* suppressing console output to keep it clean */ }
      };

      let previousAlerts = await BehaviorAlert.countDocuments({ student: studentA._id, exam: examId });
      await scoreWindow(req, res);
      let newAlerts = await BehaviorAlert.countDocuments({ student: studentA._id, exam: examId });
      
      if (newAlerts > previousAlerts) {
        console.log(`> Alert FIRED at window ${i + 1} (simulated time: +${(simulatedTime - startTime) / 1000}s)`);
      }
      
      simulatedTime += 5000; // Advance time by 5 seconds per window
    }

    const alerts = await BehaviorAlert.find({ student: studentA._id, exam: examId }).sort({ createdAt: 1 });
    console.log(`\nSustained Anomaly Test (40 windows = ~3.3 minutes):`);
    console.log(`Total Alerts Generated: ${alerts.length}`);

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
};

replay();
