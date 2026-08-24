const socketIo = require('socket.io');
const mongoose = require('mongoose');

let io;

// In-memory session tracking
// sessions[pin] = { assessmentSessionId, teacherSocketId, examId, status: 'waiting' | 'active', students: { socketId: { studentId, name, email } } }
const sessions = {};

// Map to easily find which pin a teacher or student belongs to
const socketToPin = {};

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Teacher creates or re-attaches to a session
    socket.on('create-session', ({ examId, pin }) => {
      if (!pin) return;
      const pinStr = String(pin).trim();
      let session = sessions[pinStr];

      if (session) {
        // Preserving existing session state & active students across teacher page updates/re-renders
        session.teacherSocketId = socket.id;
        if (examId) session.examId = String(examId);
        socketToPin[socket.id] = pinStr;
        socket.join(pinStr);
        socket.join(`assessment-session:${session.assessmentSessionId}`);
        console.log(`Teacher re-attached to session ${pinStr} (assessmentSessionId: ${session.assessmentSessionId})`);
        
        const uniqueStudentsMap = {};
        Object.values(session.students || {}).forEach(s => {
          const key = String(s._id || s.id || '');
          if (key) uniqueStudentsMap[key] = s;
        });

        socket.emit('session-created', { 
          pin: pinStr, 
          assessmentSessionId: session.assessmentSessionId,
          status: session.status,
          students: Object.values(uniqueStudentsMap)
        });
        return;
      }

      // Brand new session creation
      const assessmentSessionId = new mongoose.Types.ObjectId().toString();
      sessions[pinStr] = {
        assessmentSessionId,
        sessionPin: pinStr,
        teacherSocketId: socket.id,
        examId: String(examId),
        status: 'waiting',
        students: {}
      };
      socketToPin[socket.id] = pinStr;
      socket.join(pinStr);
      socket.join(`assessment-session:${assessmentSessionId}`);
      console.log(`Teacher created new session ${pinStr} (assessmentSessionId: ${assessmentSessionId}) for exam ${examId}`);
      socket.emit('session-created', { pin: pinStr, assessmentSessionId, status: 'waiting', students: [] });
    });

    // Student joins a session
    socket.on('join-session', ({ pin, student }) => {
      const pinStr = String(pin || '').trim();
      const session = sessions[pinStr];
      if (!session || session.status === 'ended') {
        return socket.emit('join-error', 'Invalid PIN or session has ended');
      }

      const studentIdStr = String(student.id || student._id || '');

      // Evict any previous socket connection for this student ID to prevent duplicate candidate rows
      for (const existingSocketId in session.students) {
        const existingStudent = session.students[existingSocketId];
        if (String(existingStudent.id || existingStudent._id || '') === studentIdStr) {
          delete session.students[existingSocketId];
          delete socketToPin[existingSocketId];
        }
      }

      // Add active student
      session.students[socket.id] = student;
      socketToPin[socket.id] = pinStr;
      socket.join(pinStr);
      socket.join(`assessment-session:${session.assessmentSessionId}`);

      console.log(`Student ${student.name} (${studentIdStr}) joined session ${pinStr} (assessmentSessionId: ${session.assessmentSessionId})`);

      // Deduplicate student objects by ID for teacher broadcast
      const uniqueStudentsMap = {};
      Object.values(session.students).forEach(s => {
        const key = String(s._id || s.id || '');
        if (key) uniqueStudentsMap[key] = s;
      });
      const uniqueList = Object.values(uniqueStudentsMap);

      // Notify teacher
      if (session.teacherSocketId) {
        io.to(session.teacherSocketId).emit('student-joined', uniqueList);
      }

      // If exam already active, immediately start the student
      if (session.status === 'active') {
        socket.emit('exam-started', { examId: session.examId, assessmentSessionId: session.assessmentSessionId, pin: pinStr });
      } else {
        socket.emit('join-success', { examId: session.examId, assessmentSessionId: session.assessmentSessionId, pin: pinStr });
      }
    });

    // Teacher starts the exam
    socket.on('start-exam', ({ pin }) => {
      const pinStr = String(pin || '').trim();
      const session = sessions[pinStr];
      if (session) {
        session.status = 'active';
        io.to(pinStr).emit('exam-started', { examId: session.examId, assessmentSessionId: session.assessmentSessionId, pin: pinStr });
        io.to(`assessment-session:${session.assessmentSessionId}`).emit('exam-started', { examId: session.examId, assessmentSessionId: session.assessmentSessionId, pin: pinStr });
        console.log(`Exam started for session ${pinStr} (assessmentSessionId: ${session.assessmentSessionId})`);
      }
    });

    // Teacher explicitly ends the exam
    socket.on('end-session', ({ pin }) => {
      const pinStr = String(pin || '').trim();
      const session = sessions[pinStr];
      if (session) {
        session.status = 'ended';
        io.to(pinStr).emit('session-ended');
        io.to(`assessment-session:${session.assessmentSessionId}`).emit('session-ended');
        delete sessions[pinStr];
        console.log(`Session ${pinStr} officially ENDED and removed by instructor.`);
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      const pin = socketToPin[socket.id];
      if (pin && sessions[pin]) {
        const session = sessions[pin];

        if (session.teacherSocketId === socket.id) {
          console.log(`Teacher page refresh/disconnect from session ${pin}. Preserving active session state.`);
          // Preserve session so F5 refresh doesn't destroy the active exam for teacher/students
        } else if (session.students[socket.id]) {
          console.log(`Student disconnected from session ${pin}`);
          delete session.students[socket.id];
          
          const uniqueStudentsMap = {};
          Object.values(session.students).forEach(s => {
            const key = String(s._id || s.id || '');
            uniqueStudentsMap[key] = s;
          });
          const uniqueList = Object.values(uniqueStudentsMap);

          if (session.teacherSocketId) {
            io.to(session.teacherSocketId).emit('student-left', uniqueList);
          }
        }
      }
      delete socketToPin[socket.id];
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Helper for behaviorController to broadcast an anomaly
const broadcastAnomaly = (examId, studentId, alertPayload, assessmentSessionId = null) => {
  if (!io) return;
  const studentIdStr = String(studentId);

  if (assessmentSessionId) {
    io.to(`assessment-session:${assessmentSessionId}`).emit('student-anomaly', {
      studentId: studentIdStr,
      alert: alertPayload
    });
    return;
  }

  // Scoped fallback lookup by student membership in active session
  for (const pin in sessions) {
    const session = sessions[pin];
    const isStudentInSession = Object.values(session.students || {}).some(
      s => String(s._id || s.id || '') === studentIdStr
    );
    if (isStudentInSession) {
      if (session.assessmentSessionId) {
        io.to(`assessment-session:${session.assessmentSessionId}`).emit('student-anomaly', {
          studentId: studentIdStr,
          alert: alertPayload
        });
      } else if (session.teacherSocketId) {
        io.to(session.teacherSocketId).emit('student-anomaly', {
          studentId: studentIdStr,
          alert: alertPayload
        });
      }
    }
  }
};

// Helper for behaviorController to broadcast a live trust-score & telemetry update
const broadcastLiveScore = (examId, studentId, data, assessmentSessionId = null) => {
  if (!io) return;
  const studentIdStr = String(studentId);

  if (assessmentSessionId) {
    io.to(`assessment-session:${assessmentSessionId}`).emit('live_score', {
      studentId: studentIdStr,
      ...data,
      timestamp: Date.now()
    });
    return;
  }

  // Scoped fallback lookup by student membership in active session (prevents global iteration leak)
  for (const pin in sessions) {
    const session = sessions[pin];
    const isStudentInSession = Object.values(session.students || {}).some(
      s => String(s._id || s.id || '') === studentIdStr
    );
    if (isStudentInSession) {
      if (session.assessmentSessionId) {
        io.to(`assessment-session:${session.assessmentSessionId}`).emit('live_score', {
          studentId: studentIdStr,
          ...data,
          timestamp: Date.now()
        });
      } else if (session.teacherSocketId) {
        io.to(session.teacherSocketId).emit('live_score', {
          studentId: studentIdStr,
          ...data,
          timestamp: Date.now()
        });
      }
    }
  }
};

// Check if a student is registered as an active participant in an ongoing assessment session
const isStudentAuthorizedForExam = (studentId, examId) => {
  if (!studentId || !examId) return { authorized: false, session: null };
  const studentIdStr = String(studentId);
  const examIdStr = String(examId);

  for (const pin in sessions) {
    const session = sessions[pin];
    if (String(session.examId) === examIdStr) {
      if (session.status === 'ended') {
        return { authorized: false, session, reason: 'session_ended' };
      }
      if (session.status === 'waiting' || session.status === 'active') {
        for (const socketId in session.students) {
          const student = session.students[socketId];
          const sId = String(student._id || student.id || student);
          if (sId === studentIdStr) {
            return { authorized: true, session };
          }
        }
      }
    }
  }
  return { authorized: false, session: null };
};

module.exports = {
  initSocket,
  getIo,
  broadcastAnomaly,
  broadcastLiveScore,
  isStudentAuthorizedForExam
};
