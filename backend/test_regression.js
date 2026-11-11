const mongoose = require('mongoose');
const { extractFeatures } = require('./src/controllers/behaviorController');
require('dotenv').config();

async function runRegressionTest() {
  console.log(`\n--- Regression Test: Feature Extraction Shape & Outlier Clipping ---\n`);

  // Generate synthetic events with one huge outlier (>2000ms)
  const syntheticEvents = [
    { type: 'keydown', key: 'a', timestamp: 1000 },
    { type: 'keyup', key: 'a', timestamp: 4000 }, // Dwell time: 3000ms (should be clipped!)
    
    { type: 'keydown', key: 'b', timestamp: 4500 }, // Flight time: 500ms
    { type: 'keyup', key: 'b', timestamp: 4600 },   // Dwell time: 100ms
    
    { type: 'mousemove', x: 100, y: 100, timestamp: 4700 },
    { type: 'mousemove', x: 200, y: 200, timestamp: 4800 },
    
    { type: 'click', timestamp: 4900 },
    
    { type: 'paste', length: 50, timestamp: 4950 } // Feature A: paste event
  ];

  // We need to bypass the 10-event threshold for this test, so we simulate a tab blur
  syntheticEvents.push({ type: 'visibilitychange', hidden: true, timestamp: 4960 });

  // Call the refactored extractFeatures
  const features = extractFeatures(syntheticEvents);

  console.log(`1. Exact Shape of biometricFeatures (sent to SVM):`);
  console.log(JSON.stringify(features.biometricFeatures, null, 2));
  
  const numColumns = Object.keys(features.biometricFeatures).length;
  console.log(`\n-> Column count: ${numColumns} (Expected: 10)`);

  console.log(`\n2. Exact Shape of explicitFlags (NOT sent to SVM):`);
  console.log(JSON.stringify(features.explicitFlags, null, 2));

  console.log(`\n3. Outlier Clipping Verification:`);
  console.log(`-> Dwell Time Mean: ${features.biometricFeatures.dwellTimeMean}ms`);
  
  if (features.biometricFeatures.dwellTimeMean === 100) {
    console.log(`   [PASS] The 3000ms outlier was successfully clipped! The mean only used the 100ms event.`);
  } else {
    console.log(`   [FAIL] The outlier was NOT clipped. Mean is ${features.biometricFeatures.dwellTimeMean}`);
  }

  process.exit(0);
}

runRegressionTest();
