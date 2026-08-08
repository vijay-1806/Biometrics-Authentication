const mongoose = require('mongoose');
const BehaviorSession = require('./src/models/BehaviorSession');
const BehaviorAlert = require('./src/models/BehaviorAlert');
const BehaviorModel = require('./src/models/BehaviorModel');
const User = require('./src/models/User');
const BehaviorWindow = require('./src/models/BehaviorWindow');
const { scoreWindow } = require('./src/controllers/behaviorController');
const fs = require('fs');

async function runReplayAttackCheck() {
  try {
    const studentA = await User.findOne({ email: 'studentA@gmail.com' });
    const studentB = await User.findOne({ email: 'studentB@gmail.com' });
    if (!studentA || !studentB) return 'Students not found for replay';

    const windowsB = await BehaviorWindow.find({ student: studentB._id }).limit(5);
    const examId = new mongoose.Types.ObjectId();

    await BehaviorSession.deleteMany({ student: studentA._id, exam: examId });
    await BehaviorAlert.deleteMany({ student: studentA._id, exam: examId });

    for (let i = 0; i < windowsB.length; i++) {
      const w = windowsB[i];
      const req = {
        body: {
          studentId: studentA._id.toString(),
          examId: examId.toString(),
          overrideFeatures: w.features
        }
      };
      const res = { status: () => res, json: () => {} };
      await scoreWindow(req, res);
    }
    
    const alerts = await BehaviorAlert.find({ student: studentA._id, exam: examId });
    if (alerts.length > 0) {
      const lastAlert = alerts[alerts.length - 1];
      return `PASS (Alert Triggered with score ${lastAlert.score.toFixed(4)})`;
    }
    return 'FAIL (No Alert Triggered - FNR Risk!)';
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

async function generateReport(startDate, endDate) {
  await mongoose.connect('mongodb://127.0.0.1:27017/lms_demo');
  console.log(`Generating Shadow Mode Report from ${startDate.toISOString()} to ${endDate.toISOString()}...\n`);

  // Exclude test accounts from aggregation to prevent contamination
  const testStudentEmails = ['studentA@gmail.com', 'studentB@gmail.com'];
  const testStudents = await User.find({ email: { $in: testStudentEmails } });
  const testStudentIds = new Set(testStudents.map(u => u._id.toString()));

  const filteredSessions = sessions.filter(s => !testStudentIds.has(s.student.toString()));
  const filteredAlerts = alerts.filter(a => !testStudentIds.has(a.student.toString()));
  
  const models = await BehaviorModel.find({ status: 'ready', student: { $nin: Array.from(testStudentIds) } }).populate('student');

  // 1. Session-Level FRR
  const alertedSessionIds = new Set(filteredAlerts.map(a => a.session));
  const sessionsWithAlert = filteredSessions.filter(s => alertedSessionIds.has(s.exam.toString()) || alertedSessionIds.has(s._id.toString())).length;
  const sessionLevelFRR = filteredSessions.length > 0 ? (sessionsWithAlert / filteredSessions.length) * 100 : 0;

  // 2. Window-Level Alert Rate
  let totalWindows = 0;
  filteredSessions.forEach(s => totalWindows += (s.totalWindowsScored || 0));
  const windowLevelAlertRate = totalWindows > 0 ? (filteredAlerts.length / totalWindows) * 100 : 0;

  // 3. Baseline Model Quality (from Python training)
  const perStudentModelQuality = models.map(m => ({
    student: m.student.email,
    baselineNormalRate: m.baselineNormalRate ? (m.baselineNormalRate * 100).toFixed(1) + '%' : 'N/A'
  }));

  // 4. High Alert Outliers (> 5 alerts in one session)
  const alertCountsBySession = {};
  filteredAlerts.forEach(a => {
    const key = a.session;
    alertCountsBySession[key] = (alertCountsBySession[key] || 0) + 1;
  });
  const highAlertOutliers = Object.keys(alertCountsBySession).filter(k => alertCountsBySession[k] > 5).map(k => ({
    session: k,
    alertCount: alertCountsBySession[k]
  }));

  // 5. Feature Histogram
  const featureHistogram = {};
  filteredAlerts.forEach(a => {
    a.topDeviatingFeatures.forEach(featStr => {
      // String format: "mouseSpeedMean (z: -0.93)"
      const baseFeature = featStr.split(' ')[0];
      featureHistogram[baseFeature] = (featureHistogram[baseFeature] || 0) + 1;
    });
  });

  // 6. FNR Regression Check
  const replayResult = await runReplayAttackCheck();

  const report = {
    metadata: {
      generatedAt: new Date(),
      totalSessionsScored: filteredSessions.length,
      totalWindowsScored: totalWindows,
      totalAlerts: filteredAlerts.length
    },
    metrics: {
      sessionLevelFRR: `${sessionLevelFRR.toFixed(2)}%`,
      windowLevelAlertRate: `${windowLevelAlertRate.toFixed(2)}%`,
    },
    highAlertOutliers,
    featureHistogram,
    perStudentModelQuality,
    replayRegressionCheck: replayResult
  };

  fs.writeFileSync('shadow_report.json', JSON.stringify(report, null, 2));

  console.log('=== Shadow Mode Report ===');
  console.log(`Total Sessions: ${report.metadata.totalSessionsScored}`);
  console.log(`Total Windows Scored: ${report.metadata.totalWindowsScored}`);
  console.log(`Session-Level FRR: ${report.metrics.sessionLevelFRR}`);
  console.log(`Window-Level Alert Rate: ${report.metrics.windowLevelAlertRate}`);
  console.log(`FNR Regression Check (Replay Attack): ${report.replayRegressionCheck}`);
  
  if (highAlertOutliers.length > 0) {
    console.log(`\nWARNING: Found ${highAlertOutliers.length} session(s) with > 5 alerts.`);
  }

  console.log('\nTop Deviating Features causing alerts:');
  Object.keys(featureHistogram).sort((a,b) => featureHistogram[b] - featureHistogram[a]).forEach(k => {
    console.log(`- ${k}: ${featureHistogram[k]}`);
  });

  console.log('\nFull JSON saved to shadow_report.json');
  process.exit(0);
}

// Run for the last 30 days
const end = new Date();
const start = new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
generateReport(start, end).catch(console.error);
