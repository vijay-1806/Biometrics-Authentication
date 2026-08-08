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

      // Add student
      session.students[socket.id] = student;
      socketToPin[socket.id] = pin;
      socket.join(pin);

      console.log(`Student ${student.name} joined session ${pin}`);

      // Notify teacher
      io.to(session.teacherSocketId).emit('student-joined', Object.values(session.students));

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
          io.to(session.teacherSocketId).emit('student-left', Object.values(session.students));
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
  // Find if this exam has an active session and this student is in it
  for (const pin in sessions) {
    const session = sessions[pin];
    if (session.examId.toString() === examId.toString()) {
      // Send directly to the teacher's socket
      io.to(session.teacherSocketId).emit('student-anomaly', {
        studentId,
        alert: alertPayload
      });
      console.log(`Broadcasted live anomaly to teacher for student ${studentId}`);
    }
  }
};

// NEW: Helper for behaviorController to broadcast a live trust-score
// update. Follows the exact same lookup pattern as broadcastAnomaly --
// find the in-memory session(s) for this examId, push straight to the
// teacher's socket. Fires on every scored window (~every 5s per student),
// not just on anomalies, so the teacher dashboard can show a continuously
// updating trust score rather than only a feed of past alerts.
const broadcastLiveScore = (examId, studentId, data) => {
  if (!io) return;
  for (const pin in sessions) {
    const session = sessions[pin];
    if (session.examId.toString() === examId.toString()) {
      io.to(session.teacherSocketId).emit('live_score', {
        studentId,
        ...data,
        timestamp: Date.now()
      });
    }
  }
};

module.exports = {
  initSocket,
  getIo,
  broadcastAnomaly,
  broadcastLiveScore
};
