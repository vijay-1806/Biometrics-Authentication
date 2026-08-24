import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import useBehaviorTracking from '../hooks/useBehaviorTracking';
import Layout from '../components/Common/Layout';
import { 
  Timer, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Flag,
  AlertCircle,
  Award,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Shield,
  Lock,
  StopCircle,
  Zap,
  Clock
} from 'lucide-react';

const QuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Session lifecycle states: 'LOBBY', 'WAITING', 'ACTIVE', 'ENDED', 'FORBIDDEN'
  const [sessionState, setSessionState] = useState('LOBBY');
  const [sessionPinInput, setSessionPinInput] = useState('');
  const [assessmentSessionId, setAssessmentSessionId] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [accessDeniedMsg, setAccessDeniedMsg] = useState('');
  const socketRef = useRef(null);

  // Continuous authentication behavior telemetry
  const trackingContext = (sessionState === 'ACTIVE' || quiz?.isExam) ? 'exam' : 'quiz';
  useBehaviorTracking(trackingContext, id, assessmentSessionId);
  
  // Quiz taking state
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionIndex: selectedOptionIndex }
  const [flaggedQuestions, setFlaggedQuestions] = useState({}); // { questionIndex: Boolean }
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  
  // Result state
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [gradedResult, setGradedResult] = useState(null);
  const [correctAnswersList, setCorrectAnswersList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const timerRef = useRef(null);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/quizzes/${id}`);
      setQuiz(res.data);
      setQuestions(res.data.questions || []);
      setTimeRemaining((res.data.durationMinutes || 30) * 60);

      // If quiz is not an exam, default to ACTIVE state
      if (!res.data.isExam) {
        setSessionState('ACTIVE');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        if (err.response?.data?.requiresSessionPin) {
          setSessionState('LOBBY');
        } else {
          setSessionState('FORBIDDEN');
          setAccessDeniedMsg(err.response?.data?.message || 'Join the active assessment session using the session PIN provided by your instructor.');
        }
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [id]);

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
      fetchQuizData();
    });
    
    socket.on('exam-started', (data) => {
      setSessionState('ACTIVE');
      if (data?.assessmentSessionId) setAssessmentSessionId(data.assessmentSessionId);
      fetchQuizData();
    });
    
    socket.on('join-error', (msg) => {
      setSessionError(msg);
      socket.disconnect();
    });
    
    socket.on('session-ended', () => {
      setSessionState('ENDED');
    });
  };

  // Timer loop
  useEffect(() => {
    if (loading || quizCompleted || timeRemaining <= 0 || sessionState !== 'ACTIVE') return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, quizCompleted, timeRemaining, sessionState]);

  const handleOptionSelect = (optionIdx) => {
    if (sessionState === 'ENDED' || quizCompleted || submitting) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIdx
    }));
  };

  const toggleFlagQuestion = () => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [currentIndex]: !prev[currentIndex]
    }));
  };

  const getQuestionStatus = (idx) => {
    if (flaggedQuestions[idx]) return 'flagged';
    if (selectedAnswers[idx] !== undefined) return 'answered';
    return 'unanswered';
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleAutoSubmit = () => {
    alert('Time has expired! Your quiz responses will be automatically submitted.');
    submitAnswers();
  };

  const submitAnswers = async () => {
    if (submitting || quizCompleted) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    
    const formattedAnswers = Object.entries(selectedAnswers).map(([qIdx, optIdx]) => ({
      questionIndex: parseInt(qIdx),
      selectedAnswerIndex: optIdx
    }));

    questions.forEach((_, idx) => {
      if (selectedAnswers[idx] === undefined) {
        formattedAnswers.push({
          questionIndex: idx,
          selectedAnswerIndex: -1
        });
      }
    });

    try {
      const res = await axios.post(`/api/quizzes/${id}/submit`, { answers: formattedAnswers });
      setGradedResult(res.data.result);
      setCorrectAnswersList(res.data.correctAnswers || []);
      setQuizCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err) {
      console.error(err);
      alert('Failed to submit quiz. Please try again.');
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

  // 2. QUIZ LOBBY (PIN Input or Waiting Room)
  if (quiz?.isExam && (sessionState === 'LOBBY' || sessionState === 'WAITING')) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Timer size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Live Quiz Lobby</h2>
          
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

  // 3. POST-SUBMISSION RESULTS SCREEN
  if (quizCompleted && gradedResult) {
    return (
      <Layout>
        <div className="space-y-6 max-w-3xl mx-auto">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
            <Award size={48} className="text-brand-600 mx-auto" />
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Quiz Completed!</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Classroom: {quiz?.title}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-4 border-t">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {gradedResult.score} / {gradedResult.totalQuestions}
                </p>
              </div>

              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Percentage</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {gradedResult.percentage}%
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Link 
                to={`/courses/${quiz?.course}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl transition-all"
              >
                <ArrowLeft size={16} />
                <span>Return to Classroom</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Graded Answer Review</h3>
            {questions.map((question, qIdx) => {
              const studentAnswer = gradedResult.answers.find(ans => ans.questionIndex === qIdx);
              const selectedIdx = studentAnswer ? studentAnswer.selectedAnswerIndex : -1;
              const correctIdx = correctAnswersList[qIdx];
              const isCorrect = studentAnswer ? studentAnswer.isCorrect : false;

              return (
                <div 
                  key={qIdx} 
                  className={`p-6 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-4 ${
                    isCorrect 
                      ? 'border-emerald-200 dark:border-emerald-950' 
                      : 'border-rose-200 dark:border-rose-950'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-bold text-slate-950 dark:text-white text-sm">
                      Question {qIdx + 1}: {question.questionText}
                    </h4>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                      isCorrect 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                    }`}>
                      {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options.map((opt, optIdx) => {
                      const isSelected = optIdx === selectedIdx;
                      const isAnswerKey = optIdx === correctIdx;
                      
                      let choiceStyle = 'border-slate-200 dark:border-slate-800 text-slate-650';
                      if (isSelected) {
                        choiceStyle = 'border-rose-500 bg-rose-50/20 text-rose-700 dark:text-rose-400';
                      }
                      if (isAnswerKey) {
                        choiceStyle = 'border-emerald-500 bg-emerald-50/20 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20';
                      }

                      return (
                        <div 
                          key={optIdx} 
                          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${choiceStyle}`}
                        >
                          <span>{opt}</span>
                          {isSelected && !isCorrect && <span className="text-[10px] font-bold text-rose-500 uppercase">Your Choice</span>}
                          {isAnswerKey && <span className="text-[10px] font-bold text-emerald-500 uppercase">Correct Answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </Layout>
    );
  }

  // 4. ACTIVE / ENDED QUIZ WORKSPACE
  const currentQuestion = questions[currentIndex];

  return (
    <Layout>
      <div className="space-y-4 flex flex-col h-[calc(100vh-10rem)]">
        
        {/* Top Header: Quiz Info, Security Badge & Timer */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm gap-4">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white">{quiz?.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{quiz?.description}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 self-end md:self-auto">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Shield size={14} className="text-emerald-600" />
              <span>🔐 Secure Assessment</span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Behaviour Monitoring Active</span>
            </div>

            {sessionState === 'ACTIVE' && (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 px-4 py-2 rounded-xl font-mono font-bold text-xs shadow-sm">
                <Timer size={16} className="animate-pulse" />
                <span>Time Left: {formatTime(timeRemaining)}</span>
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

        {/* Ended Session Banner */}
        {sessionState === 'ENDED' && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex justify-between items-center text-rose-900 dark:text-rose-200 text-xs font-bold">
            <div className="flex items-center gap-2">
              <StopCircle size={16} className="text-rose-600" />
              <span>Your instructor has ended this assessment session. Option selection and submissions are now locked.</span>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        )}

        {/* Workspace: Side Navigator + MCQ Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Left Sidebar Matrix */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-100 dark:border-slate-800 pb-2">Questions Status</h3>
              
              <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {questions.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  let badgeStyle = 'bg-slate-50 dark:bg-slate-800 text-slate-400';
                  if (status === 'flagged') badgeStyle = 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 border border-amber-300';
                  if (status === 'answered') badgeStyle = 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-300';
                  if (currentIndex === idx) badgeStyle += ' ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900';

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${badgeStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend summary */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> Answered</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span> Flagged for Review</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800 inline-block"></span> Unanswered</div>
            </div>
          </div>

          {/* Center MCQ Panel */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
            
            {/* Question Header */}
            <div className="px-8 py-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs font-bold text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <button
                onClick={toggleFlagQuestion}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  flaggedQuestions[currentIndex]
                    ? 'border-amber-400 text-amber-500 bg-amber-50/30'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-650'
                }`}
              >
                <Flag size={14} />
                <span>{flaggedQuestions[currentIndex] ? 'Unflag Review' : 'Flag Review'}</span>
              </button>
            </div>

            {/* Question Choices Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-relaxed">
                {currentQuestion?.questionText}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion?.options.map((option, optIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleOptionSelect(optIdx)}
                      disabled={sessionState === 'ENDED' || quizCompleted || submitting}
                      className={`p-5 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all hover:shadow-sm disabled:opacity-60 ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/40 text-brand-700 dark:text-brand-350 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      <span className="flex-1">{option}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected 
                          ? 'border-brand-500 bg-brand-500 text-white' 
                          : 'border-slate-350'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="px-8 py-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-1 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={sessionState === 'ENDED' || quizCompleted || submitting}
                  className="flex items-center gap-1.5 text-xs font-bold bg-brand-650 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl shadow-md shadow-brand-500/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckSquare size={16} />
                  <span>Submit Quiz</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4 text-center">
            <AlertCircle size={36} className="text-amber-500 mx-auto" />
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Submit Your Quiz?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                You have answered {Object.keys(selectedAnswers).length} of {questions.length} questions. You cannot change your choices once submitted.
              </p>
            </div>
            
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                Go Back
              </button>
              <button
                onClick={submitAnswers}
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default QuizPage;
