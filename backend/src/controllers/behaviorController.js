const BehaviorWindow = require('../models/BehaviorWindow');
const BehaviorModel = require('../models/BehaviorModel');
const BehaviorSession = require('../models/BehaviorSession');
const BehaviorAlert = require('../models/BehaviorAlert');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const { broadcastAnomaly, broadcastLiveScore } = require('../socketHandler');

// URL and API Key for Behavioral Auth API Service
const BEHAVIOR_API_URL = process.env.BEHAVIOR_API_URL || 'http://127.0.0.1:8000';
const BEHAVIOR_API_KEY = process.env.BEHAVIOR_API_KEY || 'bio_live_default_lms_key';

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
    if ((e.type === 'visibilitychange' && e.hidden) || e.type === 'blur' || e.type === 'window_blur') blurs++;
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
  const totalPastedChars = pasteEvents.reduce((sum, e) => sum + (e.length || 0), 0);

  const copyEvents = events.filter(e => e.type === 'copy');
  const copyCount = copyEvents.length;
  const totalCopiedChars = copyEvents.reduce((sum, e) => sum + (e.length || 0), 0);

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
      totalPastedChars,
      copyCount,
      totalCopiedChars
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

    const hasTabBlur = events.some(e => (e.type === 'visibilitychange' && e.hidden) || e.type === 'blur' || e.type === 'window_blur');
    const hasPaste = events.some(e => e.type === 'paste');
    const hasCopy = events.some(e => e.type === 'copy');
    const hasExplicitViolation = hasTabBlur || hasPaste || hasCopy;

    if (events.length <= 10 && !hasExplicitViolation) {
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

    // Extract local rule-based flags (paste / copy / tab-switch)
    const { explicitFlags } = extractFeatures(events);
    const hasExplicitViolation = explicitFlags.tabBlurCount > 0 || explicitFlags.pasteCount > 0 || explicitFlags.copyCount > 0;

    if (events.length <= 10 && !hasExplicitViolation && !req.body.scoreData && !req.body.modelState) {
      return res.status(200).json({ scored: false, reason: 'too_few_events' });
    }

    // 1. Get or create session scoped by sessionToken so previous sessions never bleed over
    let session = null;
    const sessionToken = req.body.session;
    if (examId) {
      if (sessionToken) {
        session = await BehaviorSession.findOne({ student: studentId, exam: examId, session: sessionToken });
      } else {
        session = await BehaviorSession.findOne({ student: studentId, exam: examId }).sort({ createdAt: -1 });
      }

      if (!session) {
        session = new BehaviorSession({
          student: studentId,
          exam: examId,
          session: sessionToken || 'default_session',
          smoothedScore: 0.0,
          history: [],
          totalWindowsScored: 0,
          tabBlurCount: 0,
          pasteCount: 0,
          copyCount: 0
        });
      }
    }

    // 2. Accumulate violation counts in session
    if (session) {
      if (explicitFlags.tabBlurCount > 0) {
        session.tabBlurCount = (session.tabBlurCount || 0) + explicitFlags.tabBlurCount;
      }
      if (explicitFlags.pasteCount > 0) {
        session.pasteCount = (session.pasteCount || 0) + explicitFlags.pasteCount;
      }
      if (explicitFlags.copyCount > 0) {
        session.copyCount = (session.copyCount || 0) + explicitFlags.copyCount;
      }
    }

    // 3. Rule-based alerts -- ALWAYS execute immediately, completely independent of ML model state!

    // Mid-session device change detection
    if (session && session.initialDeviceInfo && deviceInfo) {
      const changed =
        session.initialDeviceInfo.userAgent !== deviceInfo.userAgent ||
        Math.abs(session.initialDeviceInfo.screenWidth - deviceInfo.screenWidth) > 50;

      if (changed && !session.deviceChangeFlagged) {
        const alert = await BehaviorAlert.create({
          student: studentId,
          session: req.body.session || (examId ? examId.toString() : 'exam_session'),
          exam: examId ? examId.toString() : undefined,
          alertType: 'device_change',
          topDeviatingFeatures: { from: session.initialDeviceInfo, to: deviceInfo },
          severity: 'low',
          reviewed: false
        });
        if (examId) broadcastAnomaly(examId, studentId, alert);
        session.deviceChangeFlagged = true;
      }
    } else if (session && deviceInfo && !session.initialDeviceInfo) {
      session.initialDeviceInfo = deviceInfo;
    }

    // Copy-paste detection
    if (explicitFlags.pasteCount > 0) {
      const alert = await BehaviorAlert.create({
        student: studentId,
        exam: examId ? examId.toString() : undefined,
        session: req.body.session || (examId ? examId.toString() : 'exam_session'),
        alertType: 'paste_detected',
        topDeviatingFeatures: {
          pasteCount: explicitFlags.pasteCount,
          totalPastedChars: explicitFlags.totalPastedChars
        },
        severity: 'medium',
        reviewed: false
      });
      if (examId) broadcastAnomaly(examId, studentId, alert);
    }

    // Copy detection
    if (explicitFlags.copyCount > 0) {
      const alert = await BehaviorAlert.create({
        student: studentId,
        exam: examId ? examId.toString() : undefined,
        session: req.body.session || (examId ? examId.toString() : 'exam_session'),
        alertType: 'copy_detected',
        topDeviatingFeatures: {
          copyCount: explicitFlags.copyCount,
          totalCopiedChars: explicitFlags.totalCopiedChars
        },
        severity: 'low',
        reviewed: false
      });
      if (examId) broadcastAnomaly(examId, studentId, alert);
    }

    // Tab-switch detection
    if (explicitFlags.tabBlurCount > 0) {
      const alert = await BehaviorAlert.create({
        student: studentId,
        exam: examId ? examId.toString() : undefined,
        session: req.body.session || (examId ? examId.toString() : 'exam_session'),
        alertType: 'tab_switch',
        topDeviatingFeatures: { tabBlurCount: explicitFlags.tabBlurCount },
        severity: 'low',
        reviewed: false
      });
      if (examId) broadcastAnomaly(examId, studentId, alert);
    }

    // 4. ML biometric verification (only call Python /verify if enough keystrokes exist)
    const formattedEvents = events
      .filter(e => e.type === 'keydown' || e.type === 'keyup')
      .map(e => ({
        key: e.key,
        type: e.type === 'keydown' ? 'down' : 'up',
        t: e.timestamp
      }));

    let verifyResult = null;
    let mlScored = false;
    let scoreReason = null;

    if (req.body.scoreData) {
      verifyResult = req.body.scoreData;
      mlScored = Boolean(verifyResult.trust_score);
    } else {
      // FastAPI features.py requires at least 6 events and >= 2 key-downs
      const hasEnoughKeysForML = formattedEvents.length >= 6 &&
        formattedEvents.filter(e => e.type === 'down').length >= 2;

      if (hasEnoughKeysForML) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        try {
          const response = await fetch(`${BEHAVIOR_API_URL}/verify`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-API-Key': BEHAVIOR_API_KEY
            },
            body: JSON.stringify({ user_id: studentId.toString(), events: formattedEvents }),
            signal: controller.signal
          });

          if (response.ok) {
            verifyResult = await response.json();
            if (verifyResult.state === 'collecting') {
              scoreReason = 'model_not_ready';
            } else {
              mlScored = true;
            }
          } else {
            const text = await response.text();
            console.warn(`Behavior API returned ${response.status}: ${text}`);
            scoreReason = 'scorer_error';
          }
        } catch (error) {
          scoreReason = error.name === 'AbortError' ? 'scorer_timeout' : 'scorer_unavailable';
          console.warn(`Behavior API call skipped [${scoreReason}]:`, error.message);
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        scoreReason = 'not_enough_keystrokes';
      }
    }

    // 5. Update session and broadcast live updates
    if (session) {
      if (deviceInfo) session.deviceInfo = deviceInfo;

      if (req.body.modelState) {
        session.modelState = req.body.modelState;
      }
      if (verifyResult?.state) {
        session.modelState = verifyResult.state;
      }

      // Check model status once if not yet cached on session
      if (!session.modelState) {
        try {
          const sRes = await fetch(`${BEHAVIOR_API_URL}/users/${studentId}/status`, {
            headers: { 'X-API-Key': BEHAVIOR_API_KEY }
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            session.modelState = sData.state;
          }
        } catch (err) {}
      }

      if (mlScored && verifyResult) {
        session.totalWindowsScored = (session.totalWindowsScored || 0) + 1;
        const rawScore = verifyResult.trust_score ?? verifyResult.rolling_avg_trust ?? 75;
        if (session.totalWindowsScored <= 1 || session.smoothedScore === 0) {
          session.smoothedScore = rawScore;
        } else {
          session.smoothedScore = Math.round(0.3 * session.smoothedScore + 0.7 * rawScore);
        }
        session.history.push(session.smoothedScore);
        if (session.history.length > 20) session.history.shift();

        const now = req.body.mockTime || Date.now();

        // Behavioral anomaly alert
        if ((verifyResult.action === 'deny' || verifyResult.action === 'step_up') && !session.alreadyFlaggedRecently) {
          const alert = await BehaviorAlert.create({
            student: studentId,
            session: req.body.session || examId.toString(),
            exam: examId ? examId.toString() : undefined,
            alertType: 'behavioral_anomaly',
            score: session.smoothedScore,
            topDeviatingFeatures: [verifyResult.reason || 'Trust score below threshold'],
            deviceInfo: deviceInfo || session.deviceInfo,
            severity: verifyResult.action === 'deny' ? 'high' : 'medium',
            reviewed: false
          });
          if (examId) broadcastAnomaly(examId, studentId, alert);

          session.alreadyFlaggedRecently = true;
          session.flagTimeoutEnd = new Date(now + 60000);
        }

        if (session.alreadyFlaggedRecently && session.flagTimeoutEnd && new Date(now) > session.flagTimeoutEnd) {
          session.alreadyFlaggedRecently = false;
          session.flagTimeoutEnd = null;
        }
      }

      await session.save();

      // Broadcast live score update with cumulative violation counts to teacher dashboard
      if (examId) {
        broadcastLiveScore(examId, studentId, {
          trustScore: verifyResult?.trust_score ?? (session.smoothedScore > 0 ? session.smoothedScore : null),
          rollingAvgTrust: verifyResult?.rolling_avg_trust ?? null,
          smoothedScore: session.smoothedScore > 0 ? session.smoothedScore : (verifyResult?.trust_score ?? null),
          riskLevel: verifyResult?.risk_level ?? 'low',
          action: verifyResult?.action ?? 'allow',
          tabBlurCount: session.tabBlurCount || 0,
          pasteCount: session.pasteCount || 0,
          copyCount: session.copyCount || 0,
          state: session.modelState || verifyResult?.state || 'ready',
          totalWindowsScored: session.totalWindowsScored
        });
      }
    }

    res.status(200).json({
      scored: mlScored,
      smoothed: session?.smoothedScore || 0,
      action: verifyResult?.action || 'allow',
      reason: scoreReason,
      violations: {
        tabBlurCount: session?.tabBlurCount || explicitFlags.tabBlurCount,
        pasteCount: session?.pasteCount || explicitFlags.pasteCount,
        copyCount: session?.copyCount || explicitFlags.copyCount
      }
    });
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
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': BEHAVIOR_API_KEY
      },
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
    const response = await fetch(`${BEHAVIOR_API_URL}/users/${studentId}/status`, {
      headers: { 'X-API-Key': BEHAVIOR_API_KEY }
    });
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
    const sampleNumber = req.query.sample_number;
    let url = `${BEHAVIOR_API_URL}/passage/${kind}`;
    if (sampleNumber) {
      url += `?sample_number=${encodeURIComponent(sampleNumber)}`;
    }
    const response = await fetch(url, {
      headers: { 'X-API-Key': BEHAVIOR_API_KEY }
    });
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
      method: 'POST',
      headers: { 'X-API-Key': BEHAVIOR_API_KEY }
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
