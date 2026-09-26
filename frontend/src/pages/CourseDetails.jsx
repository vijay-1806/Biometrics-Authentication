import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  KeyRound,
  Send,
  AlertCircle,
  Zap,
  Clock
} from 'lucide-react';

const CourseDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useBehaviorTracking('general');

  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Session join state (No password field)
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [targetAssignmentId, setTargetAssignmentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [joinError, setJoinError] = useState('');

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/courses/${id}`);
      setCourse(res.data.course);
      const assignList = res.data.assignments || [];
      setAssignments(assignList);
      if (assignList.length > 0) {
        setTargetAssignmentId(assignList[0]._id);
      }

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

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    setJoinError('');
    const cleanPin = sessionId.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setJoinError('Please enter a valid 6-digit Session ID / PIN.');
      return;
    }

    const selectedAssId = targetAssignmentId || (assignments.length > 0 ? assignments[0]._id : '');
    if (!selectedAssId) {
      setJoinError('No coding assessment available in this course to join.');
      return;
    }

    // Navigate to exam page with verified sessionPin
    navigate(`/assignments/${selectedAssId}/coding?sessionPin=${cleanPin}`);
  };

  const openJoinModalFor = (assignmentId) => {
    if (assignmentId) setTargetAssignmentId(assignmentId);
    setSessionId('');
    setJoinError('');
    setShowJoinModal(true);
  };

  const resetJoinModal = () => {
    setShowJoinModal(false);
    setSessionId('');
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

              {/* Join Live Session button — students only */}
              {user.role === 'student' && (
                <button
                  onClick={() => openJoinModalFor(assignments[0]?._id || '')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white flex-shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
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
          {/* Coding Assignments */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode size={19} className="text-brand-600" />
                <h2 className="text-lg font-bold text-slate-900">Proctored Coding Assessments</h2>
                {assignments.length > 0 && (
                  <span className="lms-badge badge-slate">{assignments.length}</span>
                )}
              </div>
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
                          <button
                            onClick={() => openJoinModalFor(assignment._id)}
                            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all active:scale-[0.98]"
                            style={{
                              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                              boxShadow: '0 3px 10px rgba(79,70,229,0.25)',
                              border: 'none', cursor: 'pointer'
                            }}
                          >
                            <KeyRound size={14} />
                            Attend Exam
                          </button>
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

      {/* Join Session Modal (No Password Required) */}
      {showJoinModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) resetJoinModal(); }}
        >
          <div className="modal-box max-w-md p-7 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <KeyRound size={18} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Join Live Session</h3>
                  <p className="text-xs text-slate-500">Enter your 6-digit Session ID</p>
                </div>
              </div>
              <button
                onClick={resetJoinModal}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              {joinError && (
                <div className="toast-error">{joinError}</div>
              )}

              {/* Assessment picker */}
              {assignments.length > 1 && (
                <div>
                  <label className="lms-label">Target Assessment</label>
                  <select
                    value={targetAssignmentId}
                    onChange={e => setTargetAssignmentId(e.target.value)}
                    className="lms-input"
                  >
                    {assignments.map(a => (
                      <option key={a._id} value={a._id}>{a.title} ({a.language || 'JS'})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="lms-label">Session ID (6-digit PIN)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={sessionId}
                  onChange={e => { setSessionId(e.target.value.replace(/\D/g, '')); setJoinError(''); }}
                  className="lms-input"
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '6px', fontWeight: '800', fontFamily: 'monospace' }}
                  placeholder="000000"
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Get the 6-digit PIN from your teacher's proctor screen. No password needed.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
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
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#4f46e5' }}
                >
                  <Zap size={15} />
                  Enter Exam Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CourseDetails;
