import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Layout from '../components/Common/Layout';
import {
  Shield, AlertTriangle, UserCheck, Eye, RefreshCw, Zap,
  CheckCircle2, XCircle, Clock, Monitor, Copy, Clipboard,
  ChevronRight, ChevronDown, Activity, BarChart2, BookOpen, Code2, Plus,
  Users, CheckCheck, AlertCircle, ArrowRight, CheckCircle, FileCode
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  if (alert.alertType === 'behavioral_anomaly') return 'Typing rhythm deviated from baseline.';
  if (alert.alertType === 'paste_detected') return `Pasted ${alert.topDeviatingFeatures?.totalPastedChars || ''} chars.`;
  if (alert.alertType === 'copy_detected') return `Copied ${alert.topDeviatingFeatures?.totalCopiedChars || ''} chars.`;
  if (alert.alertType === 'device_change') return 'Device/resolution changed mid-exam.';
  if (alert.alertType === 'tab_switch') return `Tab switched (${alert.topDeviatingFeatures?.tabBlurCount || ''}×).`;
  return 'Anomaly detected.';
};

// ─── Student Row ──────────────────────────────────────────────────────────────
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
            onClick={() => onRetrain(studentId)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
            style={{ border: '1px solid #c7d2fe' }}
            title="Retrain model"
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
  const [selectedJoins, setSelectedJoins] = useState(new Set()); // for selective approval
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);

  const socketRef = useRef(null);
  // Persist session state in sessionStorage so refresh doesn't kill it
  const [pinPersisted] = useState(() => sessionStorage.getItem('lms_session_pin') || null);

  useEffect(() => {
    axios.get('/api/courses', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => setCourses(res.data))
      .catch(console.error);

    // Restore session if it was active
    if (pinPersisted) {
      setSessionPin(pinPersisted);
      setSessionActive(sessionStorage.getItem('lms_session_active') === 'true');
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      axios.get(`/api/courses/${selectedCourse}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => {
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

      socket.emit('create-session', { examId: selectedAssessment || sessionStorage.getItem('lms_session_exam'), pin: sessionPin });

      socket.on('student-joined', (updatedStudents) => {
        setStudents(dedup(updatedStudents));
      });

      socket.on('join-request', (data) => {
        setPendingJoins(prev => [...prev.filter(p => p.studentId !== data.studentId), data]);
        setSelectedJoins(prev => new Set([...prev, data.studentId])); // auto-select incoming
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
        // Don't disconnect on component re-render — only disconnect explicitly
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
    setLiveScores({}); setLiveAlerts([]); setStudents([]); setPendingJoins([]); setSelectedJoins(new Set());
    setSessionActive(false);
  };

  const handleStartExam = () => {
    if (socketRef.current) {
      setLiveScores({}); setLiveAlerts([]);
      socketRef.current.emit('start-exam', { pin: sessionPin });
      setSessionActive(true);
      sessionStorage.setItem('lms_session_active', 'true');
    }
  };

  const handleEndSession = () => {
    if (socketRef.current) {
      socketRef.current.emit('end-session', { pin: sessionPin });
      socketRef.current.disconnect();
    }
    sessionStorage.removeItem('lms_session_pin');
    sessionStorage.removeItem('lms_session_exam');
    sessionStorage.removeItem('lms_session_active');
    setSessionPin(null);
    setSessionActive(false);
    setStudents([]); setLiveAlerts([]); setPendingJoins([]);
  };

  const handleApproveJoin = (studentId) => {
    if (socketRef.current) {
      socketRef.current.emit('approve-join', { pin: sessionPin, studentId });
      setPendingJoins(prev => prev.filter(p => p.studentId !== studentId));
      setSelectedJoins(prev => { const n = new Set(prev); n.delete(studentId); return n; });
    }
  };

  const handleDenyJoin = (studentId) => {
    if (socketRef.current) {
      socketRef.current.emit('deny-join', { pin: sessionPin, studentId });
      setPendingJoins(prev => prev.filter(p => p.studentId !== studentId));
      setSelectedJoins(prev => { const n = new Set(prev); n.delete(studentId); return n; });
    }
  };

  const handleApproveSelected = () => {
    selectedJoins.forEach(sid => handleApproveJoin(sid));
  };

  const handleApproveAll = () => {
    pendingJoins.forEach(req => handleApproveJoin(req.studentId));
  };

  const toggleSelectJoin = (studentId) => {
    setSelectedJoins(prev => {
      const n = new Set(prev);
      if (n.has(studentId)) n.delete(studentId);
      else n.add(studentId);
      return n;
    });
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
      <Layout>
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
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!sessionActive ? (
                    <button
                      onClick={handleStartExam}
                      disabled={students.length === 0}
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

          {/* Pending Join Requests — with checkboxes for selective approval */}
          {pendingJoins.length > 0 && (
            <div className="lms-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  Join Requests
                  <span className="lms-badge badge-amber">{pendingJoins.length}</span>
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleApproveSelected}
                    disabled={selectedJoins.size === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-600 hover:bg-brand-50 disabled:opacity-40 transition-colors"
                    style={{ border: '1.5px solid #c7d2fe' }}
                  >
                    <CheckCircle size={13} /> Approve Selected ({selectedJoins.size})
                  </button>
                  <button
                    onClick={handleApproveAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                    style={{ background: '#4f46e5' }}
                  >
                    <CheckCheck size={13} /> Approve All
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {pendingJoins.map((req, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl"
                    style={{ background: selectedJoins.has(req.studentId) ? '#f0f4ff' : '#fffbeb', border: `1.5px solid ${selectedJoins.has(req.studentId) ? '#c7d2fe' : '#fde68a'}` }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedJoins.has(req.studentId)}
                      onChange={() => toggleSelectJoin(req.studentId)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                    />
                    <div className="flex items-center gap-3 flex-1">
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
              <p className="text-sm text-slate-500 mt-0.5">Students join with a PIN, and you approve each request.</p>
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
                <FileCode size={14} style={{ color: '#4f46e5' }} /> Select Coding Assessment
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
                  {assessments.map(a => <option key={a._id} value={a._id}>{a.title} ({a.language || 'JS'})</option>)}
                </select>
                <ChevronDown size={17} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
              </div>
              {selectedCourse && assessments.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5 font-medium">
                  <AlertTriangle size={13} /> No coding assignments published in this course yet.
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
              'Each join request requires your explicit approval — you can approve all or selectively',
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
