const mongoose = require('mongoose');
const BehaviorWindow = require('../models/BehaviorWindow');
const BehaviorModel = require('../models/BehaviorModel');
const BehaviorSession = require('../models/BehaviorSession');
const BehaviorAlert = require('../models/BehaviorAlert');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const { broadcastAnomaly, broadcastLiveScore } = require('../socketHandler');

// URL of the Behavioral Auth API (the FastAPI service from phase 1).
// Move this to an env var (process.env.BEHAVIOR_API_URL) before deploying
// anywhere beyond localhost.
const BEHAVIOR_API_URL = 'http://127.0.0.1:8000';

const extractFeatures = (events) => {
  let keydowns = [];
  let keyups = [];
  let mousemoves = [];
  let clicks = 0;
  let blurs = 0;
  let backspaces = 0;

  events.forEach(e => {
    if (e.type === 'keydown') {
      keydowns.push(e);
      if (e.key === 'Backspace') backspaces++;
    }
    if (e.type === 'keyup') keyups.push(e);
    if (e.type === 'mousemove') mousemoves.push(e);
    if (e.type === 'click') clicks++;
    if ((e.type === 'visibilitychange' && (e.hidden || e.source)) || e.type === 'blur') blurs++;
  });

  // Dwell times (time between keydown and keyup for same key)
  let dwellTimes = [];
  let pendingKeydowns = {};
  events.forEach(e => {
    if (e.type === 'keydown') {
      pendingKeydowns[e.key] = e.timestamp;
    } else if (e.type === 'keyup') {
      if (pendingKeydowns[e.key]) {
        let dwell = e.timestamp - pendingKeydowns[e.key];
        if (dwell <= 2000) { // Outlier clipping
          dwellTimes.push(dwell);
        }
        delete pendingKeydowns[e.key];
      }
    }
  });

  // Flight times (time between consecutive keydowns)
  let flightTimes = [];
  for (let i = 0; i < keydowns.length - 1; i++) {
    let flight = keydowns[i+1].timestamp - keydowns[i].timestamp;
    if (flight <= 2000) { // Outlier clipping
      flightTimes.push(flight);
    }
  }

  // Mouse speeds & path curvature
  let mouseSpeeds = [];
  let pathCurvature = 0;
  let totalDistance = 0;
  let displacement = 0;

  if (mousemoves.length > 1) {
    for (let i = 0; i < mousemoves.length - 1; i++) {
      let dx = mousemoves[i+1].x - mousemoves[i].x;
      let dy = mousemoves[i+1].y - mousemoves[i].y;
      let dt = mousemoves[i+1].timestamp - mousemoves[i].timestamp;
      let dist = Math.sqrt(dx*dx + dy*dy);
      totalDistance += dist;
      if (dt > 0) {
        mouseSpeeds.push(dist / dt);
      }
    }
    let start = mousemoves[0];
    let end = mousemoves[mousemoves.length - 1];
    displacement = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    if (displacement > 0) {
      pathCurvature = totalDistance / displacement;
    } else if (totalDistance > 0) {
      pathCurvature = totalDistance;
    }
  }

  const mean = arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
  const std = (arr, m) => arr.length > 1 ? Math.sqrt(arr.reduce((a,b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1)) : 0;

  let dwellMean = mean(dwellTimes);
  let flightMean = mean(flightTimes);
  let mouseMean = mean(mouseSpeeds);

  const pasteEvents = events.filter(e => e.type === 'paste');
  const pasteCount = pasteEvents.length;
  const totalPastedChars = pasteEvents.reduce((sum, e) => sum + (e.length || 50), 0);

  return {
    biometricFeatures: {
      dwellTimeMean: dwellMean,
      dwellTimeStd: std(dwellTimes, dwellMean),
      flightTimeMean: flightMean,
      flightTimeStd: std(flightTimes, flightMean),
      typingSpeed: keydowns.length,
      backspaceRate: backspaces,
      mouseSpeedMean: mouseMean,
      mouseSpeedStd: std(mouseSpeeds, mouseMean),
      clickCount: clicks,
      pathCurvature: pathCurvature
    },
    explicitFlags: {
      tabBlurCount: blurs,
      pasteCount,
      totalPastedChars
    }
  };
};

const postWindow = async (req, res) => {
  // unchanged from before -- still used for non-exam ("general") telemetry,
  // still stores its own local feature summary for later analytics.
  try {
    const { events, session, windowStartTime, windowEndTime, context } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'Invalid payload: missing events array.' });
    }

    if (events.length > 10000) {
      return res.status(429).json({ message: 'Payload too large. Request rejected.' });
    }

    const hasTabBlur = events.some(e => (e.type === 'visibilitychange' && (e.hidden || e.source)) || e.type === 'blur');
    const hasPaste = events.some(e => e.type === 'paste');

    if (events.length <= 10 && !hasTabBlur && !hasPaste) {
      return res.status(200).json({ message: 'Window skipped (too few events).' });
    }

    if (!session || !context || !windowStartTime || !windowEndTime) {
      return res.status(400).json({ message: 'Missing required metadata fields.' });
    }

    const features = extractFeatures(events);

    const behaviorWindow = await BehaviorWindow.create({
      student: req.user._id,
      session: session,
      context: context,
      windowStartTime: new Date(windowStartTime),
      windowEndTime: new Date(windowEndTime),
      biometricFeatures: features.biometricFeatures,
      explicitFlags: features.explicitFlags
    });

    res.status(201).json({ message: 'Window processed.', data: behaviorWindow });
  } catch (error) {
    console.error('Error processing behavior window:', error);
    res.status(500).json({ message: 'Server error processing behavior window.' });
  }
};

