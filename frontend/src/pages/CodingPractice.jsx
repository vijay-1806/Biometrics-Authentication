import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import useBehaviorTracking from '../hooks/useBehaviorTracking';
import {
  Play,
  Send,
  Terminal,
  CheckCircle,
  XCircle,
  Info,
  History,
  FileCode,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
  Zap,
  Code2,
  Clock,
  CheckCircle2
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', monaco: 'javascript', ext: 'js' },
  { id: 'python', name: 'Python', monaco: 'python', ext: 'py' },
  { id: 'java', name: 'Java', monaco: 'java', ext: 'java' },
  { id: 'cpp', name: 'C++', monaco: 'cpp', ext: 'cpp' },
  { id: 'typescript', name: 'TypeScript', monaco: 'typescript', ext: 'ts' },
  { id: 'c', name: 'C', monaco: 'c', ext: 'c' }
];

const CodingPractice = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Query parameter PIN
  const queryPin = searchParams.get('sessionPin') || '';

  // ── Session state ──────────────────────────────────────────────────────────
  const [inSession, setInSession] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [sessionPinInput, setSessionPinInput] = useState(queryPin);
  const [sessionError, setSessionError] = useState('');
  const [sessionJoinedPin, setSessionJoinedPin] = useState('');
  const [sessionEndedModal, setSessionEndedModal] = useState(false);
  const socketRef = useRef(null);

  // Behavior tracking — only active after exam starts to avoid false tab-switch alerts
  const [examActive, setExamActive] = useState(false);

  // Persist session across refresh
  const persistedPin = sessionStorage.getItem(`exam_pin_${id}`) || '';
  const persistedInSession = sessionStorage.getItem(`exam_in_session_${id}`) === 'true';

  useBehaviorTracking(examActive ? 'exam' : 'idle', id);

  const [assignment, setAssignment] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [submissions, setSubmissions] = useState([]);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('Ready to run code. Click "Run Tests" or "Submit Solution".');
  const [runResults, setRunResults] = useState(null);
  const [status, setStatus] = useState('');

  const [activeRightTab, setActiveRightTab] = useState('tests'); // 'tests' | 'console' | 'attempts'
  const [showTopPrompt, setShowTopPrompt] = useState(true);
  const [loading, setLoading] = useState(true);

  // ── Load assignment ────────────────────────────────────────────────────────
  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      const [assignmentRes, submissionsRes] = await Promise.all([
        axios.get(`/api/assignments/${id}`),
        axios.get(`/api/assignments/${id}/submissions`)
      ]);
      setAssignment(assignmentRes.data);
      setCode(assignmentRes.data.starterCode || '');
      setLanguage(assignmentRes.data.language || 'javascript');
      setSubmissions(submissionsRes.data);
    } catch (err) {
      console.error(err);
      setConsoleOutput('Error: Failed to load assignment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();

    // Auto-restore session state on refresh
    if (persistedPin && persistedInSession) {
      setSessionJoinedPin(persistedPin);
      setInSession(true);
      setWaitingForStart(false);
      setExamActive(true);
      reconnectSocket(persistedPin);
    } else if (queryPin && queryPin.length === 6) {
      // Auto-join if valid 6-digit pin passed in URL
      executeJoin(queryPin);
    }
  }, [id]);

  // ── Strict Session Lock Behavior ──────────────────────────────────────────
  useEffect(() => {
    if (!examActive) return;

    // 1. Intercept beforeunload (page close / refresh confirmation)
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Live Exam Session is Active! Navigating away will be reported to the proctor.';
      return e.returnValue;
    };

    // 2. Intercept browser back/forward buttons (trap history)
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [examActive]);

  const reconnectSocket = (pin) => {
    const socketHost = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
    const socket = io(socketHost, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('rejoin-session', { pin, student: { id: user._id, name: user.name, email: user.email } });

    socket.on('session-ended', () => {
      handleTeacherEndedSession();
    });
  };

  const handleTeacherEndedSession = () => {
    sessionStorage.removeItem(`exam_pin_${id}`);
    sessionStorage.removeItem(`exam_in_session_${id}`);
    setExamActive(false);
    setInSession(false);
    setSessionEndedModal(true);
  };

  const executeJoin = (pin) => {
    if (!pin) return;
    setSessionError('');

    const socketHost = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
    socketRef.current = io(socketHost, { transports: ['websocket', 'polling'] });
    const socket = socketRef.current;

    socket.emit('join-session', { pin, student: { id: user._id, name: user.name, email: user.email } });

    socket.on('join-success', () => {
      setSessionJoinedPin(pin);
      setInSession(true);
      setWaitingForStart(true);
      setExamActive(false); // Don't track tab yet - still in lobby
    });

    socket.on('exam-started', () => {
      setInSession(true);
      setWaitingForStart(false);
      setExamActive(true); // NOW activate proctoring & lock
      sessionStorage.setItem(`exam_pin_${id}`, pin);
      sessionStorage.setItem(`exam_in_session_${id}`, 'true');
    });

    socket.on('join-error', (msg) => {
      setSessionError(msg);
      socket.disconnect();
    });

    socket.on('session-ended', () => {
      handleTeacherEndedSession();
    });
  };

  const handleJoinSession = () => {
    if (!sessionPinInput || sessionPinInput.length !== 6) {
      setSessionError('Please enter a valid 6-digit Session ID / PIN.');
      return;
    }
    executeJoin(sessionPinInput);
  };

  // ── Code execution ────────────────────────────────────────────────────────
  const handleRunCode = async (e) => {
    if (e) e.preventDefault();
    if (!code) return;
    try {
      setRunning(true);
      setActiveRightTab('tests');
      setConsoleOutput('Compiling and executing code against test cases...\n');
      setRunResults(null);
      setStatus('');
      const res = await axios.post(`/api/assignments/${id}/run`, { code, language });
      setConsoleOutput(res.data.consoleOutput || 'Success: Code executed cleanly without console logs.');
      setRunResults(res.data.results || []);
      setStatus(res.data.status);
    } catch (err) {
      setConsoleOutput(`Execution / Compilation Error:\n${err.response?.data?.message || err.message}`);
      setStatus('compile_error');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async (e) => {
    if (e) e.preventDefault();
    if (!code) return;
    try {
      setSubmitting(true);
      setActiveRightTab('tests');
      setConsoleOutput('Submitting final assessment solution...\n');
      const res = await axios.post(`/api/assignments/${id}/submit`, { code, language });
      setConsoleOutput(res.data.consoleOutput || 'Solution submitted successfully.');
      setRunResults(res.data.results || []);
      setStatus(res.data.status);

      // Refresh submissions list
      const subsRes = await axios.get(`/api/assignments/${id}/submissions`);
      setSubmissions(subsRes.data);
    } catch (err) {
      setConsoleOutput(`Submission Error:\n${err.response?.data?.message || err.message}`);
      setStatus('compile_error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e0e7ff', borderTopColor: '#4f46e5', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  // ── Session Ended Release Modal ───────────────────────────────────────────
  if (sessionEndedModal) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #e8f0ff 100%)', padding: '24px'
      }}>
        <div style={{
          width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '24px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.12)', border: '1.5px solid #e2e8f0',
          padding: '36px 32px', textAlign: 'center', animation: 'modalSlideUp 250ms ease'
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '20px', background: '#f0fdf4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
            Exam Session Concluded
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 24px' }}>
            Your instructor has officially ended the live exam session. All your code submissions and behavioral biometrics telemetry have been archived.
          </p>
          <button
            onClick={() => navigate('/my-performance')}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)', marginBottom: '8px'
            }}
          >
            View My Performance
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#475569', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Session Lobby (Strict PIN Requirement — No Bypass Option) ─────────────
  if (!inSession || waitingForStart) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #e8f0ff 100%)',
        padding: '24px'
      }}>
        <div style={{
          width: '100%', maxWidth: '440px',
          background: 'rgba(255,255,255,0.98)', borderRadius: '24px',
          border: '1.5px solid rgba(226,232,240,0.9)',
          boxShadow: '0 12px 48px rgba(79,70,229,0.12)',
          padding: '44px 36px', textAlign: 'center'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(99,102,241,0.3)'
          }}>
            <Shield size={30} style={{ color: '#fff' }} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
            {waitingForStart ? 'Waiting for Teacher' : 'Proctored Exam Room'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px', lineHeight: '1.5' }}>
            {waitingForStart
              ? `Connected to session PIN ${sessionJoinedPin}! Waiting for your instructor to launch the exam.`
              : 'Enter the 6-digit Session PIN announced by your teacher to enter the exam room.'}
          </p>

          {/* Assessment Title Pill */}
          <div style={{
            padding: '12px 16px', borderRadius: '14px', background: '#f8faff',
            border: '1.5px solid #e0e7ff', marginBottom: '24px', textAlign: 'left'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#4f46e5', letterSpacing: '0.5px' }}>
              Target Assessment
            </span>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0' }}>
              {assignment?.title}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
              Language: <strong className="capitalize">{assignment?.language || 'JavaScript'}</strong>
            </p>
          </div>

          {!inSession ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={sessionPinInput}
                  onChange={e => { setSessionPinInput(e.target.value.replace(/\D/g, '')); setSessionError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinSession()}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    textAlign: 'center', fontSize: '32px', fontWeight: '800',
                    letterSpacing: '10px', fontFamily: 'monospace',
                    padding: '16px', borderRadius: '16px',
                    border: '2px solid #cbd5e1', background: '#f8fafc',
                    color: '#0f172a', outline: 'none', transition: 'border-color 200ms'
                  }}
                  onFocus={e => e.target.style.borderColor = '#4f46e5'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  autoFocus
                />
              </div>

              {sessionError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#dc2626', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                  {sessionError}
                </div>
              )}

              <button
                onClick={handleJoinSession}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff',
                  fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(79,70,229,0.3)', transition: 'all 150ms ease'
                }}
              >
                Join Live Exam Session
              </button>

              <div style={{
                marginTop: '12px', padding: '12px', borderRadius: '12px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left'
              }}>
                <Lock size={15} style={{ color: '#4f46e5', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  All exam attempts require a verified session PIN. Standalone practice without a session is restricted.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '24px 0' }}>
                {[0, 150, 300].map(delay => (
                  <div
                    key={delay}
                    style={{
                      width: '12px', height: '12px', borderRadius: '50%', background: '#4f46e5',
                      animation: 'bounce 1s ease-in-out infinite', animationDelay: `${delay}ms`
                    }}
                  />
                ))}
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5' }}>
                Your join request is registered. Please wait while your teacher starts the exam proctor.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Redesigned Google Workspace–Inspired Exam Layout ──────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#f8fafc', overflow: 'hidden', fontFamily: 'inherit'
    }}>
      {/* ── TOP BAR: Google Workspace Header (Clean white card, rounded pills, tactile buttons) ── */}
      <header style={{
        height: '62px', background: '#ffffff', borderBottom: '1.5px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0, gap: '16px', zIndex: 10
      }}>
        {/* Left: Task Identity & Session Lock Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0
          }}>
            <FileCode size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {assignment?.title}
              </span>
              <span style={{
                background: '#f1f5f9', color: '#475569', fontSize: '10px',
                fontWeight: '800', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase'
              }}>
                PIN {sessionJoinedPin}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Proctor & Session Lock Indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          padding: '5px 14px', borderRadius: '20px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.8s infinite' }} />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d' }}>
            Session Locked · BioAuth Proctored
          </span>
        </div>

        {/* Right: Language Dropdown + Run & Submit Buttons (Google Workspace Style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Expanded Language Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                height: '38px', padding: '0 32px 0 12px', borderRadius: '10px',
                border: '1.5px solid #cbd5e1', background: '#fff', color: '#1e293b',
                fontSize: '13px', fontWeight: '700', outline: 'none', cursor: 'pointer',
                appearance: 'none', transition: 'border-color 150ms'
              }}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>

          {/* Run Code (Google Material outlined) */}
          <button
            onClick={handleRunCode}
            disabled={running || submitting}
            style={{
              height: '38px', padding: '0 16px', borderRadius: '10px',
              border: '1.5px solid #c7d2fe', background: '#eef2ff',
              color: '#4338ca', fontSize: '13px', fontWeight: '700',
              cursor: running || submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 120ms ease'
            }}
            title="Execute against test cases (Ctrl+Enter)"
          >
            {running ? <div className="lms-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Play size={14} />}
            Run Tests
          </button>

          {/* Submit Solution (Google Blue primary with tactile active feedback) */}
          <button
            onClick={handleSubmitCode}
            disabled={running || submitting}
            style={{
              height: '38px', padding: '0 18px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff',
              fontSize: '13px', fontWeight: '700',
              cursor: running || submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 3px 12px rgba(79,70,229,0.28)', transition: 'all 120ms ease'
            }}
          >
            {submitting ? <div className="lms-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Send size={14} />}
            Submit
          </button>
        </div>
      </header>

      {/* ── PROMPT & EXPECTED OUTPUT TOP CARD (Google Workspace Card Style) ── */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid #e2e8f0',
        padding: '12px 20px', transition: 'all 200ms ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Question Statement
              </span>
              <button
                onClick={(e) => { e.preventDefault(); setShowTopPrompt(!showTopPrompt); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', color: '#64748b', fontSize: '11px', fontWeight: '600' }}
              >
                {showTopPrompt ? <>Collapse <ChevronUp size={12} /></> : <>Expand <ChevronDown size={12} /></>}
              </button>
            </div>

            {showTopPrompt ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '16px', alignItems: 'start' }}>
                {/* Problem Description */}
                <div style={{
                  fontSize: '13px', color: '#334155', lineHeight: '1.6',
                  background: '#f8fafc', padding: '12px 16px', borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {assignment?.description || 'Write your code solution to satisfy all test cases.'}
                </div>

                {/* Expected Output & Sample Cases Card (High contrast Google Workspace style) */}
                <div style={{
                  background: '#f8fafc', padding: '12px 16px', borderRadius: '12px',
                  border: '1px solid #cbd5e1', fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '800', color: '#0f172a' }}>Expected Output Format</span>
                    <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px' }}>
                      {assignment?.testCases?.length || 0} Test Cases
                    </span>
                  </div>
                  {assignment?.testCases && assignment.testCases.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                      <div style={{ color: '#475569' }}>
                        Input: <code style={{ color: '#0f172a', fontWeight: '700' }}>{assignment.testCases[0].input}</code>
                      </div>
                      <div style={{ color: '#15803d' }}>
                        Expected: <code style={{ color: '#15803d', fontWeight: '700' }}>{assignment.testCases[0].expectedOutput}</code>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', margin: 0 }}>Return the expected value matching the specification.</p>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {assignment?.description?.slice(0, 140)}...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: Split Editor & Output Panels ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '12px', gap: '12px' }}>
        {/* LEFT / CENTER: Monaco Editor with Google Workspace Card Container */}
        <div style={{
          flex: 1, background: '#ffffff', borderRadius: '16px',
          border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          {/* Editor Header Bar */}
          <div style={{
            height: '40px', background: '#fafbfc', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code2 size={15} style={{ color: '#4f46e5' }} />
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>
                Solution Editor ({language})
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              UTF-8
            </span>
          </div>

          {/* Monaco Editor Container */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Editor
              height="100%"
              language={SUPPORTED_LANGUAGES.find(l => l.id === language)?.monaco || 'javascript'}
              value={code}
              onChange={(newVal) => setCode(newVal || '')}
              theme="vs"
              options={{
                fontSize: 14,
                fontFamily: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`,
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Output Display Area in Rounded Google Workspace Cards */}
        <div style={{
          width: '420px', maxWidth: '40vw', background: '#ffffff',
          borderRadius: '16px', border: '1.5px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)', flexShrink: 0
        }}>
          {/* Right Panel Tabs (Prevents false tab switch with e.preventDefault) */}
          <div style={{
            display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#fafbfc',
            padding: '4px 6px', gap: '4px'
          }}>
            {[
              { k: 'tests', l: 'Test Cases', icon: <CheckCircle size={13} /> },
              { k: 'console', l: 'Console Logs', icon: <Terminal size={13} /> },
              { k: 'attempts', l: `Attempts (${submissions.length})`, icon: <History size={13} /> }
            ].map(tab => (
              <button
                key={tab.k}
                type="button"
                onClick={(e) => { e.preventDefault(); setActiveRightTab(tab.k); }}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: '10px', border: 'none',
                  background: activeRightTab === tab.k ? '#fff' : 'transparent',
                  color: activeRightTab === tab.k ? '#4f46e5' : '#64748b',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  boxShadow: activeRightTab === tab.k ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 120ms ease'
                }}
              >
                {tab.icon} {tab.l}
              </button>
            ))}
          </div>

          {/* Right Panel Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* 1. Test Cases View */}
            {activeRightTab === 'tests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {status && (
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    background: status === 'pass' ? '#f0fdf4' : '#fef2f2',
                    border: `1.5px solid ${status === 'pass' ? '#bbf7d0' : '#fecdd3'}`,
                    display: 'flex', alignItems: 'center', gap: '10px'
                  }}>
                    {status === 'pass' ? (
                      <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                    ) : (
                      <XCircle size={18} style={{ color: '#dc2626' }} />
                    )}
                    <div>
                      <p style={{
                        fontSize: '13px', fontWeight: '800', margin: 0,
                        color: status === 'pass' ? '#15803d' : '#991b1b'
                      }}>
                        {status === 'pass' ? 'All Test Cases Passed!' : 'Tests Failed or Incomplete'}
                      </p>
                    </div>
                  </div>
                )}

                {runResults ? (
                  runResults.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '14px', borderRadius: '12px',
                        background: r.passed ? '#f8fafc' : '#fff5f5',
                        border: `1px solid ${r.passed ? '#e2e8f0' : '#fed7d7'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                          Test Case {i + 1}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px',
                          background: r.passed ? '#dcfce7' : '#fee2e2',
                          color: r.passed ? '#15803d' : '#991b1b'
                        }}>
                          {r.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                        <div><span style={{ color: '#64748b' }}>Input:</span> {r.input}</div>
                        <div><span style={{ color: '#64748b' }}>Expected:</span> {r.expectedOutput}</div>
                        <div><span style={{ color: r.passed ? '#16a34a' : '#dc2626' }}>Actual:</span> {r.actualOutput}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                    <Play size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>No Test Runs Yet</p>
                    <p style={{ fontSize: '12px' }}>Click "Run Tests" in the top bar to test your code against cases.</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. Console Logs View */}
            {activeRightTab === 'console' && (
              <div style={{
                background: '#0f172a', borderRadius: '12px', padding: '14px',
                color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px',
                minHeight: '260px', whiteSpace: 'pre-wrap', lineHeight: '1.6'
              }}>
                {consoleOutput}
              </div>
            )}

            {/* 3. Submissions History View */}
            {activeRightTab === 'attempts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {submissions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                    <History size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>No Previous Attempts</p>
                    <p style={{ fontSize: '12px' }}>Submitting your solution will record attempt history here.</p>
                  </div>
                ) : (
                  submissions.map((sub, idx) => (
                    <div
                      key={sub._id || idx}
                      style={{
                        padding: '12px 14px', borderRadius: '12px', background: '#f8fafc',
                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                          Attempt #{submissions.length - idx}
                        </p>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {sub.language || 'JS'}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: '800',
                        color: sub.status === 'pass' ? '#16a34a' : '#dc2626'
                      }}>
                        {sub.status === 'pass' ? '✓ 100%' : `${sub.testCasesPassed || 0}/${sub.testCasesTotal || 0} passed`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingPractice;
