import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Shield, 
  UserCheck, 
  Eye, 
  Zap, 
  Bell, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  StopCircle, 
  X, 
  ChevronRight, 
  Users, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import BehaviorReportModal from '../components/Common/BehaviorReportModal';

export default function LiveProctorDashboard() {
  const [courses, setCourses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [selectedAssessmentData, setSelectedAssessmentData] = useState(null);

  const [sessionPin, setSessionPin] = useState(null);
  const [assessmentSessionId, setAssessmentSessionId] = useState(null);
  const [sessionState, setSessionState] = useState('WAITING'); // WAITING, ACTIVE, ENDED
  const [students, setStudents] = useState([]);
  const [liveScores, setLiveScores] = useState({});
  const [riskNotifications, setRiskNotifications] = useState([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const socketRef = useRef(null);
  const prevRiskMapRef = useRef({});
  const timerRef = useRef(null);

  // Restore active proctor session on page refresh (F5 resilience)
  useEffect(() => {
    const savedPin = sessionStorage.getItem('activeProctorPin');
    const savedAssessment = sessionStorage.getItem('activeProctorAssessment');
    const savedState = sessionStorage.getItem('activeProctorState');
    if (savedPin && savedAssessment) {
      setSessionPin(savedPin);
      setSelectedAssessment(savedAssessment);
      setSessionState(savedState || 'ACTIVE');
    }
  }, []);

  useEffect(() => {
    if (sessionPin && sessionState !== 'ENDED') {
      sessionStorage.setItem('activeProctorPin', sessionPin);
      sessionStorage.setItem('activeProctorAssessment', selectedAssessment);
      sessionStorage.setItem('activeProctorState', sessionState);
    } else if (sessionState === 'ENDED') {
      sessionStorage.removeItem('activeProctorPin');
      sessionStorage.removeItem('activeProctorAssessment');
      sessionStorage.removeItem('activeProctorState');
    }
  }, [sessionPin, selectedAssessment, sessionState]);

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

  // Timer effect for session elapsed time
  useEffect(() => {
    if (sessionState === 'ACTIVE') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState]);

  // Handle Socket Events
  useEffect(() => {
    if (sessionPin) {
      const socketUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
      socketRef.current = io(socketUrl, { transports: ['websocket', 'polling'] });
      const socket = socketRef.current;

      socket.emit('create-session', { examId: selectedAssessment, pin: sessionPin });

      socket.on('session-created', (data) => {
        if (data?.assessmentSessionId) {
          setAssessmentSessionId(data.assessmentSessionId);
        }
      });

      socket.on('student-joined', (updatedStudents) => {
        const uniqueMap = {};
        (updatedStudents || []).forEach(s => {
          const key = String(s._id || s.id || '');
          if (key) uniqueMap[key] = { ...s, isOnline: true, lastSeen: Date.now() };
        });
        setStudents(Object.values(uniqueMap));
      });

      socket.on('student-left', (updatedStudents) => {
        setStudents(prevStudents => {
          const activeIds = new Set((updatedStudents || []).map(s => String(s._id || s.id || '')));
          return prevStudents.map(s => {
            const sId = String(s._id || s.id || '');
            return {
              ...s,
              isOnline: activeIds.has(sId)
            };
          });
        });
      });

      socket.on('live_score', (data) => {
        const sId = String(data.studentId);
        const newRisk = (data.riskLevel || 'low').toUpperCase();
        const prevRisk = prevRiskMapRef.current[sId] || 'LOW';

        // Check for meaningful risk escalation
        const riskRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        if (riskRank[newRisk] > riskRank[prevRisk]) {
          const notification = {
            id: Date.now(),
            studentId: sId,
            studentName: data.studentName || 'Candidate',
            fromRisk: prevRisk,
            toRisk: newRisk,
            trustScore: Math.round(data.trustScore ?? 100),
            timestamp: new Date().toLocaleTimeString()
          };
          setRiskNotifications(prev => [notification, ...prev].slice(0, 5));
        }

        prevRiskMapRef.current[sId] = newRisk;

        setLiveScores(prev => ({
          ...prev,
          [sId]: {
            ...data,
            lastSeen: Date.now()
          }
        }));
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [sessionPin, selectedAssessment]);

  const handleCreateSession = () => {
    if (!selectedAssessment) return;
    const chosen = assessments.find(a => a._id === selectedAssessment);
    setSelectedAssessmentData(chosen);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setSessionPin(pin);
    setSessionState('WAITING');
  };

  const handleStartExam = () => {
    if (socketRef.current) {
      socketRef.current.emit('start-exam', { pin: sessionPin });
      setSessionState('ACTIVE');
    }
  };

  const handleEndSession = () => {
    if (socketRef.current && sessionPin) {
      socketRef.current.emit('end-session', { pin: sessionPin });
      socketRef.current.disconnect();
    }
    setSessionState('ENDED');
    sessionStorage.removeItem('activeProctorPin');
    sessionStorage.removeItem('activeProctorAssessment');
    sessionStorage.removeItem('activeProctorState');
  };

  const handleResetProctorRoom = () => {
    handleEndSession();
    setSessionPin(null);
    setAssessmentSessionId(null);
    setSessionState('WAITING');
    setStudents([]);
    setLiveScores({});
    setSelectedAssessment('');
    setElapsedSeconds(0);
  };

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getLiveScoreFor = (student) => {
    if (!student) return null;
    const idStr = String(student._id || student.id || '');
    return liveScores[idStr] || null;
  };

  // Summary Metrics
  const onlineCount = students.filter(s => s.isOnline !== false).length;
  const scoresList = Object.values(liveScores).map(s => s.trustScore).filter(val => typeof val === 'number');
  const avgTrustScore = scoresList.length > 0 ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length) : null;
  const highRiskCount = Object.values(liveScores).filter(s => (s.riskLevel || '').toLowerCase() === 'high' || (s.riskLevel || '').toLowerCase() === 'critical').length;
  const totalTabSwitches = Object.values(liveScores).reduce((acc, s) => acc + (s.tabBlurCount || 0), 0);
  const totalPastes = Object.values(liveScores).reduce((acc, s) => acc + (s.pasteCount || 0), 0);

  const getRiskBadge = (riskLevel) => {
    const lvl = (riskLevel || 'low').toLowerCase();
    if (lvl === 'critical') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-950/80 text-rose-300 border border-rose-600 animate-pulse">CRITICAL</span>;
    }
    if (lvl === 'high') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">HIGH</span>;
    }
    if (lvl === 'medium') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">MEDIUM</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">LOW</span>;
  };

  const getFormattedActivityTime = (lastSeen) => {
    if (!lastSeen) return 'Waiting';
    const diff = Math.floor((Date.now() - lastSeen) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff} sec ago`;
    return `${Math.floor(diff / 60)} min ago`;
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
                <h1 className="text-2xl font-black tracking-tight">{selectedAssessmentData?.title || 'Coding Assessment'}</h1>
                <p className="text-slate-400 text-xs mt-0.5">Academic Proctoring Control Room • Continuous Behavioural Biometrics</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 self-end md:self-auto">
            {/* Status Indicator */}
            {sessionState === 'WAITING' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-950/80 border border-amber-500/50 rounded-xl text-amber-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>WAITING ROOM</span>
              </div>
            )}
            {sessionState === 'ACTIVE' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-400 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>LIVE ASSESSMENT ({formatElapsed(elapsedSeconds)})</span>
              </div>
            )}
            {sessionState === 'ENDED' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 text-xs font-bold">
                <StopCircle className="w-4 h-4 text-slate-400" />
                <span>ASSESSMENT ENDED</span>
              </div>
            )}

            {/* Exit / Return to Selection Screen Button */}
            <button
              onClick={handleResetProctorRoom}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              title="Exit this room and select another assessment"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Exit / New Session</span>
            </button>

            {/* Session Actions */}
            {sessionState === 'WAITING' && (
              <button
                onClick={handleStartExam}
                disabled={students.length === 0}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Start Assessment</span>
              </button>
            )}

            {sessionState === 'ACTIVE' && (
              <button
                onClick={handleEndSession}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                <span>End Session</span>
              </button>
            )}

            {sessionState === 'ENDED' && (
              <button
                onClick={handleResetProctorRoom}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Start New Session</span>
              </button>
            )}

            <div className="text-right border-l border-slate-700 pl-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Session PIN</p>
              <div className="bg-slate-800 px-4 py-1 rounded-lg border border-slate-700 font-mono text-xl tracking-widest font-bold text-brand-400">
                {sessionPin}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Transition Banner Notifications */}
        {riskNotifications.length > 0 && (
          <div className="space-y-2">
            {riskNotifications.map(n => (
              <div key={n.id} className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      Behavioural Risk Escalated: <span className="underline">{n.studentName}</span>
                    </p>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                      Risk level moved from <span className="font-bold">{n.fromRisk}</span> &rarr; <span className="font-extrabold underline">{n.toRisk}</span> (Trust Score: {n.trustScore}%)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRiskNotifications(prev => prev.filter(item => item.id !== n.id))}
                  className="text-rose-400 hover:text-rose-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Session Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Candidates</p>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">{students.length}</h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Online Candidates</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{onlineCount}</h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Avg Trust Score</p>
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {avgTrustScore !== null ? `${avgTrustScore}%` : 'N/A'}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">High Risk</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{highRiskCount}</h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Tab Switches</p>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{totalTabSwitches}</h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Paste Events</p>
            <h3 className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalPastes}</h3>
          </div>
        </div>

        {/* Candidate Proctoring Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-500" />
                <span>Candidate Proctoring Matrix</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Live candidate telemetry synchronized per assessment session</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 pl-6">Candidate</th>
                  <th className="p-4 min-w-[180px]">Trust Score</th>
                  <th className="p-4">Risk Level</th>
                  <th className="p-4 text-center">Tab Switches</th>
                  <th className="p-4 text-center">Pastes</th>
                  <th className="p-4 text-center">Last Activity</th>
                  <th className="p-4 text-center">Connection</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 italic">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-brand-500 opacity-40 animate-pulse" />
                        <p className="text-base font-semibold">Waiting for candidates to join room with PIN {sessionPin}...</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  students.map((student, i) => {
                    const studentId = String(student._id || student.id || '');
                    const live = getLiveScoreFor(student);
                    const trustScore = live?.trustScore ?? live?.smoothedScore ?? null;
                    const formattedScore = trustScore !== null ? Math.round(trustScore) : null;
                    const isDegraded = live?.degraded || live?.mlState === 'degraded';
                    const isOnline = student.isOnline !== false;

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
                            </div>
                          </div>
                        </td>

                        {/* Live Trust Score */}
                        <td className="p-4">
                          {isDegraded ? (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ML Service Degraded
                            </span>
                          ) : formattedScore !== null ? (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-500">Trust:</span>
                                <span className={`font-black ${formattedScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : formattedScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {formattedScore}%
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
                          ) : sessionState === 'ACTIVE' ? (
                            <span className="text-xs text-slate-400 italic">Sampling telemetry...</span>
                          ) : (
                            <span className="text-xs text-slate-400">Waiting for start</span>
                          )}
                        </td>

                        {/* Risk Level */}
                        <td className="p-4">
                          {getRiskBadge(live?.riskLevel)}
                        </td>

                        {/* Tab Switches */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            (live?.tabBlurCount || 0) > 0 
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {live?.tabBlurCount || 0}
                          </span>
                        </td>

                        {/* Pastes */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            (live?.pasteCount || 0) > 0 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {live?.pasteCount || 0}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td className="p-4 text-center text-xs text-slate-500 font-medium">
                          {getFormattedActivityTime(live?.lastSeen || student.lastSeen)}
                        </td>

                        {/* Connection Status */}
                        <td className="p-4 text-center">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Offline
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedStudentForModal({ student, live })}
                            className="px-3 py-1.5 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 text-brand-600 dark:text-brand-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 border border-brand-200 dark:border-brand-800"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Candidate Detail Modal / Side Panel */}
        {selectedStudentForModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-extrabold text-base flex items-center justify-center border border-brand-200 dark:border-brand-800">
                    {selectedStudentForModal.student.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedStudentForModal.student.name}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedStudentForModal.student.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Trust Score</p>
                  <p className="text-xl font-black text-brand-600 dark:text-brand-400 mt-1">
                    {selectedStudentForModal.live?.trustScore !== undefined 
                      ? `${Math.round(selectedStudentForModal.live.trustScore)}%` 
                      : 'N/A'}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Risk Level</p>
                  <div className="mt-1">
                    {getRiskBadge(selectedStudentForModal.live?.riskLevel)}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Tab Switches</p>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {selectedStudentForModal.live?.tabBlurCount || 0}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Paste Events</p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {selectedStudentForModal.live?.pasteCount || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Connection Status:</span>
                  <span className="font-bold">{selectedStudentForModal.student.isOnline !== false ? 'Online' : 'Offline'}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">ML Engine Status:</span>
                  <span className="font-bold">{selectedStudentForModal.live?.degraded ? 'Degraded Fallback' : 'Active Model'}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Session Isolation ID:</span>
                  <span className="font-mono">{assessmentSessionId?.slice(-8) || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => {
                    const studentObj = selectedStudentForModal.student;
                    setReportStudent(studentObj);
                    setIsReportModalOpen(true);
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  View Detailed Report
                </button>
                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Behavior Report Modal */}
        <BehaviorReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          assessmentSessionId={assessmentSessionId}
          studentId={String(reportStudent?._id || reportStudent?.id || '')}
          studentName={reportStudent?.name}
        />
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
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Create Assessment Session</h1>
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
