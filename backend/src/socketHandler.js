const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Course = require('./models/Course');
const Quiz = require('./models/Quiz');
const Assignment = require('./models/Assignment');
const AssessmentSession = require('./models/AssessmentSession');

let io;
let deadlineSweep;
const sessions = new Map();
const socketToPin = new Map();
const joinAttempts = new Map();

const sessionRoom = (id) => `assessment-session:${id}`;
const monitorRoom = (id) => `assessment-monitor:${id}`;
const sameId = (a, b) => String(a?._id || a) === String(b?._id || b);
const cleanStudent = (user) => ({ id: String(user._id), _id: String(user._id), name: user.name, email: user.email });

async function hydrateSession(record) {
  const id = String(record._id);
  let session = sessions.get(String(record.pin));
  if (!session) {
    session = {
      assessmentSessionId: id,
      sessionPin: String(record.pin),
      teacherId: String(record.teacher),
      teacherSocketId: null,
      examId: String(record.assessment),
      courseId: String(record.course),
      status: record.status,
      startedAt: record.startedAt,
      endsAt: record.endsAt,
      students: {},
    };
    sessions.set(String(record.pin), session);
  } else {
    session.status = record.status;
    session.startedAt = record.startedAt;
    session.endsAt = record.endsAt;
  }
  return session;
}

async function sessionRecord(session) {
  return AssessmentSession.findById(session.assessmentSessionId);
}

function emitStudentList(session) {
  if (!session.teacherSocketId || !io) return;
  const students = Object.values(session.students).map((item) => item.student);
  io.to(session.teacherSocketId).emit('student-joined', students);
}

async function resolveAssessment(assessmentId) {
  let assessment = await Assignment.findById(assessmentId).select('_id course title durationMinutes isLiveAssessment');
  if (assessment) return { assessment, courseId: String(assessment.course) };
  assessment = await Quiz.findById(assessmentId).select('_id course title isExam durationMinutes');
  if (assessment) return { assessment, courseId: String(assessment.course) };
  return null;
}

async function canManage(user, courseId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  const course = await Course.findById(courseId).select('teacher');
  return Boolean(course && sameId(course.teacher, user._id));
}

async function canJoin(user, courseId) {
  if (user.role !== 'student') return false;
  const course = await Course.findById(courseId).select('studentsEnrolled');
  return Boolean(course && course.studentsEnrolled.some((id) => sameId(id, user._id)));
}

function scheduleSessionDeadline(session, record) {
  if (!session.endsAt) return;
  const delay = Math.max(0, session.endsAt.getTime() - Date.now());
  setTimeout(async () => {
    try {
      const current = await AssessmentSession.findOneAndUpdate(
        { _id: record._id, status: 'active', endsAt: { $lte: new Date() } },
        { $set: { status: 'ended', endReason: 'time_limit', endedAt: new Date() } },
        { new: true },
      );
      if (!current) return;
      session.status = 'ended';
      io.to(sessionRoom(session.assessmentSessionId)).emit('session-ended', { reason: 'time_limit' });
    } catch (error) {
      console.error('Failed to close expired assessment session:', error.message);
    }
  }, delay);
}

async function createOrRestoreSession(socket, { examId, pin }) {
  const resolved = await resolveAssessment(String(examId || ''));
  if (!resolved || !(await canManage(socket.user, resolved.courseId))) {
    socket.emit('session-error', 'You do not have permission to monitor this assessment.');
    return;
  }
  if (resolved.assessment.isExam !== true && resolved.assessment.isLiveAssessment !== true) {
    socket.emit('session-error', 'Only assessments marked for proctoring can open a live exam room.');
    return;
  }

  // Reattach to the existing session for this assessment instead of creating
  // a second room after refresh or a teacher reconnect.
  let record = await AssessmentSession.findOne({
    assessment: String(examId),
    teacher: String(socket.user._id),
    status: { $in: ['waiting', 'active'] },
  }).sort({ createdAt: -1 });

  if (!record) {
    const cleanPin = String(pin || '').replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length !== 6) {
      socket.emit('session-error', 'Create a session with a six-digit join code.');
      return;
    }
    const existingPin = await AssessmentSession.findOne({ pin: cleanPin }).select('_id status');
    if (existingPin) {
      socket.emit('session-error', 'That room code has already been used. Create a new session to get a fresh code.');
      return;
    }
    record = await AssessmentSession.create({
      assessment: String(examId),
      course: resolved.courseId,
      teacher: String(socket.user._id),
      pin: cleanPin,
      status: 'waiting',
    });
  }

  if (record.status === 'active' && record.endsAt && record.endsAt <= new Date()) {
    record.status = 'ended';
    record.endReason = 'time_limit';
    record.endedAt = record.endsAt;
    await record.save();
  }

  const session = await hydrateSession(record);
  if (session.status === 'ended') {
    socket.emit('session-error', 'This assessment room has ended. Create a new room to run another attempt.');
    return;
  }
  session.teacherSocketId = socket.id;
  socketToPin.set(socket.id, session.sessionPin);
  socket.join(session.sessionPin);
  socket.join(sessionRoom(session.assessmentSessionId));
  socket.join(monitorRoom(session.assessmentSessionId));
  const participants = (record.participants || []).map((participant) => ({
    id: String(participant.student),
    _id: String(participant.student),
    name: 'Joined student',
    connected: false,
  }));
  Object.values(session.students).forEach(({ student }) => {
    const idx = participants.findIndex((item) => item.id === student.id);
    if (idx >= 0) participants[idx] = { ...student, connected: true };
    else participants.push({ ...student, connected: true });
  });
  socket.emit('session-created', {
    pin: session.sessionPin,
    assessmentSessionId: session.assessmentSessionId,
    examId: session.examId,
    status: session.status,
    endsAt: session.endsAt,
    students: participants,
  });
  if (session.status === 'active') scheduleSessionDeadline(session, record);
}

