import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, 
  FileCode, 
  HelpCircle, 
  Award, 
  ChevronRight, 
  CheckCircle, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [stats, setStats] = useState({
    enrolledCount: 0,
    assignmentsCount: 0,
    quizzesCount: 0,
    avgScore: 0
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/courses');
      const allCourses = res.data;
      setCourses(allCourses);

      // Filter enrolled vs available
      const enrolled = allCourses.filter(c => 
        c.studentsEnrolled?.includes(user._id)
      );
      const available = allCourses.filter(c => 
        !c.studentsEnrolled?.includes(user._id)
      );

      setEnrolledCourses(enrolled);
      setAvailableCourses(available);

      // Aggregations from enrolled courses
      let totalAssignments = 0;
      let totalQuizzes = 0;
      let scoreSum = 0;
      let gradedItemsCount = 0;
      const historyData = [];

      for (const course of enrolled) {
        const detailRes = await axios.get(`/api/courses/${course._id}`);
        const { assignments, quizzes, studentData } = detailRes.data;

        totalAssignments += assignments?.length || 0;
        totalQuizzes += quizzes?.length || 0;

        // Process quiz scores
        if (studentData?.results) {
          studentData.results.forEach(res => {
            scoreSum += res.percentage;
            gradedItemsCount++;
            historyData.push({
              name: res.quiz?.title || 'Quiz',
              score: res.percentage,
              type: 'Quiz'
            });
          });
        }

        // Process coding assignment scores
        if (studentData?.submissions) {
          studentData.submissions.forEach(sub => {
            if (sub.status === 'pass') {
              scoreSum += 100;
              gradedItemsCount++;
              historyData.push({
                name: sub.assignment?.title || 'Coding',
                score: 100,
                type: 'Coding'
              });
            } else if (sub.status === 'fail') {
              const passPct = Math.round((sub.testCasesPassed / sub.testCasesTotal) * 100) || 0;
              scoreSum += passPct;
              gradedItemsCount++;
              historyData.push({
                name: sub.assignment?.title || 'Coding',
                score: passPct,
                type: 'Coding'
              });
            }
          });
        }
      }

      setStats({
        enrolledCount: enrolled.length,
        assignmentsCount: totalAssignments,
        quizzesCount: totalQuizzes,
        avgScore: gradedItemsCount > 0 ? Math.round(scoreSum / gradedItemsCount) : 0
      });

      // Store only genuine submission history from real student data
      setChartData(historyData.slice(-6));

    } catch (err) {
      console.error('Error fetching student dashboard details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`/api/courses/${courseId}/enroll`);
      setMessage('Successfully enrolled in course!');
      setTimeout(() => setMessage(''), 3000);
      fetchDashboardData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Enrollment failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Heading */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Student Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Track your courses, programming progress, and test scores.</p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">
          {message}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Enrolled Courses */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Enrolled Courses</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.enrolledCount}</h3>
          </div>
        </div>

        {/* Coding Tasks */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileCode size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Coding Tasks</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.assignmentsCount}</h3>
          </div>
        </div>

        {/* Available Quizzes */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <HelpCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quiz Assignments</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.quizzesCount}</h3>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Average Grade</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.avgScore}%</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-600" />
                Performance Metrics
              </h3>
              <p className="text-xs text-slate-400">Score progress across quizzes and coding submissions</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                  />
                  <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm font-medium">No submission history yet.</p>
                <p className="text-xs text-slate-400 mt-1">Complete assignments or quizzes to view performance metrics.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info - Quick Status */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Courses</h3>
          {enrolledCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">You are not enrolled in any courses.</p>
              <p className="text-xs text-slate-400 mt-1">Enroll in available courses below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrolledCourses.map(c => (
                <Link 
                  key={c._id} 
                  to={`/courses/${c._id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/10 dark:hover:bg-brand-950/10 transition-all group"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {c.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Taught by {c.teacher?.name}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Courses Catalog Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Course Catalog</h3>
        {availableCourses.length === 0 ? (
          <p className="text-slate-400 text-sm bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            No new courses available for enrollment.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availableCourses.map(c => (
              <div key={c._id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                <div className="p-6 space-y-3">
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">{c.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3">{c.description}</p>
                  <p className="text-xs font-semibold text-slate-400">Teacher: {c.teacher?.name}</p>
                </div>
                <div className="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Self-Paced</span>
                  <button
                    onClick={() => handleEnroll(c._id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/50 px-3.5 py-2 rounded-lg transition-all"
                  >
                    <span>Enroll Now</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentDashboard;
