import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Shield, AlertTriangle, UserCheck, Eye, RefreshCw, Zap, Bell, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

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
  const [showAlertDrawer, setShowAlertDrawer] = useState(true);

  const socketRef = useRef(null);

  // Initial fetch for courses
  useEffect(() => {
    axios.get('/api/courses', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => setCourses(res.data))
      .catch(console.error);
  }, []);

  // Fetch assessments when course changes
  useEffect(() => {
    if (selectedCourse) {
      axios.get(`/api/courses/${selectedCourse}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => {
          const courseQuizzes = res.data.quizzes?.map(q => ({ ...q, type: 'Quiz' })) || [];
          const courseAssignments = res.data.assignments?.map(a => ({ ...a, type: 'Assignment' })) || [];
          setAssessments([...courseQuizzes, ...courseAssignments]);
        })
        .catch(console.error);
    } else {
      setAssessments([]);
    }
  }, [selectedCourse]);

  // Handle Socket Events
  useEffect(() => {
    if (sessionPin) {
      const socketUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
      socketRef.current = io(socketUrl, { transports: ['websocket', 'polling'] });
      const socket = socketRef.current;

      socket.emit('create-session', { examId: selectedAssessment, pin: sessionPin });

      socket.on('student-joined', (updatedStudents) => {
        setStudents(updatedStudents);
      });

      socket.on('student-left', (updatedStudents) => {
        setStudents(updatedStudents);
      });

      socket.on('student-anomaly', ({ studentId, alert }) => {
        setStudents(currentStudents => {
          const student = currentStudents.find(s => 
            String(s._id) === String(studentId) || 
            String(s.id) === String(studentId)
          );
          const enrichedAlert = { ...alert, student: student || (currentStudents[0] ? currentStudents[0] : { name: 'Candidate Student' }) };
          setLiveAlerts(prev => [enrichedAlert, ...prev]);
          return currentStudents;
        });
      });

      socket.on('live_score', (data) => {
        setLiveScores(prev => ({
          ...prev,
          [data.studentId]: data
        }));
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [sessionPin, selectedAssessment]);

  const handleCreateSession = () => {
    if (!selectedAssessment) return;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setSessionPin(pin);
  };

  const handleStartExam = () => {
    if (socketRef.current) {
      socketRef.current.emit('start-exam', { pin: sessionPin });
      setSessionActive(true);
    }
  };

  const getReason = (alert) => {
    if (alert.alertType === 'behavioral_anomaly') return "Typing rhythm or mouse kinetics deviated from historical baseline.";
    if (alert.alertType === 'paste_detected') return `Student pasted ${alert.topDeviatingFeatures?.totalPastedChars || 'a block of'} characters.`;
    if (alert.alertType === 'device_change') return "Student changed devices or resolution mid-exam.";
    if (alert.alertType === 'tab_switch') return `Student switched away from exam tab (${alert.topDeviatingFeatures?.tabBlurCount || ''}x).`;
    return "Unknown anomaly detected.";
  };

  const getLiveScoreFor = (student) => {
    return liveScores[student._id] || liveScores[student.id] || null;
  };

  const getAlertCountForStudent = (studentId) => {
    return liveAlerts.filter(a => a.student?._id === studentId || a.student?.id === studentId || a.student === studentId).length;
  };

  const riskBadge = (riskLevel) => {
    if (riskLevel === 'high') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">HIGH RISK</span>;
    }
    if (riskLevel === 'medium') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">MEDIUM</span>;
    }
    if (riskLevel === 'low') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">LOW</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">NORMAL</span>;
  };

  if (sessionPin) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Control Room Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-6 rounded-2xl shadow-xl border-b-4 border-brand-500 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-brand-400" />
              <div>
                <h1 className="text-2xl font-black tracking-tight">Safe Exam Browser - Proctor Control Room</h1>
                <p className="text-slate-400 text-xs mt-0.5">Continuous Behavioral Biometrics & Live Telemetry Monitoring</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 self-end md:self-auto">
            {!sessionActive ? (
              <button
                onClick={handleStartExam}
                disabled={students.length === 0}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Start Assessment</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-400 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>SESSION ACTIVE</span>
              </div>
            )}

            <div className="text-right border-l border-slate-700 pl-6">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Session PIN</p>
              <div className="bg-slate-800 px-5 py-1.5 rounded-lg border border-slate-700 font-mono text-2xl tracking-widest font-bold text-brand-400">
                {sessionPin}
              </div>
            </div>
          </div>
        </div>

        {/* Unified SEB Monitoring Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-500" />
                <span>Connected Candidates ({students.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time telemetry stream synchronized per 5-second sampling window</p>
            </div>

            <button
              onClick={() => setShowAlertDrawer(!showAlertDrawer)}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span>{showAlertDrawer ? 'Hide Anomaly Feed' : `Show Anomaly Feed (${liveAlerts.length})`}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 pl-6">Student Candidate</th>
                  <th className="p-4">Model Baseline</th>
                  <th className="p-4 min-w-[180px]">Live Trust Score</th>
                  <th className="p-4">Risk Level</th>
                  <th className="p-4 text-center">Tab Switches</th>
                  <th className="p-4 text-center">Pastes</th>
                  <th className="p-4 text-center">Alerts</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400 italic">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-brand-500 opacity-40" />
                        <p className="text-base font-semibold">Waiting for candidates to join room with PIN {sessionPin}...</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  students.map((student, i) => {
                    const studentId = student._id || student.id;
                    const live = getLiveScoreFor(student);
                    const alertCount = getAlertCountForStudent(studentId);
                    const trustScore = live?.trustScore ?? live?.smoothedScore ?? null;
                    const formattedScore = trustScore !== null ? Math.round(trustScore) : null;
                    const modelState = live?.state || 'ready';

                    return (
                      <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Student Info */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-extrabold text-sm flex items-center justify-center border border-brand-200 dark:border-brand-800">
                              {student.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{student.name}</p>
                              <p className="text-xs text-slate-500">{student.email}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {studentId?.slice(-6)}</p>
                            </div>
                          </div>
                        </td>

                        {/* Model Baseline */}
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 capitalize">
                            {modelState}
                          </span>
                        </td>

                        {/* Live Trust Score */}
                        <td className="p-4">
                          {formattedScore !== null ? (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-500">Trust:</span>
                                <span className={`font-black ${formattedScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : formattedScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {formattedScore} / 100
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    formattedScore >= 70 ? 'bg-emerald-500' : formattedScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${formattedScore}%` }}
                                />
                              </div>
                            </div>
                          ) : sessionActive ? (
                            <span className="text-xs text-slate-400 italic">Sampling telemetry...</span>
                          ) : (
                            <span className="text-xs text-slate-400">Waiting for start</span>
                          )}
                        </td>

                        {/* Risk Level */}
                        <td className="p-4">
                          {riskBadge(live?.riskLevel)}
                        </td>

                        {/* Tab Switches */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            (live?.tabBlurCount || 0) > 0 
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {live?.tabBlurCount || 0}x
                          </span>
                        </td>

                        {/* Pastes */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            (live?.pasteCount || 0) > 0 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {live?.pasteCount || 0}x
                          </span>
                        </td>

                        {/* Alerts */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                            alertCount > 0 
                              ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}>
                            {alertCount}
                          </span>
                        </td>

                        {/* Connection Status */}
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await axios.post(`/api/behavior/retrain/${studentId}`, {}, {
                                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                  });
                                  alert(`Retrain Status: ${res.data.reason || 'Model retrained successfully!'}`);
                                } catch (err) {
                                  alert(`Retrain Error: ${err.response?.data?.message || err.message}`);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 text-brand-600 dark:text-brand-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 border border-brand-200 dark:border-brand-800"
                              title="Retrain Isolation Forest model on verified sessions"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-brand-500" />
                              <span>Retrain</span>
                            </button>
                            <button
                              onClick={() => alert(`Reviewing candidate: ${student.name}`)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collapsible Real-Time Anomaly Log Feed */}
        {showAlertDrawer && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Real-Time Anomaly Event Stream</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">{liveAlerts.length} Events Flagged</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
              {liveAlerts.length === 0 ? (
                <p className="text-center text-slate-400 text-xs italic py-6">No security anomalies flagged yet for this session.</p>
              ) : (
                liveAlerts.map((alert, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{alert.student?.name || 'Student Candidate'}</p>
                        <p className="text-rose-600 dark:text-rose-300 text-xs mt-0.5 font-medium">{getReason(alert)}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {new Date(alert.createdAt || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto mt-10">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto transform rotate-3 shadow-md">
          <Shield className="w-8 h-8" />
        </div>
        
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Create Safe Exam Room</h1>
          <p className="text-slate-500 text-sm mt-1">Generate a secure room PIN for students to join proctored coding assessments.</p>
        </div>

        <div className="max-w-md mx-auto space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Select Course</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
            >
              <option value="">-- Choose a Course --</option>
              {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Select Coding Assessment</label>
            <select
              value={selectedAssessment}
              onChange={e => setSelectedAssessment(e.target.value)}
              disabled={!selectedCourse || assessments.length === 0}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium disabled:opacity-50"
            >
              <option value="">-- Choose an Assessment --</option>
              {assessments.map(a => <option key={a._id} value={a._id}>{a.type}: {a.title}</option>)}
            </select>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={!selectedAssessment}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl mt-4 shadow-lg shadow-brand-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>Generate Session PIN</span>
          </button>
        </div>
      </div>
    </div>
  );
}
