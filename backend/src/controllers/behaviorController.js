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
    if ((e.type === 'visibilitychange' && e.hidden) || e.type === 'blur') blurs++;
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
  const totalPastedChars = pasteEvents.reduce((sum, e) => sum + e.length, 0);

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

    const hasTabBlur = events.some(e => e.type === 'visibilitychange' && e.hidden);

    if (events.length <= 10 && !hasTabBlur) {
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

    const hasTabBlur = events.some(e => (e.type === 'visibilitychange' && (e.hidden || e.source)) || e.type === 'blur');
    const hasPaste = events.some(e => e.type === 'paste');
    console.log(`[scoreWindow] student=${studentId} events=${events.length} hasTabBlur=${hasTabBlur} hasPaste=${hasPaste}`);

    if (events.length <= 10 && !hasTabBlur && !hasPaste) {
      return res.status(200).json({ scored: false, reason: 'too_few_events' });
    }

    // local, rule-based flags (paste / tab-switch) -- unrelated to the ML score
    const { explicitFlags } = extractFeatures(events);
    console.log(`[scoreWindow] explicitFlags:`, explicitFlags);

    // Get or create session for student
    let session = null;
    if (examId) {
      session = await BehaviorSession.findOne({ student: studentId, exam: examId });
    }
    if (!session) {
      session = await BehaviorSession.findOne({ student: studentId }).sort({ updatedAt: -1 });
    }
    if (!session) {
      session = new BehaviorSession({ student: studentId, exam: examId, smoothedScore: 0.0, history: [], totalWindowsScored: 0 });
    }

    // Mid-session device change detection
    if (session.initialDeviceInfo && deviceInfo) {
      const changed =
        session.initialDeviceInfo.userAgent !== deviceInfo.userAgent ||
        Math.abs(session.initialDeviceInfo.screenWidth - deviceInfo.screenWidth) > 50;

      if (changed && !session.deviceChangeFlagged) {
        const alert = await BehaviorAlert.create({
          student: studentId,
          session: req.body.session || examId.toString(),
          exam: examId,
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
        exam: examId,
        session: req.body.session || examId.toString(),
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
        exam: examId,
        session: req.body.session || (examId ? examId.toString() : sessionId.current),
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

    const isCollecting = !verifyResult || verifyResult.state === 'collecting';
    const rawScore = isCollecting ? 85.0 : (verifyResult.trust_score ?? verifyResult.rolling_avg_trust ?? 75);

    if (session.totalWindowsScored <= 1 || session.smoothedScore === 0) {
      session.smoothedScore = rawScore;
    } else {
      session.smoothedScore = Math.round(0.3 * session.smoothedScore + 0.7 * rawScore);
    }
    session.history.push(session.smoothedScore);
    if (session.history.length > 20) session.history.shift();

    const now = req.body.mockTime || Date.now();

    // Behavioral anomaly alert
    if (!isCollecting && (verifyResult.action === 'deny' || verifyResult.action === 'step_up') && !session.alreadyFlaggedRecently) {
      await BehaviorAlert.create({
        student: studentId,
        session: req.body.session || examId.toString(),
        exam: examId,
        alertType: 'behavioral_anomaly',
        score: session.smoothedScore,
        topDeviatingFeatures: [verifyResult.reason || 'Trust score below threshold'],
        deviceInfo: deviceInfo || session.deviceInfo,
        severity: verifyResult.action === 'deny' ? 'high' : 'medium',
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

    // Push live update every window (even during collecting state) so tab-switches and pastes render live
    broadcastLiveScore(examId, studentId, {
      trustScore: isCollecting ? 85.0 : verifyResult.trust_score,
      rollingAvgTrust: isCollecting ? 85.0 : verifyResult.rolling_avg_trust,
      smoothedScore: session.smoothedScore,
      riskLevel: isCollecting ? 'low' : verifyResult.risk_level,
      action: isCollecting ? 'allow' : verifyResult.action,
      tabBlurCount: session.tabBlurCount || 0,
      pasteCount: session.pasteCount || 0,
      totalWindowsScored: session.totalWindowsScored
    });

    res.status(200).json({ scored: true, smoothed: session.smoothedScore, action: isCollecting ? 'allow' : verifyResult.action });
  } catch (error) {
    console.error('Error in scoreWindow:', error);
    res.status(500).json({ scored: false, reason: 'internal_error' });
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

module.exports = {
  postWindow,
  scoreWindow,
  extractFeatures,
  listAlerts,
  updateAlert,
  enrollPassage,
  getBiometricStatus,
  getPassage,
  retrainUser
};
