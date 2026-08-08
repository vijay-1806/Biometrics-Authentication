const socketIo = require('socket.io');

let io;

// In-memory session tracking
// sessions[pin] = { teacherSocketId, examId, status: 'waiting' | 'active', students: { socketId: { studentId, name, email } } }
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

    // Teacher creates a session
    socket.on('create-session', ({ examId, pin }) => {
      sessions[pin] = {
        teacherSocketId: socket.id,
        examId,
        status: 'waiting',
        students: {}
      };
      socketToPin[socket.id] = pin;
      socket.join(pin); // teacher joins the room
      console.log(`Teacher created session ${pin} for exam ${examId}`);
      socket.emit('session-created', { pin });
    });

    // Student joins a session
    socket.on('join-session', ({ pin, student }) => {
      const session = sessions[pin];
      if (!session) {
        return socket.emit('join-error', 'Invalid PIN or session ended');
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
      socketToPin[socket.id] = pin;
      socket.join(pin);

      console.log(`Student ${student.name} (${studentIdStr}) joined session ${pin}`);

      // Deduplicate student objects by ID for teacher broadcast
      const uniqueStudentsMap = {};
      Object.values(session.students).forEach(s => {
        const key = String(s._id || s.id || '');
        uniqueStudentsMap[key] = s;
      });
      const uniqueList = Object.values(uniqueStudentsMap);

      // Notify teacher
      io.to(session.teacherSocketId).emit('student-joined', uniqueList);

      // If exam already active, immediately start the student
      if (session.status === 'active') {
        socket.emit('exam-started', { examId: session.examId });
      } else {
        socket.emit('join-success', { examId: session.examId });
      }
    });

    // Teacher starts the exam
    socket.on('start-exam', ({ pin }) => {
      const session = sessions[pin];
      if (session && session.teacherSocketId === socket.id) {
        session.status = 'active';
        // Broadcast to everyone in the room (which includes students)
        io.to(pin).emit('exam-started', { examId: session.examId });
        console.log(`Exam started for session ${pin}`);
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      const pin = socketToPin[socket.id];
      if (pin && sessions[pin]) {
        const session = sessions[pin];

        if (session.teacherSocketId === socket.id) {
          // Teacher disconnected, end session
          console.log(`Teacher disconnected, ending session ${pin}`);
          io.to(pin).emit('session-ended');
          delete sessions[pin];
        } else if (session.students[socket.id]) {
          // Student disconnected
          console.log(`Student disconnected from session ${pin}`);
          delete session.students[socket.id];
          
          const uniqueStudentsMap = {};
          Object.values(session.students).forEach(s => {
            const key = String(s._id || s.id || '');
            uniqueStudentsMap[key] = s;
          });
          const uniqueList = Object.values(uniqueStudentsMap);

          io.to(session.teacherSocketId).emit('student-left', uniqueList);
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
const broadcastAnomaly = (examId, studentId, alertPayload) => {
  if (!io) return;
  const studentIdStr = String(studentId);
  for (const pin in sessions) {
    const session = sessions[pin];
    const isStudentInSession = Object.values(session.students || {}).some(
      s => String(s._id || s.id || '') === studentIdStr
    );
    if (isStudentInSession || !examId || String(session.examId) === String(examId)) {
      io.to(session.teacherSocketId).emit('student-anomaly', {
        studentId: studentIdStr,
        alert: alertPayload
      });
      console.log(`Broadcasted live anomaly to teacher for student ${studentIdStr}`);
    }
  }
};

// Helper for behaviorController to broadcast a live trust-score & telemetry update
const broadcastLiveScore = (examId, studentId, data) => {
  if (!io) return;
  const studentIdStr = String(studentId);
  for (const pin in sessions) {
    const session = sessions[pin];
    const isStudentInSession = Object.values(session.students || {}).some(
      s => String(s._id || s.id || '') === studentIdStr
    );
    if (isStudentInSession || !examId || String(session.examId) === String(examId)) {
      io.to(session.teacherSocketId).emit('live_score', {
        studentId: studentIdStr,
        ...data,
        timestamp: Date.now()
      });
      console.log(`Broadcasted live_score to teacher for student ${studentIdStr}: tabBlurCount=${data.tabBlurCount}`);
    }
  }
};

module.exports = {
  initSocket,
  getIo,
  broadcastAnomaly,
  broadcastLiveScore
};
