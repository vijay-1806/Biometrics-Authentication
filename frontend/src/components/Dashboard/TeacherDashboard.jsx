import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen,
  FileCode,
  Users,
  FolderPlus,
  Eye,
  AlertCircle,
  Trash2,
  Plus,
  ChevronRight,
  CheckCircle,
  X,
  Code2,
  Settings,
  ArrowRight
} from 'lucide-react';

// ─── Sub-component: Create Session Guided Modal ────────────────────────────
const CreateSessionModal = ({ courses, onClose, onCreated }) => {
  const [step, setStep] = useState(1); // 1=pick course, 2=pick assignment, 3=review
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const course = courses.find(c => c._id === selectedCourse);
  const assignment = assignments.find(a => a._id === selectedAssignment);

  const loadAssignments = async (courseId) => {
    setLoadingAssignments(true);
    try {
      const res = await axios.get(`/api/courses/${courseId}`);
      setAssignments(res.data.assignments || []);
    } catch { setAssignments([]); }
    finally { setLoadingAssignments(false); }
  };

  const handleSelectCourse = (cId) => {
    setSelectedCourse(cId);
    setSelectedAssignment('');
    if (cId) loadAssignments(cId);
  };

  const handleCreate = async () => {
    if (!selectedAssignment || !sessionPassword.trim()) {
      setError('Please complete all fields.'); return;
    }
    setCreating(true);
    try {
      const res = await axios.post('/api/sessions', {
        assessmentId: selectedAssignment,
        password: sessionPassword.trim(),
      });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session.');
    } finally { setCreating(false); }
  };

  const steps = [
    { n: 1, label: 'Select Course' },
    { n: 2, label: 'Select Assessment' },
    { n: 3, label: 'Review & Create' },
  ];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-lg">
        {/* Stepper Header */}
        <div className="px-7 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-xl text-slate-900">Create Live Session</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X size={18} /></button>
          </div>
          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className={`flex items-center gap-2 text-sm font-semibold ${step >= s.n ? 'text-brand-600' : 'text-slate-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    step > s.n ? 'bg-brand-600 text-white' :
                    step === s.n ? 'bg-brand-100 text-brand-700 border-2 border-brand-400' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {step > s.n ? <CheckCircle size={13} /> : s.n}
                  </div>
                  <span className="hidden md:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-7 space-y-5">
          {error && <div className="toast-error">{error}</div>}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-1">Which course is this session for?</p>
                <p className="text-xs text-slate-500 mb-4">Students from this course will be able to join the session.</p>
              </div>
              <div className="space-y-2">
                {courses.map(c => (
                  <button
                    key={c._id}
                    onClick={() => handleSelectCourse(c._id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedCourse === c._id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eef2ff' }}>
                      <BookOpen size={18} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.studentsEnrolled?.length || 0} students enrolled</p>
                    </div>
                    {selectedCourse === c._id && <CheckCircle size={18} className="text-brand-600 flex-shrink-0" />}
                  </button>
                ))}
                {courses.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-6">No courses created yet. Create a course first.</p>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedCourse}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                  style={{ background: '#4f46e5' }}
                >
                  Next <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-1">Select a coding assessment</p>
                <p className="text-xs text-slate-500 mb-4">Only code-based assessments are supported for live sessions.</p>
              </div>

              {loadingAssignments ? (
                <div className="flex justify-center py-6"><div className="lms-spinner" /></div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <FileCode size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium">No coding assignments in this course.</p>
                  <p className="text-xs mt-1">Go back and create an assignment first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map(a => (
                    <button
                      key={a._id}
                      onClick={() => setSelectedAssignment(a._id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        selectedAssignment === a._id
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
                        <Code2 size={18} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="lms-badge badge-blue text-[10px] capitalize">{a.language}</span>
                          <span className="text-xs text-slate-400">{a.testCases?.length || 0} test cases</span>
                        </div>
                      </div>
                      {selectedAssignment === a._id && <CheckCircle size={18} className="text-brand-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                  style={{ border: '1.5px solid #e2e8f0' }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedAssignment}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                  style={{ background: '#4f46e5' }}
                >
                  Next <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-1">Review and set session password</p>
                <p className="text-xs text-slate-500 mb-4">Students must enter this password when joining. You will also need to approve each student's join request.</p>
              </div>

              {/* Summary */}
              <div className="space-y-2 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1.5px solid #e8edf5' }}>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen size={15} className="text-slate-500" />
                  <span className="text-slate-500">Course:</span>
                  <span className="font-semibold text-slate-800">{course?.title}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Code2 size={15} className="text-slate-500" />
                  <span className="text-slate-500">Assessment:</span>
                  <span className="font-semibold text-slate-800">{assignment?.title}</span>
                </div>
              </div>

              <div>
                <label className="lms-label">Session Password</label>
                <input
                  type="text"
                  value={sessionPassword}
                  onChange={e => setSessionPassword(e.target.value)}
                  className="lms-input"
                  placeholder="Set a memorable password for students"
                />
                <p className="text-xs text-slate-400 mt-1.5">Share this password with your students verbally or via your preferred channel.</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                  style={{ border: '1.5px solid #e2e8f0' }}
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !sessionPassword.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                  style={{ background: '#4f46e5' }}
                >
                  {creating ? <div className="lms-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Plus size={15} />}
                  Create Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Teacher Dashboard ───────────────────────────────────────────────
const TeacherDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Course form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  // Assignment form
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDesc, setAssignmentDesc] = useState('');
  const [starterCode, setStarterCode] = useState('// Write your solution here\nfunction solution(input) {\n  \n}');
  const [language, setLanguage] = useState('javascript');
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '' }]);

  const [message, setMessage] = useState({ text: '', type: '' });
  const [error, setError] = useState('');

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const courseRes = await axios.get('/api/courses');
      setCourses(courseRes.data);
      if (courseRes.data.length > 0) setSelectedCourseId(courseRes.data[0]._id);

      const allSubs = [];
      for (const course of courseRes.data) {
        try {
          const detail = await axios.get(`/api/courses/${course._id}`);
          const { assignments } = detail.data;
          if (assignments) {
            for (const assignment of assignments) {
              try {
                const subRes = await axios.get(`/api/assignments/${assignment._id}/submissions`);
                subRes.data.forEach(sub => allSubs.push({
                  ...sub, assignmentTitle: assignment.title, courseTitle: course.title
                }));
              } catch (_) {}
            }
          }
        } catch (_) {}
      }
      setSubmissions(allSubs);
    } catch (err) {
      console.error('Teacher data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeacherData(); }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle || !courseDesc) { setError('Please fill in all fields'); return; }
    try {
      await axios.post('/api/courses', { title: courseTitle, description: courseDesc });
      showMsg('Course created successfully!');
      setCourseTitle(''); setCourseDesc('');
      setShowCourseForm(false);
      fetchTeacherData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course');
    }
  };

  const handleDeleteCourse = async () => {
    if (!showDeleteConfirm) return;
    try {
      await axios.delete(`/api/courses/${showDeleteConfirm}`);
      showMsg('Course deleted.');
      setShowDeleteConfirm(null);
      fetchTeacherData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const addTestCase = () => setTestCases([...testCases, { input: '', expectedOutput: '' }]);
  const removeTestCase = (i) => setTestCases(testCases.filter((_, idx) => idx !== i));
  const updateTestCase = (i, field, val) => {
    const u = [...testCases]; u[i][field] = val; setTestCases(u);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedCourseId || !assignmentTitle || !assignmentDesc || testCases.some(tc => !tc.expectedOutput)) {
      setError('Fill in all fields and provide expected outputs for all test cases.');
      return;
    }
    try {
      await axios.post('/api/assignments', {
        course: selectedCourseId, title: assignmentTitle, description: assignmentDesc,
        starterCode, language, testCases
      });
      showMsg('Assignment published!');
      setAssignmentTitle(''); setAssignmentDesc('');
      setTestCases([{ input: '', expectedOutput: '' }]);
      setShowAssignmentForm(false);
      fetchTeacherData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  const totalStudents = courses.reduce((sum, c) => sum + (c.studentsEnrolled?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="lms-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Panel</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your courses, assessments, and student sessions.</p>
        </div>
        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setShowCourseForm(true); setError(''); }}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#eef2ff', color: '#4338ca', border: '1.5px solid #c7d2fe' }}
          >
            <FolderPlus size={16} />
            New Course
          </button>
          <button
            onClick={() => { setShowAssignmentForm(true); setError(''); }}
            disabled={courses.length === 0}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1.5px solid #bbf7d0' }}
          >
            <FileCode size={16} />
            New Assignment
          </button>
          <button
            onClick={() => setShowCreateSession(true)}
            disabled={courses.length === 0}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}
          >
            <Plus size={16} />
            Create Session
          </button>
        </div>
      </div>

      {/* Feedback messages */}
      {message.text && (
        <div className={message.type === 'error' ? 'toast-error' : 'toast-success'}>
          {message.text}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="lms-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
            <BookOpen size={18} className="text-brand-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Courses</p>
            <p className="text-2xl font-black text-slate-900">{courses.length}</p>
          </div>
        </div>
        <div className="lms-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
            <Users size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Students</p>
            <p className="text-2xl font-black text-slate-900">{totalStudents}</p>
          </div>
        </div>
        <div className="lms-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
            <FileCode size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Submissions</p>
            <p className="text-2xl font-black text-slate-900">{submissions.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'courses', label: 'My Courses' },
          { key: 'submissions', label: 'Submissions' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.length === 0 ? (
            <div className="lms-card col-span-2 p-12 text-center text-slate-400">
              <BookOpen size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-sm">No courses yet</p>
              <button
                onClick={() => setShowCourseForm(true)}
                className="mt-3 text-sm font-bold text-brand-600 hover:text-brand-700"
              >
                Create your first course →
              </button>
            </div>
          ) : courses.map(c => (
            <div key={c._id} className="lms-card p-6 flex flex-col gap-4">
              <div>
                <h4 className="font-black text-lg text-slate-900">{c.title}</h4>
                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{c.description}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="flex items-center gap-1 text-slate-500 font-medium">
                  <Users size={13} />
                  {c.studentsEnrolled?.length || 0} students
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(c._id)}
                    className="text-rose-500 hover:text-rose-700 flex items-center gap-1 font-bold transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                  <Link
                    to={`/courses/${c._id}`}
                    className="flex items-center gap-1 text-brand-600 font-bold hover:text-brand-700 transition-colors"
                  >
                    View <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="lms-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileCode size={17} className="text-slate-500" />
            <h3 className="font-bold text-slate-900">Code Submissions</h3>
            <span className="lms-badge badge-slate ml-auto">{submissions.length} total</span>
          </div>
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileCode size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm font-medium">No submissions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="lms-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Assignment</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => {
                    const pct = Math.round((sub.testCasesPassed / Math.max(sub.testCasesTotal, 1)) * 100);
                    return (
                      <tr key={sub._id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                              {sub.student?.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">{sub.student?.name}</span>
                          </div>
                        </td>
                        <td className="text-slate-500">{sub.courseTitle}</td>
                        <td className="text-slate-500">{sub.assignmentTitle}</td>
                        <td>
                          <span className={`lms-badge ${sub.status === 'pass' ? 'badge-green' : 'badge-red'} capitalize`}>
                            {sub.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress-bar w-16">
                              <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-bold text-slate-700">{sub.testCasesPassed}/{sub.testCasesTotal}</span>
                          </div>
                        </td>
                        <td className="text-slate-400 text-xs">{new Date(sub.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Session (guided) */}
      {showCreateSession && (
        <CreateSessionModal
          courses={courses}
          onClose={() => setShowCreateSession(false)}
          onCreated={() => showMsg('Session created! Students can now join with the PIN.')}
        />
      )}

      {/* Modal: Create Course */}
      {showCourseForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCourseForm(false); }}>
          <div className="modal-box max-w-md p-7 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xl text-slate-900">Create New Course</h3>
              <button onClick={() => setShowCourseForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {error && <div className="toast-error">{error}</div>}
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="lms-label">Course Title</label>
                <input type="text" required value={courseTitle} onChange={e => setCourseTitle(e.target.value)}
                  placeholder="e.g. Introduction to Python" className="lms-input" />
              </div>
              <div>
                <label className="lms-label">Description</label>
                <textarea required rows={4} value={courseDesc} onChange={e => setCourseDesc(e.target.value)}
                  placeholder="What will students learn? Describe the curriculum..." className="lms-input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCourseForm(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                  style={{ border: '1.5px solid #e2e8f0' }}>
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                  style={{ background: '#4f46e5' }}>
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Assignment */}
      {showAssignmentForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAssignmentForm(false); }}>
          <div className="modal-box max-w-2xl p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-xl text-slate-900">Create Coding Assignment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define the challenge, starter code, and test cases.</p>
              </div>
              <button onClick={() => setShowAssignmentForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {error && <div className="toast-error">{error}</div>}
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="lms-label">Course</label>
                  <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="lms-input">
                    {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lms-label">Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className="lms-input">
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="lms-label">Assignment Title</label>
                <input type="text" required value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)}
                  placeholder="e.g. Two Sum" className="lms-input" />
              </div>

              <div>
                <label className="lms-label">Instructions</label>
                <textarea required rows={3} value={assignmentDesc} onChange={e => setAssignmentDesc(e.target.value)}
                  placeholder="Describe what students need to implement..." className="lms-input" />
              </div>

              <div>
                <label className="lms-label">Starter Code</label>
                <textarea rows={5} value={starterCode} onChange={e => setStarterCode(e.target.value)} className="lms-code-area" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="lms-label" style={{ marginBottom: 0 }}>Test Cases</label>
                  <button type="button" onClick={addTestCase}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <Plus size={13} /> Add Test Case
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" value={tc.input} onChange={e => updateTestCase(idx, 'input', e.target.value)}
                        placeholder="Input args" className="lms-input flex-1 text-xs" />
                      <input type="text" required value={tc.expectedOutput} onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)}
                        placeholder="Expected output" className="lms-input flex-1 text-xs" />
                      {testCases.length > 1 && (
                        <button type="button" onClick={() => removeTestCase(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAssignmentForm(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                  style={{ border: '1.5px solid #e2e8f0' }}>
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                  style={{ background: '#15803d' }}>
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm p-7 text-center space-y-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: '#fee2e2' }}>
              <AlertCircle size={28} className="text-rose-600" />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-900">Delete Course?</h3>
              <p className="text-slate-500 text-sm mt-1">
                This will permanently delete the course, all assignments, and student submissions. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                style={{ border: '1.5px solid #e2e8f0' }}>
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ background: '#dc2626' }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