async function joinSession(socket, { pin }) {
  const pinStr = String(pin || '').replace(/\D/g, '').slice(0, 6);
  const userKey = String(socket.user._id);
  const attempt = joinAttempts.get(userKey) || { count: 0, startedAt: Date.now() };
  if (Date.now() - attempt.startedAt > 2 * 60 * 1000) {
    attempt.count = 0;
    attempt.startedAt = Date.now();
  }
  if (attempt.count >= 5) {
    socket.emit('join-error', 'Too many room code attempts. Wait two minutes before trying again.');
    return;
  }
  let session = sessions.get(pinStr);
  let record = session ? await sessionRecord(session) : await AssessmentSession.findOne({ pin: pinStr });
  if (!record || record.status === 'ended') {
    attempt.count += 1;
    joinAttempts.set(userKey, attempt);
    socket.emit('join-error', 'That assessment code is invalid or the session has ended.');
    return;
  }
  if (record.status === 'active' && record.endsAt && record.endsAt <= new Date()) {
    record.status = 'ended';
    record.endReason = 'time_limit';
    record.endedAt = record.endsAt;
    await record.save();
    attempt.count += 1;
    joinAttempts.set(userKey, attempt);
    socket.emit('join-error', 'The time limit for this assessment has passed.');
    return;
  }
  session = await hydrateSession(record);
  if (!(await canJoin(socket.user, session.courseId))) {
    attempt.count += 1;
    joinAttempts.set(userKey, attempt);
    socket.emit('join-error', 'You must be enrolled in this course to join the assessment.');
    return;
  }
  joinAttempts.delete(userKey);

  const student = cleanStudent(socket.user);
  const previous = session.students[student.id];
  if (previous?.socketId && previous.socketId !== socket.id) {
    io.to(previous.socketId).emit('session-reconnected', 'This account reconnected in another tab.');
    socketToPin.delete(previous.socketId);
  }
  session.students[student.id] = { student, socketId: socket.id };
  socketToPin.set(socket.id, pinStr);
  socket.join(pinStr);
  socket.join(sessionRoom(session.assessmentSessionId));

  await AssessmentSession.updateOne(
    { _id: record._id, 'participants.student': { $ne: student.id } },
    { $push: { participants: { student: student.id, joinedAt: new Date(), lastSeenAt: new Date() } } },
  );
  await AssessmentSession.updateOne(
    { _id: record._id, 'participants.student': student.id },
    { $set: { 'participants.$.lastSeenAt': new Date() } },
  );

  emitStudentList(session);
  const eventData = {
    examId: session.examId,
    assessmentSessionId: session.assessmentSessionId,
    pin: pinStr,
    endsAt: session.endsAt,
  };
  socket.emit(session.status === 'active' ? 'exam-started' : 'join-success', eventData);
}

