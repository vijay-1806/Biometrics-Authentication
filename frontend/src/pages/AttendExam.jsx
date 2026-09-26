import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Common/Layout';
import { useAuth } from '../context/AuthContext';
import {
  KeyRound,
  Shield,
  BookOpen,
  FileCode,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Zap
} from 'lucide-react';

const AttendExam = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  // Join PIN state
  const initialPin = searchParams.get('pin') || '';
  const initialCourseId = searchParams.get('courseId') || '';
  const [sessionPin, setSessionPin] = useState(initialPin);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch enrolled courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/courses');
        const enrolled = res.data.filter(c => c.studentsEnrolled?.includes(user._id));
        setEnrolledCourses(enrolled);

        if (initialCourseId) {
          const match = enrolled.find(c => c._id === initialCourseId);
          if (match) {
            setSelectedCourse(match);
            fetchCourseAssignments(match._id);
          }
        } else if (enrolled.length > 0) {
          setSelectedCourse(enrolled[0]);
          fetchCourseAssignments(enrolled[0]._id);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, initialCourseId]);

  const fetchCourseAssignments = async (courseId) => {
    try {
      setLoadingAssessments(true);
      const res = await axios.get(`/api/courses/${courseId}`);
      const list = res.data.assignments || [];
      setCourseAssignments(list);
      if (list.length > 0) {
        setSelectedAssignmentId(list[0]._id);
      } else {
        setSelectedAssignmentId('');
      }
    } catch (err) {
      console.error('Failed to load course assignments:', err);
      setCourseAssignments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setErrorMsg('');
    fetchCourseAssignments(course._id);
  };

  const handleJoinExam = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPin = sessionPin.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Session ID / PIN.');
      return;
    }

    if (!selectedAssignmentId) {
      setErrorMsg('Please select an assessment to attend.');
      return;
    }

    // Direct routing to the exam page with valid Session PIN pre-populated
    navigate(`/assignments/${selectedAssignmentId}/coding?sessionPin=${cleanPin}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="lms-spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-7 max-w-5xl mx-auto">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="text-2xl font-bold text-slate-900">Attend Exam</h1>
              <span style={{
                background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe',
                fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px'
              }}>
                Proctored Sessions
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Live proctored exams require an active 6-digit Session ID provided by your teacher.
            </p>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#f8fafc', padding: '6px 14px', borderRadius: '12px',
            border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '600', color: '#475569'
          }}>
            <Shield size={16} style={{ color: '#16a34a' }} />
            <span>Behavioral Biometrics Proctor Active</span>
          </div>
        </div>

        {/* Hero Session Join Box (Google Workspace Card Style) */}
        <div style={{
          background: '#ffffff', borderRadius: '24px',
          border: '1.5px solid #e2e8f0', overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
        }}>
          <div style={{ height: '6px', background: 'linear-gradient(90deg, #4f46e5, #6366f1, #818cf8)' }} />
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(79,70,229,0.3)', color: '#fff'
              }}>
                <KeyRound size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Enter Proctored Exam Room
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  No standalone practice mode: all attempts must be verified through a valid live Session PIN.
                </p>
              </div>
            </div>

            <form onSubmit={handleJoinExam} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'end' }}>
              {/* Course Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Target Course
                </label>
                <select
                  value={selectedCourse?._id || ''}
                  onChange={(e) => {
                    const c = enrolledCourses.find(course => course._id === e.target.value);
                    if (c) handleSelectCourse(c);
                  }}
                  className="lms-input"
                  style={{ height: '46px' }}
                >
                  {enrolledCourses.length === 0 && <option value="">No enrolled courses</option>}
                  {enrolledCourses.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Assessment Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Select Assessment
                </label>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  disabled={courseAssignments.length === 0}
                  className="lms-input disabled:opacity-50"
                  style={{ height: '46px' }}
                >
                  {loadingAssessments ? (
                    <option>Loading assessments...</option>
                  ) : courseAssignments.length === 0 ? (
                    <option value="">No assessments available</option>
                  ) : (
                    courseAssignments.map(a => (
                      <option key={a._id} value={a._id}>
                        {a.title} ({a.language || 'JS'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Session ID / PIN */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Session ID (6-digit PIN)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={sessionPin}
                  onChange={(e) => { setSessionPin(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                  style={{
                    height: '46px', width: '100%', boxSizing: 'border-box',
                    textAlign: 'center', fontSize: '20px', fontWeight: '800',
                    letterSpacing: '4px', fontFamily: 'monospace',
                    borderRadius: '12px', border: '1.5px solid #cbd5e1', outline: 'none',
                    background: '#f8fafc', color: '#0f172a'
                  }}
                />
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={!selectedAssignmentId || sessionPin.length !== 6}
                  style={{
                    height: '46px', width: '100%', borderRadius: '12px', border: 'none',
                    background: (!selectedAssignmentId || sessionPin.length !== 6)
                      ? '#cbd5e1'
                      : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#fff', fontSize: '14px', fontWeight: '700',
                    cursor: (!selectedAssignmentId || sessionPin.length !== 6) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: (!selectedAssignmentId || sessionPin.length !== 6) ? 'none' : '0 4px 14px rgba(79,70,229,0.3)',
                    transition: 'all 150ms'
                  }}
                >
                  <Zap size={16} />
                  Join & Begin Exam
                </button>
              </div>
            </form>

            {errorMsg && (
              <div style={{
                marginTop: '16px', background: '#fef2f2', border: '1px solid #fecdd3',
                color: '#dc2626', padding: '10px 14px', borderRadius: '10px',
                fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <AlertTriangle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Enrolled Courses Selection Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Your Enrolled Courses ({enrolledCourses.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Select a course to view scheduled assessments
            </p>
          </div>

          {enrolledCourses.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: '20px', border: '1.5px dashed #e2e8f0',
              padding: '48px', textAlign: 'center'
            }}>
              <BookOpen size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: '700', color: '#334155' }}>No enrolled courses found</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>Enroll in courses first from the dashboard.</p>
              <Link to="/dashboard" className="lms-btn btn-primary" style={{ display: 'inline-flex' }}>
                Browse Courses
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {enrolledCourses.map(course => {
                const isSelected = selectedCourse?._id === course._id;
                return (
                  <div
                    key={course._id}
                    onClick={() => handleSelectCourse(course)}
                    style={{
                      background: '#fff', borderRadius: '16px',
                      border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                      padding: '18px', cursor: 'pointer',
                      boxShadow: isSelected ? '0 8px 24px rgba(79,70,229,0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 200ms ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: isSelected ? '#eef2ff' : '#f8fafc',
                        color: isSelected ? '#4f46e5' : '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <BookOpen size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0, truncate: true }}>
                          {course.title}
                        </h4>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                          by {course.teacher?.name || 'Instructor'}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={18} style={{ color: '#4f46e5' }} />
                      )}
                    </div>

                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {course.description || 'Proctored assessments available.'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: isSelected ? '#4f46e5' : '#64748b' }}>
                        {isSelected ? '✓ Selected Course' : 'Click to Select'}
                      </span>
                      <ChevronRight size={14} style={{ color: isSelected ? '#4f46e5' : '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Course's Assessments */}
        {selectedCourse && (
          <div style={{
            background: '#fff', borderRadius: '20px', border: '1.5px solid #e2e8f0',
            padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={18} style={{ color: '#4f46e5' }} />
              Assessments for <span style={{ color: '#4f46e5' }}>{selectedCourse.title}</span>
            </h3>

            {loadingAssessments ? (
              <div className="py-8 flex justify-center"><div className="lms-spinner" /></div>
            ) : courseAssignments.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>
                No active coding assessments published for this course yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {courseAssignments.map(ass => {
                  const isAssSelected = selectedAssignmentId === ass._id;
                  return (
                    <div
                      key={ass._id}
                      style={{
                        padding: '14px 18px', borderRadius: '14px',
                        background: isAssSelected ? '#f8faff' : '#fff',
                        border: `1.5px solid ${isAssSelected ? '#c7d2fe' : '#f1f5f9'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isAssSelected ? '#4f46e5' : '#cbd5e1' }} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            {ass.title}
                          </p>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Language: <strong className="capitalize">{ass.language || 'JavaScript'}</strong> · {ass.testCases?.length || 0} test cases
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssignmentId(ass._id);
                          if (sessionPin.length === 6) {
                            navigate(`/assignments/${ass._id}/coding?sessionPin=${sessionPin}`);
                          } else {
                            // Focus pin input
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        style={{
                          padding: '6px 14px', borderRadius: '8px',
                          border: isAssSelected ? 'none' : '1px solid #e2e8f0',
                          background: isAssSelected ? '#4f46e5' : '#f8fafc',
                          color: isAssSelected ? '#fff' : '#475569',
                          fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        {isAssSelected ? 'Enter with PIN' : 'Select'}
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AttendExam;
