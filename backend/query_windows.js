const mongoose = require('mongoose');

const checkDb = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
    const BehaviorWindow = require('./src/models/BehaviorWindow');
    const User = require('./src/models/User');

    const windows = await BehaviorWindow.find().sort({ createdAt: -1 }).limit(30).populate('student', 'name email');
    
    if (windows.length === 0) {
      console.log('No behavior windows found in the database.');
    } else {
      console.log(`Found ${windows.length} recent behavior windows:\n`);
      windows.forEach((w, i) => {
        console.log(`--- Window ${i + 1} ---`);
        console.log(`Student: ${w.student?.name} (${w.student?.email})`);
        console.log(`Context: ${w.context}`);
        console.log(`Time: ${w.windowStartTime.toISOString()} to ${w.windowEndTime.toISOString()}`);
        console.log(`Features:`, w.features);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error connecting to DB:', error);
    process.exit(1);
  }
};

checkDb();
