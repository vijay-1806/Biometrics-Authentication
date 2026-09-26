import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import useBehaviorTracking from '../hooks/useBehaviorTracking';
import Layout from '../components/Common/Layout';
import {
  BookOpen,
  FileCode,
  CheckCircle2,
  Play,
  Users,
  ArrowLeft,
  Calendar,
  Lock,
  KeyRound,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';

const CourseDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  useBehaviorTracking('general');

  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Session join state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [joinStep, setJoinStep] = useState('form'); // 'form' | 'waiting' | 'approved'
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/courses/${id}`);
      setCourse(res.data.course);
      setAssignments(res.data.assignments || []);

      if (user.role === 'student' && res.data.studentData) {
        setStudentSubmissions(res.data.studentData.submissions || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const getAssignmentStatus = (assignmentId) => {
    const subs = studentSubmissions.filter(s => s.assignment === assignmentId);
    if (subs.length === 0) return { completed: false };
    const passed = subs.some(s => s.status === 'pass');
    const bestScore = Math.max(...subs.map(s =>
      Math.round((s.testCasesPassed / Math.max(s.testCasesTotal, 1)) * 100)
    ));
    return { completed: true, passed, bestScore, attemptsCount: subs.length };
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!sessionId.trim() || !sessionPassword.trim()) {
      setJoinError('Both Session ID and password are required.'); return;
    }
    setJoinLoading(true);
    try {
      await axios.post('/api/sessions/join-request', {
        sessionId: sessionId.trim(),
        password: sessionPassword.trim(),
      });
      setJoinStep('waiting');
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Could not submit join request. Check Session ID and password.');
    } finally {
      setJoinLoading(false);
    }
  };

  const resetJoinModal = () => {
    setShowJoinModal(false);
    setSessionId('');
    setSessionPassword('');
    setJoinStep('form');
    setJoinError('');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="lms-spinner" />
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-10 lms-card p-8 text-center space-y-4">
          <AlertCircle size={36} className="mx-auto text-red-400" />
          <p className="text-slate-600 font-medium">{error || 'Course not found'}</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: '#4f46e5' }}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back nav */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>

        {/* Hero Banner */}
        <div className="lms-card overflow-hidden">
          <div className="h-2" style={{ background: 'linear-gradient(90deg, #4f46e5, #818cf8, #a5b4fc)' }} />
          <div className="p-7">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <span className="lms-badge badge-blue mb-2 inline-flex">
                  <BookOpen size={11} />
                  Course Classroom
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-1">{course.title}</h1>
                <p className="text-slate-500 mt-1.5 max-w-2xl text-sm">{course.description}</p>
              </div>

              {/* Join Session button — students only */}
              {user.role === 'student' && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex-shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}
                >
                  <KeyRound size={16} />
                  Join Live Session
                </button>
              )}
            </div>

            <div className="flex gap-6 pt-4 mt-4 border-t border-slate-100 text-sm text-slate-500">
              <span>Instructor: <strong className="text-slate-800">{course.teacher?.name}</strong></span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(course.createdAt).toLocaleDateString()}
              </span>
              {user.role !== 'student' && (
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {course.studentsEnrolled?.length || 0} enrolled
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coding Assignments — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <FileCode size={19} className="text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Coding Assessments</h2>
              {assignments.length > 0 && (
                <span className="lms-badge badge-slate">{assignments.length}</span>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="lms-card p-10 text-center text-slate-400">
                <FileCode size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="font-medium text-sm">No coding assessments published yet.</p>
                <p className="text-xs mt-1">Check back later for assignments from your instructor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(assignment => {
                  const status = getAssignmentStatus(assignment._id);
                  return (
                    <div
                      key={assignment._id}
                      className="lms-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900">{assignment.title}</h4>
                          <span className="lms-badge badge-blue capitalize">{assignment.language}</span>
                          {status.completed && (
                            <span className={`lms-badge ${status.passed ? 'badge-green' : 'badge-amber'}`}>
                              {status.passed ? '✓ Passed' : `${status.bestScore}%`}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2">{assignment.description}</p>
                        {user.role === 'student' && status.completed && (
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 pt-1">
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 size={13} />
                              {status.passed ? 'All tests passed' : 'Submitted'}
                            </span>
                            <span>Best: <strong className="text-slate-700">{status.bestScore}%</strong></span>
                            <span>{status.attemptsCount} attempt{status.attemptsCount !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {user.role === 'student' ? (
                          <Link
                            to={`/assignments/${assignment._id}/coding`}
                            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] ${
                              status.completed && status.passed
                                ? 'text-slate-600 hover:bg-slate-100'
                                : 'text-white hover:opacity-90'
                            }`}
                            style={!(status.completed && status.passed) ? {
                              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                              boxShadow: '0 3px 10px rgba(79,70,229,0.25)'
                            } : { background: '#f1f5f9' }}
                          >
                            <Play size={14} />
                            {status.completed ? 'Try Again' : 'Start Challenge'}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">
                            {assignment.testCases?.length || 0} test cases
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Roster — teacher/admin sidebar */}
          {user.role !== 'student' && (
            <div className="lms-card p-5 h-fit">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
                <Users size={17} className="text-brand-600" />
                Enrolled Students
                <span className="lms-badge badge-slate ml-auto">{course.studentsEnrolled?.length || 0}</span>
              </h3>

              {!course.studentsEnrolled?.length ? (
                <p className="text-slate-400 text-sm text-center py-6">No students enrolled yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {course.studentsEnrolled.map(student => (
                    <div
                      key={student._id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                        style={{ background: '#e0e7ff', color: '#4338ca' }}
                      >
                        {student.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-800 truncate">{student.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Join Session Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetJoinModal(); }}>
          <div className="modal-box max-w-md p-7 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <KeyRound size={18} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Join Live Session</h3>
                  <p className="text-xs text-slate-500">Enter your session credentials</p>
                </div>
              </div>
              <button onClick={resetJoinModal} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                ✕
              </button>
            </div>

            {joinStep === 'form' && (
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                {joinError && (
                  <div className="toast-error">{joinError}</div>
                )}

                <div className="p-3 rounded-xl flex items-start gap-2 text-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <Lock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-xs">A password is required to join. After submitting, your teacher must approve your request before you're admitted.</p>
                </div>

                <div>
                  <label className="lms-label">Session ID</label>
                  <input
                    type="text"
                    value={sessionId}
                    onChange={e => setSessionId(e.target.value)}
                    className="lms-input"
                    placeholder="Enter the 6-digit session ID"
                    required
                  />
                </div>
                <div>
                  <label className="lms-label">Session Password</label>
                  <input
                    type="password"
                    value={sessionPassword}
                    onChange={e => setSessionPassword(e.target.value)}
                    className="lms-input"
                    placeholder="Password from your teacher"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={resetJoinModal}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                    style={{ border: '1.5px solid #e2e8f0' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    style={{ background: '#4f46e5' }}
                  >
                    {joinLoading ? <div className="lms-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Send size={15} />}
                    Send Join Request
                  </button>
                </div>
              </form>
            )}

            {joinStep === 'waiting' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: '#fffbeb' }}>
                  <Clock size={28} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg">Request Sent!</h4>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                    Your join request has been submitted. Please wait for your teacher to approve it. You'll be let into the session once approved.
                  </p>
                </div>
                <button
                  onClick={resetJoinModal}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                  style={{ background: '#4f46e5' }}
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CourseDetails;