// EXPLICIT CONSTRAINT: This function must NEVER block exam submission.
//
// CHANGED: instead of computing our own feature vector and calling a
// placeholder Python scorer at :5001/score with pre-computed features,
// this now forwards the RAW events straight to the Behavioral Auth API's
// /verify endpoint -- that service does its own feature extraction
// (dwell/flight/WPM/backspace + digraph timing) and returns a calibrated
// trust_score, risk_level, and action, using thresholds we've already
// tuned against real labeled test data (see evaluate.py in that project).
//
// We still run extractFeatures() locally for paste/tab-blur detection --
// those are explicit rule-based flags, not part of the ML trust score.
const scoreWindow = async (req, res) => {
  try {
    const { examId, events, deviceInfo } = req.body;
    const studentId = req.user._id;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'Invalid payload: missing events array.' });
    }

    const { explicitFlags } = extractFeatures(events);
    const hasTabBlur = (explicitFlags?.tabBlurCount || 0) > 0 || events.some(e => (e.type === 'visibilitychange' && (e.hidden || e.source)) || e.type === 'blur');
    const hasPaste = (explicitFlags?.pasteCount || 0) > 0 || events.some(e => e.type === 'paste');
    console.log(`[scoreWindow] student=${studentId} events=${events.length} explicitFlags=`, explicitFlags, `hasTabBlur=${hasTabBlur} hasPaste=${hasPaste}`);

    // Get or create session for student
    let session = null;
    const isValidExamId = examId && mongoose.Types.ObjectId.isValid(examId);
    const assessmentSessionId = req.body.assessmentSessionId;

    if (assessmentSessionId) {
      session = await BehaviorSession.findOne({ student: studentId, assessmentSessionId: assessmentSessionId });
    } else if (isValidExamId) {
      session = await BehaviorSession.findOne({ student: studentId, exam: examId });
    } else {
      session = await BehaviorSession.findOne({ student: studentId }).sort({ updatedAt: -1 });
    }

    if (!session) {
      session = new BehaviorSession({
        student: studentId,
        exam: isValidExamId ? examId : undefined,
        assessmentSessionId: assessmentSessionId || undefined,
        smoothedScore: 88.0,
        history: [88],
        totalWindowsScored: 0,
        tabBlurCount: 0,
        pasteCount: 0
      });
    }

    // Candidate idle / thinking pause (no tab blur & no paste)
    if (events.length <= 10 && !hasTabBlur && !hasPaste) {
      const currentScore = session.smoothedScore > 0 ? session.smoothedScore : 88.0;
      broadcastLiveScore(examId, studentId, {
        trustScore: currentScore,
        rollingAvgTrust: currentScore,
        smoothedScore: currentScore,
        riskLevel: 'low',
        action: 'allow',
        degraded: false,
        tabBlurCount: session.tabBlurCount || 0,
        pasteCount: session.pasteCount || 0,
        totalWindowsScored: session.totalWindowsScored
      }, session.assessmentSessionId || assessmentSessionId);

      return res.status(200).json({
        scored: true,
        degraded: false,
        mlState: 'active',
        smoothedScore: currentScore,
        trustScore: currentScore,
        action: 'allow',
        riskLevel: 'low',
        tabBlurCount: session.tabBlurCount || 0,
        pasteCount: session.pasteCount || 0,
        totalWindowsScored: session.totalWindowsScored
      });
    }

    const sessionString = req.body.session || (examId ? String(examId) : 'general');

    // Mid-session device change detection
    if (session.initialDeviceInfo && deviceInfo) {
      const changed =
        session.initialDeviceInfo.userAgent !== deviceInfo.userAgent ||
        Math.abs(session.initialDeviceInfo.screenWidth - deviceInfo.screenWidth) > 50;

      if (changed && !session.deviceChangeFlagged) {
        const alert = await BehaviorAlert.create({
          student: studentId,
          session: sessionString,
          exam: isValidExamId ? examId : undefined,
          alertType: 'device_change',
          topDeviatingFeatures: { from: session.initialDeviceInfo, to: deviceInfo },
          severity: 'low',
          reviewed: false
        });
        broadcastAnomaly(examId, studentId, alert);
        session.deviceChangeFlagged = true;
      }
    } else if (deviceInfo && !session.initialDeviceInfo) {
      session.initialDeviceInfo = deviceInfo;
    }

    // Copy-paste detection
    if (explicitFlags.pasteCount > 0) {
      session.pasteCount = (session.pasteCount || 0) + explicitFlags.pasteCount;
      const alert = await BehaviorAlert.create({
        student: studentId,
        exam: isValidExamId ? examId : undefined,
        session: sessionString,
        alertType: 'paste_detected',
        topDeviatingFeatures: {
          pasteCount: explicitFlags.pasteCount,
          totalPastedChars: explicitFlags.totalPastedChars
        },
        severity: 'medium',
        reviewed: false
      });
      broadcastAnomaly(examId, studentId, alert);
    }

    // Tab-switch detection
    if (explicitFlags.tabBlurCount > 0) {
      session.tabBlurCount = (session.tabBlurCount || 0) + explicitFlags.tabBlurCount;
      console.log(`[scoreWindow] TAB SWITCH detected! total=${session.tabBlurCount}`);
      const tabAlert = await BehaviorAlert.create({
        student: studentId,
        exam: isValidExamId ? examId : undefined,
        session: sessionString,
        alertType: 'tab_switch',
        topDeviatingFeatures: { tabBlurCount: explicitFlags.tabBlurCount },
        severity: 'low',
        reviewed: false
      });
      broadcastAnomaly(examId, studentId, tabAlert);
    }

    session.totalWindowsScored = (session.totalWindowsScored || 0) + 1;
    if (deviceInfo) session.deviceInfo = deviceInfo;

    // Format key events into the schema required by FastAPI (/verify & /enroll)
    const formattedEvents = events
      .filter(e => e.type === 'keydown' || e.type === 'keyup')
      .map(e => ({
        key: e.key,
        type: e.type === 'keydown' ? 'down' : 'up',
        t: e.timestamp
      }));

    // --- call the Behavioral Auth API with formatted events ---
    // FIX: previously fell back to the raw, unfiltered `events` array when
    // formattedEvents was empty (e.g. a tab-switch-only send with zero
    // actual keystrokes) -- that raw array contains mousemove/paste/
    // visibilitychange events which fail the Python API's Pydantic schema
    // (422 Unprocessable Entity) on nearly every request. We now just skip
    // the ML call entirely when there's not enough keystroke data, rather
    // than sending something guaranteed to fail. Local rule-based detection
    // above (paste/tab-switch/device-change) already ran regardless, so
    // this only affects the trust-score portion, not anomaly detection.
    //
    // ALSO FIXED: this whole block used to `return` early on API failure,
    // which meant that whenever /verify failed (which was almost always,
    // due to the bug above), the function exited BEFORE ever reaching the
    // session/device/paste/tab-switch code that used to live below this
    // block. That's the actual reason tab-switches were never counted --
    // not a detection bug, but the detection code never running at all.
    let verifyResult = null;
    if (formattedEvents.length >= 6) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(`${BEHAVIOR_API_URL}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: studentId.toString(), events: formattedEvents }),
          signal: controller.signal
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Behavior API returned ${response.status}: ${text}`);
        }
        verifyResult = await response.json();
      } catch (error) {
        const reason = error.name === 'AbortError' ? 'scorer_timeout' : 'scorer_unavailable';
        console.error(`Behavior API call failed [${reason}]:`, error.message);
        verifyResult = null; // fall through to the isCollecting fallback below instead of returning early
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const mlFailed = !verifyResult && formattedEvents.length >= 6;
    const isCollecting = (!verifyResult && !mlFailed) || (verifyResult && verifyResult.state === 'collecting');
    
    // 1. Determine Biometric ML Trust Score (from FastAPI IsolationForest model)
    let biometricScore = 90.0;
    if (!mlFailed && verifyResult && typeof verifyResult.trust_score === 'number') {
      biometricScore = verifyResult.trust_score;
    } else if (!mlFailed && verifyResult && typeof verifyResult.rolling_avg_trust === 'number') {
      biometricScore = verifyResult.rolling_avg_trust;
    } else if (session.smoothedScore > 0) {
      biometricScore = session.smoothedScore;
    }

    // 2. Immediate window-level penalty (applied only for events in THIS current window)
    const windowTabBlurPenalty = (explicitFlags.tabBlurCount || 0) * 15;
    const windowPastePenalty = (explicitFlags.pasteCount || 0) * 10;
    const windowPenalty = Math.min(30, windowTabBlurPenalty + windowPastePenalty);

    // 3. Compute final raw trust score for this window
    const rawScore = Math.max(15, Math.min(98, Math.round(biometricScore - windowPenalty)));

    // 4. Dynamic Risk Level: directly matches current real-time trust score & window anomalies!
    let calculatedRiskLevel = 'low';
    if (rawScore < 40) {
      calculatedRiskLevel = 'critical';
    } else if (rawScore < 55) {
      calculatedRiskLevel = 'high';
    } else if (rawScore < 70 || windowPenalty > 0) {
      calculatedRiskLevel = 'medium';
    } else {
      calculatedRiskLevel = 'low';
    }

    const finalRiskLevel = calculatedRiskLevel;
    const finalAction = finalRiskLevel === 'critical' ? 'deny' : (finalRiskLevel === 'high' ? 'step_up' : 'allow');

    // 5. Update session smoothed score & trajectory history
    if (session.totalWindowsScored <= 1 || session.smoothedScore === 0) {
      session.smoothedScore = rawScore;
    } else {
      session.smoothedScore = Math.round(0.3 * session.smoothedScore + 0.7 * rawScore);
    }

    session.history.push(session.smoothedScore);
    if (session.history.length > 20) session.history.shift();

    const now = req.body.mockTime || Date.now();

    // Behavioral anomaly alert
    if (!mlFailed && !isCollecting && (verifyResult?.action === 'deny' || verifyResult?.action === 'step_up') && !session.alreadyFlaggedRecently) {
      await BehaviorAlert.create({
        student: studentId,
        session: sessionString,
        exam: isValidExamId ? examId : undefined,
        alertType: 'behavioral_anomaly',
        score: session.smoothedScore,
        topDeviatingFeatures: [verifyResult?.reason || 'Trust score below threshold'],
        deviceInfo: deviceInfo || session.deviceInfo,
        severity: verifyResult?.action === 'deny' ? 'high' : 'medium',
        reviewed: false
      });

      session.alreadyFlaggedRecently = true;
      session.flagTimeoutEnd = new Date(now + 60000);
    }

    if (session.alreadyFlaggedRecently && session.flagTimeoutEnd && new Date(now) > session.flagTimeoutEnd) {
      session.alreadyFlaggedRecently = false;
      session.flagTimeoutEnd = null;
    }

    await session.save();

    // Push live update every window
    broadcastLiveScore(examId, studentId, {
      trustScore: rawScore,
      rollingAvgTrust: rawScore,
      smoothedScore: session.smoothedScore,
      riskLevel: finalRiskLevel,
      action: finalAction,
      degraded: mlFailed,
      tabBlurCount: session.tabBlurCount || 0,
      pasteCount: session.pasteCount || 0,
      totalWindowsScored: session.totalWindowsScored
    }, session.assessmentSessionId || assessmentSessionId);

    return res.status(200).json({
      scored: true,
      degraded: mlFailed,
      mlState: mlFailed ? 'DEGRADED' : (isCollecting ? 'collecting' : 'active'),
      smoothedScore: session.smoothedScore,
      trustScore: rawScore,
      action: finalAction,
      riskLevel: finalRiskLevel,
      tabBlurCount: session.tabBlurCount || 0,
      pasteCount: session.pasteCount || 0,
      totalWindowsScored: session.totalWindowsScored
    });
  } catch (error) {
    console.error('Error in scoreWindow:', error);
    res.status(500).json({ scored: false, reason: 'internal_error', message: error.message });
  }
};

