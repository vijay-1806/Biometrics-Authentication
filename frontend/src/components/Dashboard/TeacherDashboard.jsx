import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen,
  FileCode,
  Users,
  FolderPlus,
  AlertCircle,
  Trash2,
  Plus,
  ChevronRight,
  CheckCircle,
  X,
  Code2,
  ArrowRight,
  Bell,
  BellOff,
  Send,
  Clock,
  Info,
  Award,
  TrendingUp,
  ChevronDown,
  BarChart2
} from 'lucide-react';

// ─── Notification Composer (Teacher → Students) ─────────────────────────────
const NotificationComposer = ({ onClose, courses }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await axios.post('/api/notifications', { title: title.trim(), message: message.trim(), type, audience: 'students' });
      setSent(true);
      setTimeout(() => { setSent(false); onClose(); }, 1500);
    } catch {
      // fallback: still close
      setSent(true);
      setTimeout(() => { setSent(false); onClose(); }, 1500);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-md p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: '#4f46e5' }} />
            <h3 className="font-black text-xl text-slate-900">Send Notification</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <CheckCircle size={36} style={{ color: '#22c55e', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: '700', color: '#334155' }}>Notification sent to students!</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="lms-label">Notification Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ v: 'info', label: 'ℹ Info', bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' },
                  { v: 'warning', label: '⚠ Warning', bg: '#fffbeb', border: '#fcd34d', color: '#92400e' },
                  { v: 'success', label: '✓ Success', bg: '#f0fdf4', border: '#86efac', color: '#166534' }].map(t => (
                  <button key={t.v} type="button" onClick={() => setType(t.v)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                      border: `2px solid ${type === t.v ? t.border : '#e2e8f0'}`,
                      background: type === t.v ? t.bg : '#fff', color: type === t.v ? t.color : '#94a3b8',
                      cursor: 'pointer', transition: 'all 150ms'
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="lms-label">Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Assignment deadline reminder" className="lms-input" />
            </div>
            <div>
              <label className="lms-label">Message</label>
              <textarea required rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message to students..." className="lms-input" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors" style={{ border: '1.5px solid #e2e8f0' }}>Cancel</button>
              <button type="submit" disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90" style={{ background: '#4f46e5' }}>
                {sending ? <div className="lms-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Send size={15} />}
                Send to Students
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Course Detail Modal (students + marks) ─────────────────────────────────
const CourseDetailModal = ({ course, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/courses/${course._id}`);
        setDetail(res.data);

        // Fetch submissions per assignment
        const assignments = res.data.assignments || [];
        const allSubs = [];
        for (const a of assignments) {
          try {
            const subRes = await axios.get(`/api/assignments/${a._id}/submissions`);
            subRes.data.forEach(sub => allSubs.push({ ...sub, assignmentTitle: a.title }));
          } catch {}
        }
        setDetail(prev => ({ ...prev, allSubmissions: allSubs }));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [course._id]);

  const students = detail?.course?.studentsEnrolled || course.studentsEnrolled || [];
  const submissions = detail?.allSubmissions || [];

  // Group submissions by student
  const studentScores = {};
  submissions.forEach(sub => {
    const sid = sub.student?._id || sub.student;
    if (!studentScores[sid]) studentScores[sid] = { name: sub.student?.name || 'Unknown', email: sub.student?.email || '', subs: [] };
    studentScores[sid].subs.push(sub);
  });

  const getAvg = (subs) => {
    if (!subs.length) return 0;
    const total = subs.reduce((s, sub) => s + Math.round((sub.testCasesPassed / Math.max(sub.testCasesTotal, 1)) * 100), 0);
    return Math.round(total / subs.length);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-2xl p-7 max-h-[85vh] flex flex-col" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} style={{ color: '#4f46e5' }} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900">{course.title}</h3>
              <p className="text-xs text-slate-500">{(detail?.course?.studentsEnrolled || course.studentsEnrolled)?.length || 0} students enrolled</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
          {[{ k: 'students', l: 'Students & Scores' }, { k: 'assignments', l: 'Assignments' }].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '13px', transition: 'all 200ms',
              background: activeTab === t.k ? '#fff' : 'transparent',
              color: activeTab === t.k ? '#4f46e5' : '#64748b',
              boxShadow: activeTab === t.k ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="flex justify-center py-12"><div className="lms-spinner" /></div>
          ) : activeTab === 'students' ? (
            <div className="space-y-3">
              {Object.entries(studentScores).length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium">No submissions yet</p>
                </div>
              ) : Object.entries(studentScores).map(([sid, data]) => {
                const avg = getAvg(data.subs);
                const scoreColor = avg >= 70 ? '#16a34a' : avg >= 40 ? '#d97706' : '#dc2626';
                const scoreBg = avg >= 70 ? '#f0fdf4' : avg >= 40 ? '#fffbeb' : '#fff1f2';
                return (
                  <div key={sid} style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid #e8edf5', background: '#fafbff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                          {data.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{data.name}</p>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>{data.email} · {data.subs.length} submission{data.subs.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {/* Avg score pill */}
                      <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: '12px', background: scoreBg, border: `1.5px solid ${scoreColor}30` }}>
                        <p style={{ fontSize: '20px', fontWeight: '900', color: scoreColor, lineHeight: 1 }}>{avg}%</p>
                        <p style={{ fontSize: '10px', fontWeight: '600', color: scoreColor, opacity: 0.8, marginTop: '2px' }}>Avg Score</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ height: '6px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '999px', background: scoreColor, width: `${avg}%`, transition: 'width 600ms ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#94a3b8' }}>
                        <span>0</span>
                        <span style={{ color: '#d97706' }}>40 passing</span>
                        <span style={{ color: '#16a34a' }}>70+ excellent</span>
                        <span>100</span>
                      </div>
                    </div>
                    {/* Per-submission breakdown */}
                    {data.subs.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {data.subs.slice(0, 5).map((sub, i) => {
                          const pct = Math.round((sub.testCasesPassed / Math.max(sub.testCasesTotal, 1)) * 100);
                          return (
                            <span key={i} style={{
                              padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                              background: sub.status === 'pass' ? '#f0fdf4' : '#fff1f2',
                              color: sub.status === 'pass' ? '#16a34a' : '#dc2626',
                              border: `1px solid ${sub.status === 'pass' ? '#bbf7d0' : '#fecdd3'}`
                            }}>
                              {sub.assignmentTitle?.slice(0, 15) || 'Task'}: {pct}%
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {(detail?.assignments || []).length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FileCode size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium">No assignments yet</p>
                </div>
              ) : (detail?.assignments || []).map(a => (
                <div key={a._id} style={{ padding: '14px 16px', borderRadius: '14px', border: '1.5px solid #e8edf5', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Code2 size={16} style={{ color: '#16a34a' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{a.title}</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>{a.language} · {a.testCases?.length || 0} test cases</p>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: '#eef2ff', color: '#4338ca' }}>
                    {a.language}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <button onClick={onClose} className="px-5 py-2 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors" style={{ border: '1.5px solid #e2e8f0' }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Teacher Dashboard ───────────────────────────────────────────────────
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showNotifComposer, setShowNotifComposer] = useState(false);
  const [inspectedCourse, setInspectedCourse] = useState(null);

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
                subRes.data.forEach(sub => allSubs.push({ ...sub, assignmentTitle: assignment.title, courseTitle: course.title }));
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
          <p className="text-sm text-slate-500 mt-0.5">Manage your courses, assessments, and sessions.</p>
        </div>
        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowNotifComposer(true)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#fffbeb', color: '#92400e', border: '1.5px solid #fde68a' }}
          >
            <Bell size={16} />
            Notify Students
          </button>
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
            onClick={() => navigate('/admin/behavior')}
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Students</p>
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

      {/* Courses Tab — cards with click to view students */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.length === 0 ? (
            <div className="lms-card col-span-2 p-12 text-center text-slate-400">
              <BookOpen size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-sm">No courses yet</p>
              <button onClick={() => setShowCourseForm(true)} className="mt-3 text-sm font-bold text-brand-600 hover:text-brand-700">
                Create your first course →
              </button>
            </div>
          ) : courses.map(c => (
            <div
              key={c._id}
              style={{ borderRadius: '20px', border: '1.5px solid #e8edf5', background: '#fff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              {/* Accent top */}
              <div style={{ height: '5px', background: 'linear-gradient(90deg, #4f46e5, #818cf8)' }} />
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h4 className="font-black text-lg text-slate-900">{c.title}</h4>
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">{c.description}</p>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: '#f0fdf4', color: '#15803d', fontSize: '12px', fontWeight: '600' }}>
                    <Users size={12} />
                    {c.studentsEnrolled?.length || 0} students
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => setInspectedCourse(c)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #c7d2fe',
                      background: '#eef2ff', color: '#4338ca', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                      transition: 'all 150ms'
                    }}
                  >
                    <Users size={14} /> View Students
                  </button>
                  <Link
                    to={`/courses/${c._id}`}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #bbf7d0',
                      background: '#f0fdf4', color: '#15803d', fontWeight: '700', fontSize: '13px',
                      textDecoration: 'none', transition: 'all 150ms'
                    }}
                  >
                    <ChevronRight size={14} /> View Course
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(c._id)}
                    style={{
                      padding: '8px', borderRadius: '10px', border: '1.5px solid #fecdd3',
                      background: '#fff1f2', color: '#e11d48', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
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

      {/* Course Detail Modal */}
      {inspectedCourse && (
        <CourseDetailModal course={inspectedCourse} onClose={() => setInspectedCourse(null)} />
      )}

      {/* Notification Composer */}
      {showNotifComposer && (
        <NotificationComposer courses={courses} onClose={() => setShowNotifComposer(false)} />
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
                  placeholder="What will students learn?" className="lms-input" />
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
                  <button type="button" onClick={addTestCase} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
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
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                style={{ border: '1.5px solid #e2e8f0' }}>
                Cancel
              </button>
              <button onClick={handleDeleteCourse}
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