const initSocket = (server) => {
  io = socketIo(server, {
    cors: { origin: process.env.FRONTEND_ORIGIN || true, methods: ['GET', 'POST'] },
  });

  if (!deadlineSweep) {
    deadlineSweep = setInterval(async () => {
      try {
        const expired = await AssessmentSession.find({ status: 'active', endsAt: { $lte: new Date() } }).select('_id pin endsAt');
        for (const record of expired) {
          const ended = await AssessmentSession.findOneAndUpdate(
            { _id: record._id, status: 'active', endsAt: { $lte: new Date() } },
            { $set: { status: 'ended', endReason: 'time_limit', endedAt: record.endsAt || new Date() } },
            { new: true },
          );
          if (!ended) continue;
          const session = sessions.get(String(record.pin));
          if (session) {
            session.status = 'ended';
            io.to(sessionRoom(session.assessmentSessionId)).emit('session-ended', { reason: 'time_limit' });
          }
        }
      } catch (error) {
        // Mongo may still be connecting during process startup; retry next pass.
      }
    }, 15000);
  }

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretlmskey12345');
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('Account not found'));
      if (decoded.sessionId && user.sessionId && decoded.sessionId !== user.sessionId) {
        return next(new Error('This login session has expired'));
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('create-session', async (payload = {}) => {
      try { await createOrRestoreSession(socket, payload); }
      catch (error) { socket.emit('session-error', 'Could not restore the assessment session. Please retry.'); }
    });

    socket.on('join-session', async (payload = {}) => {
      try { await joinSession(socket, payload); }
      catch (error) { socket.emit('join-error', 'Could not join this assessment. Please retry.'); }
    });
    socket.on('rejoin-session', async (payload = {}) => joinSession(socket, payload));

    socket.on('start-exam', async ({ pin } = {}) => {
      const session = sessions.get(String(pin || ''));
      if (!session || session.teacherId !== String(socket.user._id) || socket.user.role === 'student') return;
      const record = await sessionRecord(session);
      if (!record || record.status !== 'waiting') return;
      const resolved = await resolveAssessment(session.examId);
      const durationMinutes = Math.min(240, Math.max(1, Number(resolved?.assessment?.durationMinutes || 60)));
      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
      await AssessmentSession.updateOne({ _id: record._id, status: 'waiting' }, { $set: { status: 'active', startedAt, endsAt, endReason: null } });
      session.status = 'active';
      session.startedAt = startedAt;
      session.endsAt = endsAt;
      const eventData = { examId: session.examId, assessmentSessionId: session.assessmentSessionId, pin: session.sessionPin, startedAt, endsAt };
      io.to(sessionRoom(session.assessmentSessionId)).emit('exam-started', eventData);
      scheduleSessionDeadline(session, record);
    });

    socket.on('end-session', async ({ pin } = {}) => {
      const session = sessions.get(String(pin || ''));
      if (!session || session.teacherId !== String(socket.user._id) || socket.user.role === 'student') return;
      const record = await sessionRecord(session);
      if (!record || record.status === 'ended') return;
      record.status = 'ended';
      record.endReason = 'teacher_ended';
      record.endedAt = new Date();
      await record.save();
      session.status = 'ended';
      io.to(sessionRoom(session.assessmentSessionId)).emit('session-ended', { reason: 'teacher_ended' });
      sessions.delete(session.sessionPin);
    });

    socket.on('disconnect', () => {
      const pin = socketToPin.get(socket.id);
      if (!pin) return;
      const session = sessions.get(pin);
      socketToPin.delete(socket.id);
      if (!session) return;
      if (session.teacherSocketId === socket.id) {
        session.teacherSocketId = null;
      } else {
        for (const [studentId, item] of Object.entries(session.students)) {
          if (item.socketId === socket.id) delete session.students[studentId];
        }
        emitStudentList(session);
      }
    });
  });
};

const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

const broadcastAnomaly = (examId, studentId, alertPayload, assessmentSessionId = null) => {
  if (!io) return;
  if (assessmentSessionId) {
    io.to(monitorRoom(assessmentSessionId)).emit('student-anomaly', { studentId: String(studentId), alert: alertPayload });
    return;
  }
  for (const session of sessions.values()) {
    if (session.status !== 'ended' && String(session.examId) === String(examId)) {
      io.to(monitorRoom(session.assessmentSessionId)).emit('student-anomaly', { studentId: String(studentId), alert: alertPayload });
    }
  }
};

const broadcastLiveScore = (examId, studentId, data, assessmentSessionId = null) => {
  if (!io) return;
  const payload = { studentId: String(studentId), ...data, timestamp: Date.now() };
  if (assessmentSessionId) {
    io.to(monitorRoom(assessmentSessionId)).emit('live_score', payload);
    return;
  }
  for (const session of sessions.values()) {
    if (session.status !== 'ended' && String(session.examId) === String(examId)) {
      io.to(monitorRoom(session.assessmentSessionId)).emit('live_score', payload);
    }
  }
};

const isStudentAuthorizedForExam = async (studentId, examId, allowFinalSubmission = false) => {
  if (!studentId || !examId) return { authorized: false, session: null };
  const statuses = [{ status: 'active', endsAt: { $gt: new Date() } }];
  if (allowFinalSubmission) {
    statuses.push({ status: 'ended', startedAt: { $ne: null }, endReason: { $in: ['time_limit', 'teacher_ended'] }, endedAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) } });
  }
  const record = await AssessmentSession.findOne({
    assessment: String(examId),
    $or: statuses,
    'participants.student': String(studentId),
  }).sort({ createdAt: -1 });
  return record
    ? { authorized: true, session: await hydrateSession(record), status: record.status, endReason: record.endReason, endsAt: record.endsAt }
    : { authorized: false, session: null };
};

module.exports = { initSocket, getIo, broadcastAnomaly, broadcastLiveScore, isStudentAuthorizedForExam };
