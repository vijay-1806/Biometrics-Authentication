import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Layout from '../components/Common/Layout';
import { useSearchParams } from 'react-router-dom';
import {
  Shield, AlertTriangle, UserCheck, Eye, RefreshCw, Zap,
  CheckCircle2, XCircle, Clock, Monitor, Copy, Clipboard,
  ChevronRight, ChevronDown, Activity, BarChart2, BookOpen, Code2, Plus,
  Users, AlertCircle, ArrowRight, CheckCircle, FileCode, Flag
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getRiskColor = (level) => {
  if (level === 'high')   return { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' };
  if (level === 'medium' || level === 'review') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  if (level === 'low')    return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
  return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
};

const RiskBadge = ({ level }) => {
  const c = getRiskColor(level);
  const label = level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Normal';
  return (
    <span className="lms-badge" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {level === 'high' && <span className="dot-pulse w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: c.text }} />}
      {label}
    </span>
  );
};

const TrustBar = ({ score }) => {
  const pct = Math.min(100, Math.max(0, Math.round(score)));
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const textColor = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">Trust</span>
        <span className="font-black" style={{ color: textColor }}>{pct}/100</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

const StatChip = ({ value, label, alert, color }) => (
  <div className="text-center px-3 py-2 rounded-xl border" style={{
    background: (alert && value > 0) ? (color?.bg || '#fff1f2') : '#f8fafc',
    borderColor: (alert && value > 0) ? (color?.border || '#fecdd3') : '#e2e8f0'
  }}>
    <p className="text-lg font-black" style={{ color: (alert && value > 0) ? (color?.text || '#e11d48') : '#1e293b' }}>
      {value}
    </p>
    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
  </div>
);

const getReason = (alert) => {
  if (alert.alertType === 'behavioral_anomaly') return 'Typing rhythm deviated from baseline.';
  if (alert.alertType === 'paste_detected') return `Pasted ${alert.topDeviatingFeatures?.totalPastedChars || ''} chars.`;
  if (alert.alertType === 'copy_detected') return `Copied ${alert.topDeviatingFeatures?.totalCopiedChars || ''} chars.`;
  if (alert.alertType === 'device_change') return 'Device/resolution changed mid-exam.';
  if (alert.alertType === 'teacher_flag') return alert.topDeviatingFeatures?.note || 'Teacher flagged this candidate for trust review.';
  if (alert.alertType === 'tab_switch') return `Tab switched (${alert.topDeviatingFeatures?.tabBlurCount || ''}×).`;
  return 'Anomaly detected.';
};

// ─── Student Row ──────────────────────────────────────────────────────────────
const StudentRow = ({ student, live, alertCount, sessionActive, onInspect, onFlag, isFlagged }) => {
  const studentId = student._id || student.id;
  const trustScore = live?.trustScore ?? (live?.smoothedScore > 0 ? live.smoothedScore : null);
  const score = trustScore !== null ? Math.round(trustScore) : null;
  const modelState = live?.state || 'ready';

  const modelBadge = modelState === 'full'
    ? { label: 'Full (20/20)', cls: 'badge-green' }
    : modelState === 'provisional'
    ? { label: 'Provisional', cls: 'badge-amber' }
    : { label: 'Collecting', cls: 'badge-slate' };

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#e0e7ff', color: '#4338ca' }}>
            {student.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{student.email}</p>
          </div>
        </div>
      </td>
      <td><span className={`lms-badge ${modelBadge.cls}`}>{modelBadge.label}</span></td>
      <td>
        {score !== null ? <TrustBar score={score} /> :
         sessionActive ? <span className="text-xs text-slate-400 italic">Sampling...</span> :
         <span className="text-xs text-slate-400">Waiting...</span>}
      </td>
      <td><RiskBadge level={live?.riskLevel} /></td>
      <td>
        <div className="flex gap-1.5">
          <StatChip value={live?.tabBlurCount || 0} label="Tabs" alert color={{ bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' }} />
          <StatChip value={live?.pasteCount || 0} label="Paste" alert color={{ bg: '#fffbeb', text: '#d97706', border: '#fde68a' }} />
          <StatChip value={live?.copyCount || 0} label="Copy" alert color={{ bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' }} />
        </div>
      </td>
      <td className="text-center">
        {alertCount > 0 ? (
          <button
            onClick={() => onInspect(student)}
            className="lms-badge badge-red cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to view alerts"
          >
            <AlertTriangle size={11} />
            {alertCount} alert{alertCount > 1 ? 's' : ''}
          </button>
        ) : (
          <span className="lms-badge badge-green"><CheckCircle2 size={11} /> 0</span>
        )}
      </td>
      <td className="text-center">
        <span className="lms-badge badge-green">
          <span className="dot-pulse w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e' }} />
          Active
        </span>
      </td>
      <td>
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => onFlag(student)}
            disabled={isFlagged}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
            style={{ border: '1px solid #fde68a' }}
            title="Flag this student for trust review"
          >
            <Flag size={12} /> {isFlagged ? 'Flagged' : 'Flag review'}
          </button>
          <button
            onClick={() => onInspect(student)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            style={{ border: '1px solid #e2e8f0' }}
          >
            <Eye size={12} /> Inspect
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Inspect Modal ─────────────────────────────────────────────────────────────
const InspectModal = ({ student, live, alerts, onClose }) => {
  if (!student) return null;
  const trustScore = live?.trustScore ?? live?.smoothedScore ?? null;
  const score = trustScore !== null ? Math.round(trustScore) : null;

  // Deduplicate alerts by alertType — keep only the latest of each type
  const dedupedAlerts = Object.values(
    alerts.reduce((acc, alert) => {
      const key = alert.alertType || 'unknown';
      if (!acc[key] || new Date(alert.createdAt) > new Date(acc[key].createdAt)) {
        acc[key] = alert;
      }
      return acc;
    }, {})
  );

  const metrics = [
    { label: 'Trust Score', value: score !== null ? `${score}/100` : 'Sampling...', icon: <Activity size={16} className="text-brand-600" /> },
    { label: 'Risk Level', value: live?.riskLevel ? live.riskLevel.charAt(0).toUpperCase() + live.riskLevel.slice(1) : 'Normal', icon: <Shield size={16} className="text-slate-500" /> },
    { label: 'Tab Switches', value: `${live?.tabBlurCount || 0}×`, icon: <Monitor size={16} className="text-slate-500" /> },
    { label: 'Paste Events', value: `${live?.pasteCount || 0}×`, icon: <Clipboard size={16} className="text-amber-500" /> },
    { label: 'Copy Events', value: `${live?.copyCount || 0}×`, icon: <Copy size={16} className="text-purple-500" /> },
    { label: 'Alert Types', value: dedupedAlerts.length, icon: <AlertTriangle size={16} className="text-rose-500" /> },
  ];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-lg p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base"
              style={{ background: '#e0e7ff', color: '#4338ca' }}>
              {student.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900">{student.name}</h3>
              <p className="text-xs text-slate-500">{student.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="p-3 rounded-xl text-center" style={{ background: '#f8fafc', border: '1.5px solid #eaeef5' }}>
              <div className="flex justify-center mb-1">{m.icon}</div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
              <p className={`font-black text-lg ${i === 0 && score !== null ?
                (score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600')
                : 'text-slate-900'}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        {score !== null && (
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-slate-700">Overall Trust Score</span>
              <span style={{ color: score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626' }}>{score}%</span>
            </div>
            <div className="progress-bar h-3 rounded-xl">
              <div className="progress-fill rounded-xl" style={{
                width: `${score}%`,
                background: score >= 70 ? 'linear-gradient(90deg,#4ade80,#22c55e)' : score >= 40 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : 'linear-gradient(90deg,#f87171,#ef4444)'
              }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Suspicious (0)</span>
              <span className="text-amber-600">Borderline (40)</span>
              <span className="text-green-600">Trusted (70+)</span>
            </div>
          </div>
        )}

        {/* Deduped Violations — one per alert type */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Anomaly Log ({dedupedAlerts.length} unique type{dedupedAlerts.length !== 1 ? 's' : ''})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {dedupedAlerts.length === 0 ? (
              <div className="text-center py-5 text-slate-400">
                <CheckCircle2 size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-medium">No anomalies logged.</p>
              </div>
            ) : dedupedAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 p-2.5 rounded-xl text-xs"
                style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                <div className="flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="text-rose-700 font-medium">{getReason(alert)}</span>
                </div>
                <span className="text-slate-400 font-mono whitespace-nowrap flex-shrink-0">
                  {new Date(alert.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1 border-t border-slate-100">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            style={{ border: '1.5px solid #e2e8f0' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function LiveProctorDashboard() {
  const [searchParams] = useSearchParams();
  const isDedicatedMonitor = Boolean(searchParams.get('pin'));
  const [courses, setCourses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(() => searchParams.get('courseId') || '');
  const [selectedAssessment, setSelectedAssessment] = useState(() => searchParams.get('examId') || '');

  const [sessionPin, setSessionPin] = useState(() => searchParams.get('pin') || null);
  const [assessmentSessionId, setAssessmentSessionId] = useState(() => sessionStorage.getItem('lms_assessment_session') || null);
  const [flaggingStudentId, setFlaggingStudentId] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [students, setStudents] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveScores, setLiveScores] = useState({});
  const [inspectedStudent, setInspectedStudent] = useState(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionEndsAt, setSessionEndsAt] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  const socketRef = useRef(null);
  // Persist session state in sessionStorage so refresh doesn't kill it
  const [pinPersisted] = useState(() => sessionStorage.getItem('lms_session_pin') || null);

  useEffect(() => {
    axios.get('/api/courses', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => setCourses(res.data))
      .catch(console.error);

    // Restore session if it was active
    if (pinPersisted && !searchParams.get('pin') && !searchParams.get('examId')) {
      setSessionPin(pinPersisted);
      setSessionActive(sessionStorage.getItem('lms_session_active') === 'true');
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      axios.get(`/api/courses/${selectedCourse}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => {
          const courseAssignments = res.data.assignments?.filter(a => a.isLiveAssessment).map(a => ({ ...a, type: 'Live coding assessment' })) || [];
          setAssessments(courseAssignments);
        }).catch(console.error);
    } else {
      setAssessments([]);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (sessionPin) {
      const socketHost = window.location.origin;
      socketRef.current = io(socketHost, { transports: ['websocket', 'polling'], auth: { token: localStorage.getItem('token') } });
      const socket = socketRef.current;

      socket.emit('create-session', { examId: selectedAssessment || sessionStorage.getItem('lms_session_exam'), pin: sessionPin });

      socket.on('session-created', (info) => {
        setSessionError('');
        setSessionReady(true);
        setSessionPin(info.pin);
        setAssessmentSessionId(info.assessmentSessionId);
        sessionStorage.setItem('lms_assessment_session', info.assessmentSessionId);
        setSessionActive(info.status === 'active');
        setSessionEnded(info.status === 'ended');
        setSessionEndsAt(info.endsAt || null);
        setStudents(dedup(info.students || []));
        sessionStorage.setItem('lms_session_pin', info.pin);
        sessionStorage.setItem('lms_session_active', String(info.status === 'active'));
        if (searchParams.get('autostart') === '1' && info.status !== 'active' && info.status !== 'ended') {
          socket.emit('start-exam', { pin: info.pin });
        }
      });
      socket.on('session-error', (message) => setSessionError(message));
      socket.on('connect_error', () => {
        setSessionReady(false);
        setSessionError('Secure room connection failed. Check your login and reconnect.');
      });
      socket.on('exam-started', (info = {}) => {
        setSessionActive(true);
        setSessionEndsAt(info.endsAt || null);
        sessionStorage.setItem('lms_session_active', 'true');
      });
      socket.on('session-ended', () => {
        setSessionActive(false);
        setSessionEnded(true);
        setSessionEndsAt(null);
        sessionStorage.setItem('lms_session_active', 'false');
      });

      socket.on('student-joined', (updatedStudents) => {
        setStudents(dedup(updatedStudents));
      });

      socket.on('student-left', (updatedStudents) => {
        setStudents(dedup(updatedStudents));
      });

      socket.on('student-anomaly', ({ studentId, alert }) => {
        setStudents(curr => {
          const student = curr.find(s => s._id === studentId || s.id === studentId);
          setLiveAlerts(prev => {
            // Deduplicate: keep only latest per alertType per student
            const filtered = prev.filter(a => {
              const sid = a.student?._id || a.student?.id;
              return !(sid === studentId && a.alertType === alert.alertType);
            });
            return [{ ...alert, student: student || { name: 'Unknown' } }, ...filtered];
          });
          return curr;
        });
      });

      socket.on('live_score', (data) => {
        setLiveScores(prev => ({ ...prev, [data.studentId]: data }));
      });

      return () => {
        socket.disconnect();
        if (socketRef.current === socket) socketRef.current = null;
      };
    }
  }, [sessionPin]);

  const dedup = (arr) => {
    const seen = new Set();
    return arr.filter(s => { const id = s._id || s.id; if (seen.has(id)) return false; seen.add(id); return true; });
  };

  const handleCreateSession = () => {
    if (!selectedAssessment) return;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('lms_session_pin', pin);
    sessionStorage.setItem('lms_session_exam', selectedAssessment);
    sessionStorage.setItem('lms_session_active', 'false');
    setSessionPin(pin);
    setSessionReady(false);
    setSessionEndsAt(null);
    setSessionEnded(false);
    setLiveScores({}); setLiveAlerts([]); setStudents([]);
    setSessionActive(false);
  };

  const handleStartExam = () => {
    if (socketRef.current) socketRef.current.emit('start-exam', { pin: sessionPin });
  };

  const handleEndSession = () => {
    if (socketRef.current) {
      socketRef.current.emit('end-session', { pin: sessionPin });
      socketRef.current.disconnect();
    }
    sessionStorage.removeItem('lms_assessment_session');
    sessionStorage.removeItem('lms_session_pin');
    sessionStorage.removeItem('lms_session_exam');
    sessionStorage.removeItem('lms_session_active');
    setSessionPin(null);
    setSessionReady(false);
    setSessionEndsAt(null);
    setSessionEnded(false);
    setSessionActive(false);
    setStudents([]); setLiveAlerts([]);
    if (isDedicatedMonitor) {
      window.setTimeout(() => {
        window.close();
        if (!window.closed) window.location.replace('/dashboard');
      }, 150);
    }
  };

  const handleFlagCandidate = async (student) => {
    const studentId = String(student._id || student.id);
    if (!assessmentSessionId) { setSessionError('Session details are still loading. Try again in a moment.'); return; }
    if (flaggingStudentId === studentId) return;
    setFlaggingStudentId(studentId);
    try {
      const { data } = await axios.post(`/api/behavior/assessment-history/${assessmentSessionId}/candidates/${studentId}/flag`, { note: 'Teacher flagged this candidate for trust review during the live assessment.' });
      setLiveAlerts(current => current.some(alert => alert.alertType === 'teacher_flag' && String(alert.student?._id || alert.student?.id || alert.student) === String(studentId)) ? current : [{ ...data, student }, ...current]);
      setLiveScores(current => ({ ...current, [studentId]: { ...current[studentId], riskLevel: 'review' } }));
    } catch (error) { setSessionError(error.response?.data?.message || 'Could not flag this student.'); }
    finally { setFlaggingStudentId(''); }
  };

  const getLiveScoreFor = (student) => liveScores[student._id] || liveScores[student.id] || null;
  const getAlertCount = (studentId) =>
    liveAlerts.filter(a => a.student?._id === studentId || a.student?.id === studentId || a.student === studentId).length;

  // ─── Active Session View ─────────────────────────────────────────────────────
  if (sessionPin) {
    const totalCount = students.length;
    const highRiskCount = students.filter(s => {
      const live = getLiveScoreFor(s);
      return (live?.trustScore !== undefined && live.trustScore < 50) || live?.riskLevel === 'high';
    }).length;
    const mediumRiskCount = students.filter(s => {
      const live = getLiveScoreFor(s);
      const score = live?.trustScore;
      return score !== undefined && score >= 50 && score < 75 && live?.riskLevel !== 'high';
    }).length;
    const highTrustCount = students.filter(s => {
      const live = getLiveScoreFor(s);
      const score = live?.trustScore ?? 100;
      return score >= 75 && live?.riskLevel !== 'high';
    }).length;

    return (
      <Layout showNavigation={!isDedicatedMonitor}>
        <div className="space-y-5">
          {/* Control Bar */}
          <div className="lms-card p-5" style={{ borderRadius: '20px' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}>
                  <Shield size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black text-slate-900">Proctor Control Room</h1>
                    <span className="lms-badge badge-blue">Live Telemetry</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Continuous keystroke & behavioral biometrics</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Session PIN display (Google Workspace style) */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '6px 16px', textAlign: 'center' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session PIN</p>
                  <div className="text-2xl font-black text-slate-900 tracking-widest font-mono">{sessionPin}</div>
                  {sessionEndsAt && <p className="mt-1 text-[10px] font-semibold text-slate-500">Ends {new Date(sessionEndsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {sessionEnded ? (
                    <div className="flex items-center gap-2">
                      <span className="lms-badge badge-slate">SESSION ENDED</span>
                      <button onClick={handleEndSession} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Back to setup</button>
                    </div>
                  ) : !sessionActive ? (
                    <button
                      onClick={handleStartExam}
                      disabled={students.length === 0 || !sessionReady}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all hover:opacity-95 active:scale-[0.97]"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}
                    >
                      <Zap size={16} />
                      Start Exam
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-green-700"
                      style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                      <span className="dot-pulse w-2 h-2 rounded-full bg-green-500 inline-block" />
                      MONITORING LIVE
                    </div>
                  )}

                  {/* End Session Button with Confirmation Guard */}
                  <button
                    onClick={() => setShowEndSessionConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm text-rose-600 hover:bg-rose-50 transition-all active:scale-[0.97]"
                    style={{ border: '1.5px solid #fecdd3', background: '#fff' }}
                  >
                    <XCircle size={15} /> End Session
                  </button>
                </div>
              </div>
            </div>
          </div>
          {sessionError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{sessionError}</div>}

          {/* Redesigned Google Workspace 4-Metric Stats Ribbon */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {/* Total Connected Candidates */}
            <div style={{
              background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', margin: 0 }}>
                  Candidates
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>{totalCount}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: sessionActive ? '#16a34a' : '#94a3b8' }}>
                    {sessionActive ? 'Active' : 'Lobby'}
                  </span>
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} style={{ color: '#4f46e5' }} />
              </div>
            </div>

            {/* High Trust / Verified */}
            <div style={{
              background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px', margin: 0 }}>
                  Authentic Rhythm
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '900', color: '#15803d' }}>{highTrustCount}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>
                    {totalCount > 0 ? `${Math.round((highTrustCount / totalCount) * 100)}%` : '—'}
                  </span>
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
              </div>
            </div>

            {/* Moderate Deviations */}
            <div style={{
              background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#d97706', letterSpacing: '0.5px', margin: 0 }}>
                  Under Review
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '900', color: '#b45309' }}>{mediumRiskCount}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#d97706' }}>
                    Cadence shift
                  </span>
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} style={{ color: '#d97706' }} />
              </div>
            </div>

            {/* Critical Anomalies / High Risk */}
            <div style={{
              background: highRiskCount > 0 ? '#fff1f2' : '#fff',
              borderRadius: '16px', border: `1.5px solid ${highRiskCount > 0 ? '#fecdd3' : '#e2e8f0'}`,
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.5px', margin: 0 }}>
                  Critical Flags
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '900', color: '#b91c1c' }}>{highRiskCount}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626' }}>
                    {highRiskCount > 0 ? 'Requires Action' : 'All Clear'}
                  </span>
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: highRiskCount > 0 ? '#fee2e2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} style={{ color: highRiskCount > 0 ? '#dc2626' : '#94a3b8' }} />
              </div>
            </div>
          </div>

          {/* Session Ending Confirmation Dialog */}
          {showEndSessionConfirm && (
            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
              }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowEndSessionConfirm(false); }}
            >
              <div
                style={{
                  background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '420px',
                  padding: '28px', boxShadow: '0 20px 48px rgba(0,0,0,0.16)',
                  border: '1.5px solid #e2e8f0', textAlign: 'center',
                  animation: 'modalSlideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{
                  width: '56px', height: '56px', borderRadius: '18px', background: '#ffe4e6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                }}>
                  <XCircle size={28} style={{ color: '#e11d48' }} />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
                  End Live Proctor Session?
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 24px' }}>
                  Are you sure you want to end this live session (PIN {sessionPin})? This will immediately conclude the examination for all <strong>{students.length} candidate(s)</strong> and release their locked screens.
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowEndSessionConfirm(false)}
                    style={{
                      flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                      background: '#fff', color: '#475569', fontSize: '13px', fontWeight: '700',
                      cursor: 'pointer', transition: 'all 150ms'
                    }}
                  >
                    Keep Live
                  </button>
                  <button
                    onClick={() => {
                      setShowEndSessionConfirm(false);
                      handleEndSession();
                    }}
                    style={{
                      flex: 1, padding: '11px', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg, #e11d48, #be123c)', color: '#fff',
                      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(225,29,72,0.3)', transition: 'all 150ms'
                    }}
                  >
                    Confirm & End Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Monitoring Table */}
          <div className="lms-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <UserCheck size={17} className="text-brand-600" />
              <h2 className="font-bold text-slate-900">Connected Candidates ({students.length})</h2>
              <p className="text-xs text-slate-500 ml-2">Behavioral telemetry — 5-second sampling window</p>
            </div>

            <div className="overflow-x-auto">
              <table className="lms-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Model</th>
                    <th style={{ minWidth: 160 }}>Trust Score</th>
                    <th>Risk</th>
                    <th>Behavioral Metrics</th>
                    <th className="text-center">Alerts</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw size={28} className="text-slate-300" style={{ animation: 'spin 1.5s linear infinite' }} />
                          <p className="font-semibold text-sm">Waiting for students to join with PIN {sessionPin}...</p>
                        </div>
                      </td>
                    </tr>
                  ) : students.map((student, i) => {
                    const studentId = student._id || student.id;
                    const live = getLiveScoreFor(student);
                    const alertCount = getAlertCount(studentId);
                    return (
                      <StudentRow
                        key={i}
                        student={student}
                        live={live}
                        alertCount={alertCount}
                        sessionActive={sessionActive}
                        onInspect={setInspectedStudent}
                        onFlag={handleFlagCandidate}
                        isFlagged={flaggingStudentId === String(student._id || student.id) || liveAlerts.some(alert => String(alert.student?._id || alert.student?.id || alert.student) === String(student._id || student.id) && alert.alertType === 'teacher_flag')}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* NOTE: Recent Anomaly Alerts feed removed per request — use Inspect button on each student to view their alerts */}

          {/* Inspect Modal */}
          {inspectedStudent && (
            <InspectModal
              student={inspectedStudent}
              live={getLiveScoreFor(inspectedStudent)}
              alerts={liveAlerts.filter(a => {
                const id = inspectedStudent._id || inspectedStudent.id;
                return a.student?._id === id || a.student?.id === id || a.student === id;
              })}
              onClose={() => setInspectedStudent(null)}
            />
          )}
        </div>
      </Layout>
    );
  }

  // ─── Session Setup View ────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proctor Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create a secure live exam room for students.</p>
        </div>

        <div className="lms-card p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
              <Shield size={26} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Create Exam Room</h2>
              <p className="text-sm text-slate-500 mt-0.5">Authenticated students enrolled in the selected course can join with this PIN.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="lms-label" style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={14} style={{ color: '#4f46e5' }} /> Select Course
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  style={{
                    width: '100%', height: '48px', padding: '0 36px 0 16px', borderRadius: '14px',
                    border: '1.5px solid #cbd5e1', background: '#fff', color: '#0f172a',
                    fontSize: '14px', fontWeight: '600', outline: 'none', cursor: 'pointer',
                    appearance: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'border-color 150ms, box-shadow 150ms'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                >
                  <option value="">— Select a course —</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
                <ChevronDown size={17} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
              </div>
            </div>

            <div>
              <label className="lms-label" style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCode size={14} style={{ color: '#4f46e5' }} /> Select assessment
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedAssessment}
                  onChange={e => setSelectedAssessment(e.target.value)}
                  disabled={!selectedCourse || assessments.length === 0}
                  style={{
                    width: '100%', height: '48px', padding: '0 36px 0 16px', borderRadius: '14px',
                    border: '1.5px solid #cbd5e1', background: (!selectedCourse || assessments.length === 0) ? '#f8fafc' : '#fff',
                    color: '#0f172a', fontSize: '14px', fontWeight: '600', outline: 'none',
                    cursor: (!selectedCourse || assessments.length === 0) ? 'not-allowed' : 'pointer',
                    appearance: 'none', opacity: (!selectedCourse || assessments.length === 0) ? 0.6 : 1,
                    transition: 'border-color 150ms, box-shadow 150ms'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                >
                  <option value="">— Choose an assessment —</option>
                  {assessments.map(a => <option key={a._id} value={a._id}>{a.title} · {a.type}</option>)}
                </select>
                <ChevronDown size={17} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
              </div>
              {selectedCourse && assessments.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5 font-medium">
                  <AlertTriangle size={13} /> Publish an exam or coding assignment before opening a room.
                </p>
              )}
            </div>

            <button
              onClick={handleCreateSession}
              disabled={!selectedAssessment}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 16px rgba(79,70,229,0.3)', cursor: !selectedAssessment ? 'not-allowed' : 'pointer' }}
            >
              <Zap size={18} />
              Generate Session PIN & Enter Monitor Room
            </button>
          </div>

          {/* Info points */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            {[
              'Students enter the 6-digit PIN on the exam page to join your session',
              'Only authenticated students enrolled in the selected course can join',
              'Behavioral biometrics are monitored in real-time during the session',
              'Refreshing will not end your session — it is persisted automatically',
            ].map((point, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 size={14} className="text-brand-500 flex-shrink-0" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