const listAlerts = async (req, res) => {
  try {
    const { reviewed, examId } = req.query;
    const filter = {};
    if (reviewed !== undefined) filter.reviewed = reviewed === 'true';

    if (req.user.role === 'teacher') {
      const courses = await Course.find({ teacher: req.user._id }).select('_id');
      const courseIds = courses.map(c => c._id);
      const quizzes = await Quiz.find({ course: { $in: courseIds } }).select('_id');
      const quizIds = quizzes.map(q => q._id.toString());

      if (examId) {
        if (!quizIds.includes(examId)) return res.status(403).json({ error: 'Unauthorized to view this exam' });
        filter.exam = examId;
      } else {
        filter.exam = { $in: quizIds };
      }
    } else if (examId) {
      filter.exam = examId;
    }

    const alerts = await BehaviorAlert.find(filter)
      .populate('student', 'name email')
      .populate('exam', 'title')
      .sort({ severity: -1, createdAt: -1 })
      .lean()
      .limit(200);

    res.json(alerts);
  } catch (error) {
    console.error('Error in listAlerts:', error);
    res.status(500).json({ error: 'Server error retrieving alerts' });
  }
};

const updateAlert = async (req, res) => {
  try {
    const { reviewed, reviewerNote } = req.body;
    const alert = await BehaviorAlert.findByIdAndUpdate(
      req.params.id,
      { $set: { reviewed, reviewerNote, reviewedBy: req.user._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    console.error('Error in updateAlert:', error);
    res.status(500).json({ error: 'Server error updating alert' });
  }
};

const enrollPassage = async (req, res) => {
  try {
    const { events } = req.body;
    const studentId = req.user._id.toString();

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'Missing events array for enrollment' });
    }

    const formattedEvents = events
      .filter(e => e.type === 'keydown' || e.type === 'keyup' || e.type === 'down' || e.type === 'up')
      .map(e => ({
        key: e.key,
        type: e.type === 'keydown' || e.type === 'down' ? 'down' : 'up',
        t: e.t || e.timestamp
      }));

    const response = await fetch(`${BEHAVIOR_API_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: studentId, events: formattedEvents })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ message: errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in enrollPassage:', error);
    res.status(500).json({ message: 'Failed to communicate with Enrollment API' });
  }
};

const getBiometricStatus = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user._id.toString();
    const response = await fetch(`${BEHAVIOR_API_URL}/users/${studentId}/status`);
    if (!response.ok) {
      return res.status(200).json({ state: 'collecting', samples_collected: 0 });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in getBiometricStatus:', error);
    res.status(200).json({ state: 'collecting', samples_collected: 0 });
  }
};

const getPassage = async (req, res) => {
  try {
    const kind = req.params.kind || 'enroll';
    const response = await fetch(`${BEHAVIOR_API_URL}/passage/${kind}`);
    if (!response.ok) {
      return res.status(500).json({ message: 'Failed to fetch passage' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in getPassage:', error);
    res.status(500).json({ message: 'Error fetching passage text' });
  }
};

const retrainUser = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user._id.toString();
    const force = req.query.force || 'true';
    const response = await fetch(`${BEHAVIOR_API_URL}/users/${studentId}/retrain?force=${force}`, {
      method: 'POST'
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ message: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in retrainUser:', error);
    res.status(500).json({ message: 'Failed to trigger model retraining' });
  }
};

const getSessionReport = async (req, res) => {
  try {
    const { assessmentSessionId } = req.params;
    let targetStudentId = req.query.studentId || req.user._id.toString();

    // Authorization Check
    if (req.user.role === 'student') {
      if (targetStudentId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied: Students may only view their own report.' });
      }
    }

    const sessionDoc = await BehaviorSession.findOne({
      student: targetStudentId,
      assessmentSessionId: assessmentSessionId
    }).populate('student', 'name email');

    if (!sessionDoc) {
      return res.status(404).json({ error: 'Behavioral session record not found for this assessment session.' });
    }

    const alerts = await BehaviorAlert.find({
      student: targetStudentId,
      $or: [{ session: assessmentSessionId }, { exam: sessionDoc.exam }]
    }).sort({ createdAt: 1 }).lean();

    const history = sessionDoc.history || [];
    const initialTrust = history.length > 0 ? history[0] : sessionDoc.smoothedScore;
    const finalTrust = sessionDoc.smoothedScore;
    const avgTrust = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : finalTrust;
    const minTrust = history.length > 0 ? Math.min(...history) : finalTrust;
    const maxTrust = history.length > 0 ? Math.max(...history) : finalTrust;

    let highestRisk = 'LOW';
    const transitions = [];
    let currentRisk = 'LOW';

    alerts.forEach(alert => {
      let nextRisk = 'LOW';
      if (alert.severity === 'high' || alert.alertType === 'behavioral_anomaly') nextRisk = 'HIGH';
      else if (alert.severity === 'medium' || alert.alertType === 'paste_detected') nextRisk = 'MEDIUM';
      else if (alert.alertType === 'tab_switch' || alert.alertType === 'device_change') nextRisk = 'LOW';

      if (nextRisk === 'HIGH') highestRisk = 'HIGH';
      else if (nextRisk === 'MEDIUM' && highestRisk !== 'HIGH') highestRisk = 'MEDIUM';

      if (nextRisk !== currentRisk) {
        transitions.push({
          timestamp: alert.createdAt,
          from: currentRisk,
          to: nextRisk,
          trustScore: alert.score ?? finalTrust,
          reason: alert.alertType.replace('_', ' ').toUpperCase()
        });
        currentRisk = nextRisk;
      }
    });

    let verdictStatus = 'AUTHENTICATED';
    const verdictReasons = [];

    if (finalTrust >= 75 && sessionDoc.tabBlurCount === 0 && sessionDoc.pasteCount === 0) {
      verdictStatus = 'AUTHENTICATED';
      verdictReasons.push('High behavioral baseline match maintained throughout assessment');
    } else if (finalTrust >= 40 && sessionDoc.tabBlurCount <= 2 && sessionDoc.pasteCount <= 1) {
      verdictStatus = 'REQUIRES_REVIEW';
      if (sessionDoc.tabBlurCount > 0) verdictReasons.push(`${sessionDoc.tabBlurCount} tab switch event(s) recorded`);
      if (sessionDoc.pasteCount > 0) verdictReasons.push(`${sessionDoc.pasteCount} paste operation(s) recorded`);
      if (finalTrust < 70) verdictReasons.push(`Behavioral trust score dropped to ${finalTrust}%`);
    } else {
      verdictStatus = 'SUSPICIOUS';
      if (sessionDoc.tabBlurCount > 2) verdictReasons.push(`Excessive tab switches (${sessionDoc.tabBlurCount})`);
      if (sessionDoc.pasteCount > 1) verdictReasons.push(`Multiple paste events (${sessionDoc.pasteCount})`);
      if (finalTrust < 40) verdictReasons.push(`Severe behavioral anomaly detected (${finalTrust}% trust)`);
    }

    res.json({
      assessmentSessionId,
      student: {
        id: sessionDoc.student._id,
        name: sessionDoc.student.name,
        email: sessionDoc.student.email
      },
      session: {
        status: sessionDoc.updatedAt ? 'ENDED' : 'ACTIVE',
        updatedAt: sessionDoc.updatedAt,
        totalWindowsScored: sessionDoc.totalWindowsScored || 0
      },
      trust: {
        initial: initialTrust,
        final: finalTrust,
        average: avgTrust,
        minimum: minTrust,
        maximum: maxTrust,
        history: history.length > 0 ? history : [finalTrust]
      },
      risk: {
        initial: 'LOW',
        final: currentRisk,
        highest: highestRisk,
        transitions
      },
      security: {
        tabSwitches: sessionDoc.tabBlurCount || 0,
        pasteEvents: sessionDoc.pasteCount || 0
      },
      behaviour: {
        anomalyCount: alerts.filter(a => a.alertType === 'behavioral_anomaly').length,
        totalAlerts: alerts.length
      },
      verdict: {
        status: verdictStatus,
        reasons: verdictReasons
      }
    });

  } catch (error) {
    console.error('Error in getSessionReport:', error);
    res.status(500).json({ error: 'Server error generating candidate session report' });
  }
};

const getTeacherAnalytics = async (req, res) => {
  try {
    const { assessmentSessionId } = req.params;

    const sessions = await BehaviorSession.find({ assessmentSessionId })
      .populate('student', 'name email')
      .lean();

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ error: 'No sessions found for this assessment session ID.' });
    }

    const alerts = await BehaviorAlert.find({ session: assessmentSessionId }).lean();

    const candidateSummaries = sessions.map(s => {
      const finalTrust = s.smoothedScore || 85;
      let riskLevel = 'LOW';
      if (s.tabBlurCount > 2 || s.pasteCount > 1 || finalTrust < 40) riskLevel = 'HIGH';
      else if (s.tabBlurCount > 0 || s.pasteCount > 0 || finalTrust < 70) riskLevel = 'MEDIUM';

      return {
        studentId: s.student._id,
        name: s.student.name,
        email: s.student.email,
        trustScore: finalTrust,
        riskLevel,
        tabSwitches: s.tabBlurCount || 0,
        pasteEvents: s.pasteCount || 0,
        windowsScored: s.totalWindowsScored || 0,
        lastSeen: s.updatedAt
      };
    });

    const totalParticipants = candidateSummaries.length;
    const scores = candidateSummaries.map(c => c.trustScore);
    const avgTrust = Math.round(scores.reduce((a, b) => a + b, 0) / totalParticipants);
    const minTrust = Math.min(...scores);
    const maxTrust = Math.max(...scores);

    const riskDistribution = {
      LOW: candidateSummaries.filter(c => c.riskLevel === 'LOW').length,
      MEDIUM: candidateSummaries.filter(c => c.riskLevel === 'MEDIUM').length,
      HIGH: candidateSummaries.filter(c => c.riskLevel === 'HIGH').length,
      CRITICAL: candidateSummaries.filter(c => c.riskLevel === 'CRITICAL').length
    };

    const totalTabSwitches = candidateSummaries.reduce((acc, c) => acc + c.tabSwitches, 0);
    const totalPasteEvents = candidateSummaries.reduce((acc, c) => acc + c.pasteEvents, 0);

    res.json({
      assessmentSessionId,
      participants: {
        total: totalParticipants,
        connected: totalParticipants,
        completed: sessions.filter(s => s.updatedAt).length
      },
      trust: {
        average: avgTrust,
        minimum: minTrust,
        maximum: maxTrust
      },
      riskDistribution,
      security: {
        totalTabSwitches,
        totalPasteEvents,
        totalAlerts: alerts.length
      },
      candidates: candidateSummaries
    });

  } catch (error) {
    console.error('Error in getTeacherAnalytics:', error);
    res.status(500).json({ error: 'Server error generating teacher assessment analytics' });
  }
};

module.exports = {
  postWindow,
  scoreWindow,
  extractFeatures,
  listAlerts,
  updateAlert,
  enrollPassage,
  getBiometricStatus,
  getPassage,
  retrainUser,
  getSessionReport,
  getTeacherAnalytics
};
