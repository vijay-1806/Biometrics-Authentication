import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import useBehaviorTracking from '../hooks/useBehaviorTracking';
import Layout from '../components/Common/Layout';
import { 
  Play, 
  Send, 
  ArrowLeft, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Info,
  History,
  FileCode,
  Timer,
  Shield,
  Lock,
  StopCircle,
  Zap,
  Clock
} from 'lucide-react';

const CodingPractice = () => {
  const { id } = useParams();
  const { user, theme } = useAuth();
  const navigate = useNavigate();

  // Session lifecycle states: 'LOBBY', 'WAITING', 'ACTIVE', 'ENDED', 'FORBIDDEN'
  const [sessionState, setSessionState] = useState('LOBBY');
  const [sessionPinInput, setSessionPinInput] = useState('');
  const [assessmentSessionId, setAssessmentSessionId] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [accessDeniedMsg, setAccessDeniedMsg] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const socketRef = useRef(null);
  const timerRef = useRef(null);

  // Continuous authentication behavior telemetry
  useBehaviorTracking('exam', id, assessmentSessionId);

  const [assignment, setAssignment] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [submissions, setSubmissions] = useState([]);
  
  // Execution states
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Console Outputs
  const [consoleOutput, setConsoleOutput] = useState('Console initialized. Press "Run" to evaluate your solution against test cases.');
  const [runResults, setRunResults] = useState(null);
  const [status, setStatus] = useState(''); // 'pass', 'fail', 'compile_error', 'none'
  
  const [activeLeftTab, setActiveLeftTab] = useState('description');
  const [loading, setLoading] = useState(true);

  // Fetch assignment & verify backend access authorization
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
      if (err.response?.status === 403) {
        if (err.response?.data?.requiresSessionPin) {
          setSessionState('LOBBY');
        } else {
          setSessionState('FORBIDDEN');
          setAccessDeniedMsg(err.response?.data?.message || 'Join the active assessment session using the session PIN provided by your instructor.');
        }
      } else {
        setConsoleOutput('Error: Failed to load assignment details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Session elapsed timer effect
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

  const handleJoinSession = () => {
    const cleanPin = sessionPinInput.trim();
    if (!cleanPin) return;
    setSessionError('');
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socketUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    socketRef.current = io(socketUrl, { transports: ['websocket', 'polling'] });
    const socket = socketRef.current;
    
    socket.emit('join-session', { pin: cleanPin, student: { id: user._id, name: user.name, email: user.email } });
    
    socket.on('join-success', (data) => {
      setSessionState('WAITING');
      if (data?.assessmentSessionId) setAssessmentSessionId(data.assessmentSessionId);
      fetchAssignmentData();
    });
    
    socket.on('exam-started', (data) => {
      setSessionState('ACTIVE');
      if (data?.assessmentSessionId) setAssessmentSessionId(data.assessmentSessionId);
      fetchAssignmentData();
    });
    
    socket.on('join-error', (msg) => {
      setSessionError(msg);
      socket.disconnect();
    });
    
    socket.on('session-ended', () => {
      setSessionState('ENDED');
    });
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRunCode = async () => {
    if (!code || sessionState === 'ENDED') return;
    try {
      setRunning(true);
      setConsoleOutput('Compiling and running code against test cases...\n');
      setRunResults(null);
      setStatus('');

      const res = await axios.post(`/api/assignments/${id}/run`, { code, language });
      
      setConsoleOutput(res.data.consoleOutput || 'Success: Code ran without any console outputs.');
      setRunResults(res.data.results || []);
      setStatus(res.data.status);
    } catch (err) {
      setConsoleOutput(`Compilation Error:\n${err.response?.data?.message || err.message}`);
      setStatus('compile_error');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!code || sessionState === 'ENDED') return;
    try {
      setSubmitting(true);
      setConsoleOutput('Submitting solution to classroom records...\n');
      setRunResults(null);
      setStatus('');

      const res = await axios.post(`/api/assignments/${id}/submit`, { code, language });
      
      const { runResult } = res.data;
      setConsoleOutput(runResult.consoleOutput || 'Success: Code submitted successfully.');
      setRunResults(runResult.results || []);
      setStatus(runResult.status);

      // Re-fetch submissions list in background
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
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  // 1. FORBIDDEN ACCESS SCREEN
  if (sessionState === 'FORBIDDEN') {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Assessment Access Locked</h2>
          <p className="text-slate-500 text-sm leading-relaxed">{accessDeniedMsg}</p>
          <div className="pt-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all"
            >
              <ArrowLeft size={16} />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // 2. SESSION LOBBY (PIN Input or Waiting Room)
  if (sessionState === 'LOBBY' || sessionState === 'WAITING') {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Timer size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Live Exam Lobby</h2>
          
          {sessionState === 'LOBBY' ? (
            <>
              <p className="text-slate-500 text-sm">Enter the 6-digit PIN generated on the Teacher Proctor Dashboard to join.</p>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={sessionPinInput}
                onChange={e => setSessionPinInput(e.target.value)}
                className="w-full text-center text-3xl tracking-widest font-mono p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
              />
              {sessionError && <p className="text-rose-500 text-sm font-medium">{sessionError}</p>}
              
              <button
                onClick={handleJoinSession}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-md"
              >
                Join Proctor Session
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                ✓ Successfully authorized for session #{sessionPinInput}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs space-y-1 text-left border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">WAITING FOR INSTRUCTOR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Authorization:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Behaviour Monitoring:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Ready</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs">
                Your assessment will begin automatically when the instructor starts the session.
              </p>
              <div className="flex justify-center gap-2 py-2">
                <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // 3. ACTIVE / ENDED ASSESSMENT WORKSPACE
  return (
    <Layout>
      <div className="space-y-4 flex flex-col h-[calc(100vh-10rem)]">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Link 
            to={`/courses/${assignment?.course}`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <ArrowLeft size={16} />
            <span>Return to Classroom</span>
          </Link>

          {/* Persistent Security Indicator & Timer */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Shield size={14} className="text-emerald-600" />
              <span>🔐 Secure Assessment</span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Behaviour Monitoring Active</span>
            </div>

            {sessionState === 'ACTIVE' && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                <Clock size={14} />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            )}

            {sessionState === 'ENDED' && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
                <StopCircle size={14} />
                <span>Assessment Ended</span>
              </div>
            )}
          </div>
        </div>

        {/* Ended Banner */}
        {sessionState === 'ENDED' && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex justify-between items-center text-rose-900 dark:text-rose-200 text-xs font-bold">
            <div className="flex items-center gap-2">
              <StopCircle size={16} className="text-rose-600" />
              <span>Your instructor has ended this assessment session. Code editing and submissions are now locked.</span>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        )}

        {/* LeetCode Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Left Panel: Instructions & Attempts */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0 overflow-hidden">
            
            {/* Panel Tabs */}
            <div className="flex border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setActiveLeftTab('description')}
                className={`flex items-center gap-1.5 px-6 py-3.5 text-xs font-bold capitalize transition-all border-b-2 ${
                  activeLeftTab === 'description'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Info size={14} />
                <span>Description</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('attempts')}
                className={`flex items-center gap-1.5 px-6 py-3.5 text-xs font-bold capitalize transition-all border-b-2 ${
                  activeLeftTab === 'attempts'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <History size={14} />
                <span>My Attempts ({submissions.length})</span>
              </button>
            </div>

            {/* Left Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeLeftTab === 'description' ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{assignment?.title}</h2>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Language: {assignment?.language}</p>
                  </div>
                  
                  {/* Instructions Body */}
                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {assignment?.description}
                  </div>

                  {/* Test Cases Preview */}
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-850">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameters & Sample Cases</h4>
                    <div className="space-y-2">
                      {assignment?.testCases?.map((tc, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border text-xs font-mono">
                          <div><strong className="text-slate-400">Input:</strong> {tc.input}</div>
                          <div className="mt-1"><strong className="text-slate-400">Expected:</strong> {tc.expectedOutput}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Past Submissions attempts
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Submission History</h3>
                  {submissions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No submissions made yet.</p>
                  ) : (
                    submissions.map((sub, idx) => (
                      <div key={sub._id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/25 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            sub.status === 'pass' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/35'
                              : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/35'
                          }`}>
                            {sub.status}
                          </span>
                          <span className="text-slate-400 font-semibold">{new Date(sub.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          Passed {sub.testCasesPassed} / {sub.testCasesTotal} test cases
                        </div>
                        <details className="mt-1">
                          <summary className="text-[10px] text-brand-600 cursor-pointer font-bold select-none hover:underline">View Code</summary>
                          <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[10px] overflow-x-auto max-h-40">{sub.code}</pre>
                        </details>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Code Workspace & Terminal Output */}
          <div className="lg:col-span-7 flex flex-col min-h-0 space-y-4">
            
            {/* Editor Container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
              
              {/* Workspace Header Toolbar */}
              <div className="px-6 py-3 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-brand-650" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Solution Workspace</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Language display / selector */}
                  <select
                    id="select-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={sessionState === 'ENDED'}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none dark:text-white font-medium disabled:opacity-50"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                  </select>

                  {/* Buttons */}
                  <button
                    id="btn-run-code"
                    onClick={handleRunCode}
                    disabled={running || submitting || sessionState === 'ENDED'}
                    className="flex items-center gap-1 text-xs font-bold bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 px-3.5 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Run</span>
                  </button>

                  <button
                    id="btn-submit-code"
                    onClick={handleSubmitCode}
                    disabled={running || submitting || sessionState === 'ENDED'}
                    className="flex items-center gap-1 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 rounded-lg active:scale-95 shadow-sm shadow-brand-500/10 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Submit</span>
                  </button>
                </div>
              </div>

              {/* Monaco Editor Component */}
              <div 
                id="monaco-editor-container" 
                className="flex-1 min-h-0 relative bg-white dark:bg-[#1e1e1e]"
                tabIndex={0}
              >
                <Editor
                  height="100%"
                  language={language}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    tabSize: 2,
                    scrollBeyondLastLine: false,
                    readOnly: sessionState === 'ENDED',
                    padding: { top: 12, bottom: 12 }
                  }}
                />
              </div>

            </div>

            {/* Console Output Panel */}
            <div className="bg-slate-900 rounded-2xl border border-slate-950 p-5 shadow-inner h-48 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Terminal size={12} />
                  Execution Console
                </span>
                
                {/* Result Pill */}
                {status && (
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    status === 'pass' 
                      ? 'bg-emerald-950/60 text-emerald-450 border border-emerald-900' 
                      : 'bg-rose-950/60 text-rose-450 border border-rose-900'
                  }`}>
                    {status === 'pass' ? 'Accepted' : (status === 'fail' ? 'Rejected' : 'Compile Error')}
                  </span>
                )}
              </div>

              {/* Terminal Logs & Results */}
              <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-350 space-y-2 pr-1 select-text">
                <pre id="console-output-pre" className="whitespace-pre-wrap break-all">{consoleOutput}</pre>
                
                {/* Visual Checkmarks for Test Cases */}
                {runResults && runResults.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                    {runResults.map((tc, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold border ${
                          tc.passed
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60'
                            : 'bg-rose-950/40 text-rose-400 border-rose-900/60'
                        }`}
                      >
                        {tc.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        <span>Case {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Assessment Ended Modal Overlay */}
        {sessionState === 'ENDED' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                <XCircle size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Proctored Session Ended</h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  The instructor has officially closed this assessment session. All code compilation, testing, and submissions have been locked.
                </p>
              </div>
              <button
                onClick={() => navigate(`/courses/${assignment?.course}`)}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                Return to Classroom
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default CodingPractice;
