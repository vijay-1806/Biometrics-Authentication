import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Matches your actual socketHandler.js: broadcastLiveScore emits directly
// to the teacher's socket (found via the in-memory session/pin lookup),
// not to a room -- so this hook just needs an open connection and to
// listen for 'live_score'. No room-joining needed.
export function useLiveExamMonitor(token) {
  const [students, setStudents] = useState({}); // studentId -> latest live data

  useEffect(() => {
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      auth: { token }
    });

    socket.on('live_score', (data) => {
      setStudents(prev => ({
        ...prev,
        [data.studentId]: data
      }));
    });

    socket.on('student-anomaly', ({ studentId, alert }) => {
      // optional: surface alerts alongside the live score, e.g. a toast
      // or a small badge -- left as a hook point for your existing UI
    });

    return () => socket.disconnect();
  }, [token]);

  return students;
}

// --- example usage in a teacher dashboard component ---
//
// function ExamProctoringPanel({ token, studentDirectory }) {
//   const liveData = useLiveExamMonitor(token);
//
//   return (
//     <div className="grid gap-3">
//       {Object.entries(liveData).map(([studentId, d]) => (
//         <div key={studentId} className="p-3 rounded border flex items-center justify-between">
//           <span>{studentDirectory[studentId]?.name || studentId}</span>
//           <span className={
//             d.action === 'deny' ? 'text-red-500' :
//             d.action === 'step_up' ? 'text-amber-500' : 'text-green-500'
//           }>
//             trust: {d.trustScore ?? '—'} ({d.riskLevel})
//           </span>
//           {d.tabBlurCount > 0 && <span className="text-amber-500">tab switches: {d.tabBlurCount}</span>}
//           {d.pasteCount > 0 && <span className="text-red-500">paste detected</span>}
//         </div>
//       ))}
//     </div>
//   );
// }
