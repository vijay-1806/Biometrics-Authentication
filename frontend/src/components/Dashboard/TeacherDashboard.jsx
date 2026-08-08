import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  PlusCircle, 
  BookOpen, 
  FileCode, 
  HelpCircle, 
  Users, 
  FolderPlus, 
  Eye,
  AlertCircle,
  Award,
  Trash2
} from 'lucide-react';

const TeacherDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores course._id

  // Form inputs
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  // Coding Assignment Inputs
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDesc, setAssignmentDesc] = useState('');
  const [starterCode, setStarterCode] = useState('// Write your solution here\nfunction solution(input) {\n  \n}');
  const [language, setLanguage] = useState('javascript');
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '' }]);

  // Quiz Inputs
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
  ]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const courseRes = await axios.get('/api/courses');
      setCourses(courseRes.data);
      if (courseRes.data.length > 0) {
        setSelectedCourseId(courseRes.data[0]._id);
      }

      // Fetch submissions for all teacher's courses
      const allSubmissions = [];
      const allQuizResults = [];

      for (const course of courseRes.data) {
        const detailRes = await axios.get(`/api/courses/${course._id}`);
        const { assignments, quizzes } = detailRes.data;

        // Fetch submissions for each assignment
        if (assignments) {
          for (const assignment of assignments) {
            const subRes = await axios.get(`/api/assignments/${assignment._id}/submissions`);
            subRes.data.forEach(sub => {
              allSubmissions.push({
                ...sub,
                assignmentTitle: assignment.title,
                courseTitle: course.title
              });
            });
          }
        }

        // Fetch results for each quiz
        if (quizzes) {
          for (const quiz of quizzes) {
            const resultRes = await axios.get(`/api/quizzes/${quiz._id}/results`);
            resultRes.data.forEach(res => {
              allQuizResults.push({
                ...res,
                quizTitle: quiz.title,
                courseTitle: course.title
              });
            });
          }
        }
      }

      setSubmissions(allSubmissions);
      setQuizResults(allQuizResults);

    } catch (err) {
      console.error('Error fetching teacher data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle || !courseDesc) {
      setError('Please fill in all fields');
      return;
    }

    try {
      // NOTE: token should normally be passed via axios interceptor, but we'll include it here just in case if the setup isn't global
      await axios.post('/api/courses', { title: courseTitle, description: courseDesc }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('Course created successfully!');
      setCourseTitle('');
      setCourseDesc('');
      setShowCourseForm(false);
      fetchTeacherData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course');
    }
  };

  const handleDeleteCourse = async () => {
    if (!showDeleteConfirm) return;
    try {
      await axios.delete(`/api/courses/${showDeleteConfirm}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('Course and all associated data deleted successfully!');
      setShowDeleteConfirm(null);
      fetchTeacherData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete course');
    }
  };

  // Coding Assignment Test Case Helpers
  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '' }]);
  };

  const removeTestCase = (index) => {
    setTestCases(testCases.filter((_, idx) => idx !== index));
  };

  const updateTestCase = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedCourseId || !assignmentTitle || !assignmentDesc || testCases.some(tc => !tc.expectedOutput)) {
      setError('Please provide title, description, and expected outputs for all test cases.');
      return;
    }

    try {
      await axios.post('/api/assignments', {
        course: selectedCourseId,
        title: assignmentTitle,
        description: assignmentDesc,
        starterCode,
        language,
        testCases
      });

      setMessage('Coding Assignment created successfully!');
      setAssignmentTitle('');
      setAssignmentDesc('');
      setTestCases([{ input: '', expectedOutput: '' }]);
      setShowAssignmentForm(false);
      fetchTeacherData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  // Quiz Question Helpers
  const addQuestion = () => {
    setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const updateQuestionText = (index, val) => {
    const updated = [...questions];
    updated[index].questionText = val;
    setQuestions(updated);
  };

  const updateQuestionOption = (qIdx, oIdx, val) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = val;
    setQuestions(updated);
  };

  const updateQuestionCorrect = (qIdx, val) => {
    const updated = [...questions];
    updated[qIdx].correctAnswerIndex = Number(val);
    setQuestions(updated);
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!selectedCourseId || !quizTitle || !quizDesc || questions.some(q => !q.questionText || q.options.some(o => !o))) {
      setError('Please complete all questions and their choices.');
      return;
    }

    try {
      await axios.post('/api/quizzes', {
        course: selectedCourseId,
        title: quizTitle,
        description: quizDesc,
        durationMinutes: duration,
        questions
      });

      setMessage('Quiz created successfully!');
      setQuizTitle('');
      setQuizDesc('');
      setDuration(30);
      setQuestions([{ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
      setShowQuizForm(false);
      fetchTeacherData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create quiz');
    }
  };

  // Calculate stats
  const totalStudents = courses.reduce((sum, c) => sum + (c.studentsEnrolled?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Teacher Panel</h1>
          <p className="text-slate-500 dark:text-slate-400">Create content, manage your classrooms, and monitor submissions.</p>
        </div>
        
        {/* Creator shortcuts */}
        <div className="flex gap-3">
          <button
            onClick={() => { setShowCourseForm(true); setError(''); }}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/50 px-4 py-2.5 rounded-xl border border-brand-100 dark:border-brand-900/30 transition-all"
          >
            <FolderPlus size={16} />
            <span>New Course</span>
          </button>
          
          <button
            onClick={() => { setShowAssignmentForm(true); setError(''); }}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 transition-all"
            disabled={courses.length === 0}
          >
            <FileCode size={16} />
            <span>New Assignment</span>
          </button>

          <button
            onClick={() => { setShowQuizForm(true); setError(''); }}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-4 py-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 transition-all"
            disabled={courses.length === 0}
          >
            <HelpCircle size={16} />
            <span>New Quiz</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Courses</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{courses.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Enrolled</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalStudents}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FileCode size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Coding Solutions</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{submissions.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quiz Attempts</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{quizResults.length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6">
        {['courses', 'coding-submissions', 'quiz-grades'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-bold capitalize transition-all border-b-2 px-1 ${
              activeTab === tab
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Course List Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Managed Classrooms</h3>
          {courses.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 text-sm">You haven't created any courses yet.</p>
              <button 
                onClick={() => setShowCourseForm(true)}
                className="mt-3 text-xs font-bold text-brand-600 hover:underline"
              >
                Create your first course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map(c => (
                <div key={c._id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition-all">
                  <div>
                    <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">{c.title}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2">{c.description}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Users size={14} />
                      {c.studentsEnrolled?.length || 0} Students
                    </span>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setShowDeleteConfirm(c._id)}
                        className="text-rose-500 hover:text-rose-700 flex items-center gap-1 font-bold"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                      <Link 
                        to={`/courses/${c._id}`} 
                        className="text-brand-600 dark:text-brand-400 hover:underline font-bold"
                      >
                        View Classroom &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'coding-submissions' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">Coding Assignment Submissions</h3>
          </div>
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No code submissions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Assignment</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {submissions.map(sub => (
                    <tr key={sub._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{sub.student?.name}</td>
                      <td className="px-6 py-4 text-slate-500">{sub.courseTitle}</td>
                      <td className="px-6 py-4 text-slate-500">{sub.assignmentTitle}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          sub.status === 'pass' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {sub.testCasesPassed} / {sub.testCasesTotal}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quiz Grades Tab */}
      {activeTab === 'quiz-grades' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">Quiz Attempt Scores</h3>
          </div>
          {quizResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No quiz attempts yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Quiz</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Percentage</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {quizResults.map(res => (
                    <tr key={res._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{res.student?.name}</td>
                      <td className="px-6 py-4 text-slate-500">{res.courseTitle}</td>
                      <td className="px-6 py-4 text-slate-500">{res.quizTitle}</td>
                      <td className="px-6 py-4 font-medium">{res.score} / {res.totalQuestions}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          res.percentage >= 70 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                        }`}>
                          {res.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(res.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Course */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">Create New Course</h3>
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 text-rose-600 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Course Title</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Introduction to Programming"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Description</label>
                <textarea
                  required
                  rows={4}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Provide an overview of the curriculum and learning goals..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseForm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Coding Assignment */}
      {showAssignmentForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4 my-8">
            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">Create Coding Assignment</h3>
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 text-rose-600 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Course Link</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                  >
                    {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                  >
                    <option value="javascript">JavaScript (Node VM)</option>
                    <option value="python">Python</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  placeholder="Sum two numbers"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Instructions / Description</label>
                <textarea
                  required
                  rows={3}
                  value={assignmentDesc}
                  onChange={(e) => setAssignmentDesc(e.target.value)}
                  placeholder="Write a solution that sums two inputs..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Starter Code Template</label>
                <textarea
                  rows={4}
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  className="w-full font-mono bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              {/* Test Cases */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Test Cases (Arguments & Expected Outputs)</label>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    + Add Test Case
                  </button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        placeholder="Args: 5, 10"
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none dark:text-white"
                      />
                      <input
                        type="text"
                        required
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                        placeholder="Expected Return: 15"
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none dark:text-white"
                      />
                      {testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(idx)}
                          className="text-rose-500 text-xs font-bold px-2 py-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignmentForm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Quiz */}
      {showQuizForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 max-w-3xl w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4 my-8">
            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">Create Quiz</h3>
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 text-rose-600 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Course Link</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                  >
                    {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Midterm Quiz"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Instructions</label>
                <textarea
                  required
                  rows={2}
                  value={quizDesc}
                  onChange={(e) => setQuizDesc(e.target.value)}
                  placeholder="No calculators allowed..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                />
              </div>

              {/* Questions Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Questions & Answer Options</label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    + Add Question
                  </button>
                </div>

                <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                  {questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2 relative bg-slate-50/20 dark:bg-slate-800/10">
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="absolute right-3 top-2.5 text-rose-500 text-xs font-bold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                      
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400">Question {qIdx + 1}</span>
                        <input
                          type="text"
                          required
                          value={q.questionText}
                          onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                          placeholder="What is the result of typeof NaN?"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <input
                            key={oIdx}
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => updateQuestionOption(qIdx, oIdx, e.target.value)}
                            placeholder={`Choice ${oIdx + 1}`}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none dark:text-white"
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-slate-500">Correct Choice Key:</label>
                        <select
                          value={q.correctAnswerIndex}
                          onChange={(e) => updateQuestionCorrect(qIdx, e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none dark:text-white"
                        >
                          <option value={0}>Choice 1</option>
                          <option value={1}>Choice 2</option>
                          <option value={2}>Choice 3</option>
                          <option value={3}>Choice 4</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuizForm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                >
                  Publish Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 mx-auto rounded-full flex items-center justify-center mb-2">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Delete Course?</h3>
            <p className="text-slate-500 text-sm">
              This action cannot be undone. This will permanently delete the course, all associated quizzes, coding assignments, and student submissions.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/30"
              >
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
