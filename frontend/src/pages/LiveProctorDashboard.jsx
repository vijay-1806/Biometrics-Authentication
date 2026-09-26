import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Layout from '../components/Common/Layout';
import {
  Shield, AlertTriangle, UserCheck, Eye, RefreshCw, Zap,
  CheckCircle2, XCircle, Clock, Monitor, Copy, Clipboard,
  ChevronRight, Activity, BarChart2, BookOpen, Code2
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────
const getRiskColor = (level) => {
  if (level === 'high')   return { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' };
  if (level === 'medium') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
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
  if (alert.alertType === 'behavioral_anomaly') return 'Typing rhythm or mouse kinetics deviated from historical baseline.';
  if (alert.alertType === 'paste_detected') return `Student pasted ${alert.topDeviatingFeatures?.totalPastedChars || ''} characters.`;
  if (alert.alertType === 'copy_detected') return `Student copied ${alert.topDeviatingFeatures?.totalCopiedChars || ''} characters from exam.`;
  if (alert.alertType === 'device_change') return 'Student changed devices or resolution mid-exam.';
  if (alert.alertType === 'tab_switch') return `Student switched away from exam tab (${alert.topDeviatingFeatures?.tabBlurCount || ''}×).`;
  return 'Unknown anomaly detected.';
};

// ─── Student Row ──────────────────────────────────────────────────────────
const StudentRow = ({ student, live, alertCount, sessionActive, onInspect, onRetrain }) => {
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
      {/* Student */}
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

      {/* Model */}
      <td><span className={`lms-badge ${modelBadge.cls}`}>{modelBadge.label}</span></td>

      {/* Trust Score */}
      <td>
        {score !== null ? <TrustBar score={score} /> :
         sessionActive ? <span className="text-xs text-slate-400 italic">Sampling...</span> :
         <span className="text-xs text-slate-400">Waiting...</span>}
      </td>

      {/* Risk */}
      <td><RiskBadge level={live?.riskLevel} /></td>

      {/* Behavioral Metrics */}
      <td>
        <div className="flex gap-1.5">
          <StatChip value={live?.tabBlurCount || 0} label="Tabs" alert color={{ bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' }} />
          <StatChip value={live?.pasteCount || 0} label="Paste" alert color={{ bg: '#fffbeb', text: '#d97706', border: '#fde68a' }} />
          <StatChip value={live?.copyCount || 0} label="Copy" alert color={{ bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' }} />
        </div>
      </td>

      {/* Alerts */}
      <td className="text-center">
        {alertCount > 0 ? (
          <span className="lms-badge badge-red">
            <AlertTriangle size={11} />
            {alertCount}
          </span>
        ) : (
          <span className="lms-badge badge-green"><CheckCircle2 size={11} /> 0</span>
        )}
      </td>

      {/* Status */}
      <td className="text-center">
        <span className="lms-badge badge-green">
          <span className="dot-pulse w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e' }} />
          Active
        </span>
      </td>

      {/* Actions */}
      <td>
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => onRetrain(studentId)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
            style={{ border: '1px solid #c7d2fe' }}
            title="Retrain model on verified sessions"
          >
            <RefreshCw size={12} /> Retrain
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

// ─── Inspect Modal ─────────────────────────────────────────────────────────
const InspectModal = ({ student, live, alerts, onClose }) => {
  if (!student) return null;
  const studentId = student._id || student.id;
  const trustScore = live?.trustScore ?? live?.smoothedScore ?? null;
  const score = trustScore !== null ? Math.round(trustScore) : null;

  const metrics = [
    { label: 'Trust Score', value: score !== null ? `${score}/100` : 'Sampling...', icon: <Activity size={16} className="text-brand-600" /> },
    { label: 'Risk Level', value: live?.riskLevel ? live.riskLevel.charAt(0).toUpperCase() + live.riskLevel.slice(1) : 'Normal', icon: <Shield size={16} className="text-slate-500" /> },
    { label: 'Tab Switches', value: `${live?.tabBlurCount || 0}×`, icon: <Monitor size={16} className="text-slate-500" /> },
    { label: 'Paste Events', value: `${live?.pasteCount || 0}×`, icon: <Clipboard size={16} className="text-amber-500" /> },
    { label: 'Copy Events', value: `${live?.copyCount || 0}×`, icon: <Copy size={16} className="text-purple-500" /> },
    { label: 'Alerts Fired', value: alerts.length, icon: <AlertTriangle size={16} className="text-rose-500" /> },
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

        {/* Violations */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Activity Log ({alerts.length} events)
          </h4>
          <div className="max-h-36 overflow-y-auto space-y-1.5">
            {alerts.length === 0 ? (
              <div className="text-center py-5 text-slate-400">
                <CheckCircle2 size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-medium">No anomalies logged.</p>
              </div>
            ) : alerts.map((alert, idx) => (
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LiveProctorDashboard() {
  const [courses, setCourses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');

  const [sessionPin, setSessionPin] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [students, setStudents] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveScores, setLiveScores] = useState({});
  const [inspectedStudent, setInspectedStudent] = useState(null);
  const [pendingJoins, setPendingJoins] = useState([]);

  const socketRef = useRef(null);

  useEffect(() => {
    axios.get('/api/courses', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => setCourses(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      axios.get(`/api/courses/${selectedCourse}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => {
          // Only code assignments, no quizzes
          const courseAssignments = res.data.assignments?.map(a => ({ ...a, type: 'Assignment' })) || [];
          setAssessments(courseAssignments);
        }).catch(console.error);
    } else {
      setAssessments([]);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (sessionPin) {
      const socketHost = `http://${window.location.hostname}:5000`;
      socketRef.current = io(socketHost, { transports: ['websocket'] });
      const socket = socketRef.current;

      socket.emit('create-session', { examId: selectedAssessment, pin: sessionPin });

      socket.on('student-joined', (updatedStudents) => {
        setStudents(dedup(updatedStudents));
      });

      socket.on('join-request', (data) => {
        setPendingJoins(prev => [...prev.filter(p => p.studentId !== data.studentId), data]);
      });

      socket.on('student-left', (updatedStudents) => {
        setStudents(dedup(updatedStudents));
      });

      socket.on('student-anomaly', ({ studentId, alert }) => {
        setStudents(curr => {
          const student = curr.find(s => s._id === studentId || s.id === studentId);
          setLiveAlerts(prev => [{ ...alert, student: student || { name: 'Unknown' } }, ...prev]);
          return curr;
        });
      });

      socket.on('live_score', (data) => {
        setLiveScores(prev => ({ ...prev, [data.studentId]: data }));
      });

      return () => socket.disconnect();
    }
  }, [sessionPin, selectedAssessment]);

  const dedup = (arr) => {
    const seen = new Set();
    return arr.filter(s => { const id = s._id || s.id; if (seen.has(id)) return false; seen.add(id); return true; });
  };

  const handleCreateSession = () => {
    if (!selectedAssessment) return;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setSessionPin(pin);
    setLiveScores({}); setLiveAlerts([]); setStudents([]); setPendingJoins([]);
    setSessionActive(false);
  };

  const handleStartExam = () => {
    if (socketRef.current) {
      setLiveScores({}); setLiveAlerts([]);
      socketRef.current.emit('start-exam', { pin: sessionPin });
      setSessionActive(true);
    }
  };

  const handleApproveJoin = (studentId) => {
    if (socketRef.current) {
      socketRef.current.emit('approve-join', { pin: sessionPin, studentId });
      setPendingJoins(prev => prev.filter(p => p.studentId !== studentId));
    }
  };

  const handleDenyJoin = (studentId) => {
    if (socketRef.current) {
      socketRef.current.emit('deny-join', { pin: sessionPin, studentId });
      setPendingJoins(prev => prev.filter(p => p.studentId !== studentId));
    }
  };

  const handleRetrain = async (studentId) => {
    try {
      const res = await axios.post(`/api/behavior/retrain/${studentId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(`Retrain: ${res.data.reason || 'Model retrained successfully!'}`);
    } catch (err) {
      alert(`Retrain Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const getLiveScoreFor = (student) => liveScores[student._id] || liveScores[student.id] || null;
  const getAlertCount = (studentId) =>
    liveAlerts.filter(a => a.student?._id === studentId || a.student?.id === studentId || a.student === studentId).length;

  // ─── Active Session View ────────────────────────────────────────────────
  if (sessionPin) {
    const alertsTotal = liveAlerts.length;
    const highRiskCount = students.filter(s => {
      const live = getLiveScoreFor(s);
      return live?.riskLevel === 'high';
    }).length;

    return (
      <Layout>
        <div className="space-y-5">
          {/* Control Bar */}
          <div className="lms-card p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <Shield size={20} className="text-brand-600" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">Proctor Control Room</h1>
                  <p className="text-xs text-slate-500">Live behavioral biometrics monitoring</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* KPI chips */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl text-sm font-bold text-slate-700" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <span className="text-slate-500 text-xs">Students:</span> <span className="text-brand-700">{students.length}</span>
                  </div>
                  {highRiskCount > 0 && (
                    <div className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48' }}>
                      <AlertTriangle size={13} className="inline mr-1" />{highRiskCount} High Risk
                    </div>
                  )}
                  {alertsTotal > 0 && (
                    <div className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706' }}>
                      {alertsTotal} Alerts
                    </div>
                  )}
                </div>

                {/* PIN */}
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session PIN</p>
                  <div className="pin-display py-1.5 px-4 text-2xl mt-0.5">{sessionPin}</div>
                </div>

                {/* Start/Active */}
                {!sessionActive ? (
                  <button
                    onClick={handleStartExam}
                    disabled={students.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: '#4f46e5', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
                  >
                    <Zap size={16} />
                    Start Exam
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-green-700"
                    style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                    <span className="dot-pulse w-2 h-2 rounded-full bg-green-500 inline-block" />
                    LIVE
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pending Join Requests */}
          {pendingJoins.length > 0 && (
            <div className="lms-card p-5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
                <Clock size={16} className="text-amber-500" />
                Pending Join Requests
                <span className="lms-badge badge-amber">{pendingJoins.length}</span>
              </h3>
              <div className="space-y-2">
                {pendingJoins.map((req, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3.5 rounded-xl"
                    style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#e0e7ff', color: '#4338ca' }}>
                        {(req.studentName || 'S').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{req.studentName || 'Unknown Student'}</p>
                        <p className="text-xs text-slate-500">{req.studentEmail || ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDenyJoin(req.studentId)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        style={{ border: '1px solid #fecdd3' }}>
                        <XCircle size={13} /> Deny
                      </button>
                      <button
                        onClick={() => handleApproveJoin(req.studentId)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: '#4f46e5' }}>
                        <CheckCircle2 size={13} /> Approve
                      </button>
                    </div>
                  </div>
                ))}
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
                        onRetrain={handleRetrain}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Alerts Feed */}
          {liveAlerts.length > 0 && (
            <div className="lms-card p-5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-rose-500" />
                Recent Anomaly Alerts
                <span className="lms-badge badge-red ml-1">{liveAlerts.length}</span>
              </h3>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {liveAlerts.slice(0, 20).map((alert, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-xl text-xs"
                    style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">{alert.student?.name || 'Student'}: </span>
                        <span className="text-rose-700">{getReason(alert)}</span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-mono whitespace-nowrap">
                      {new Date(alert.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
      </Layout>
    );
  }

  // ─── Session Setup View ──────────────────────────────────────────────────
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
              <p className="text-sm text-slate-500 mt-0.5">Students join with a PIN and password, and you must approve each request.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="lms-label">Select Course</label>
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="lms-input"
              >
                <option value="">— Choose a course —</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>

            <div>
              <label className="lms-label">Select Coding Assessment</label>
              <select
                value={selectedAssessment}
                onChange={e => setSelectedAssessment(e.target.value)}
                disabled={!selectedCourse || assessments.length === 0}
                className="lms-input disabled:opacity-50"
              >
                <option value="">— Choose an assessment —</option>
                {assessments.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
              </select>
              {selectedCourse && assessments.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} /> No coding assignments in this course yet.
                </p>
              )}
            </div>

            <button
              onClick={handleCreateSession}
              disabled={!selectedAssessment}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 16px rgba(79,70,229,0.3)' }}
            >
              <Zap size={18} />
              Generate Session PIN
            </button>
          </div>

          {/* Info points */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            {[
              'Students must enter both the PIN and a session password to join',
              'Each join request requires your explicit approval',
              'Behavioral biometrics are monitored in real-time during the session',
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
