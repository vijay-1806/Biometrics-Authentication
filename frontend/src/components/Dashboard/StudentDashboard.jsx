import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  FileCode,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Clock,
  Target,
  Award,
  Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [metrics, setMetrics] = useState({ avgScore: 0, totalAttempts: 0, passRate: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/courses');
      const allCourses = res.data;

      const enrolled = allCourses.filter(c => c.studentsEnrolled?.includes(user._id));
      const available = allCourses.filter(c => !c.studentsEnrolled?.includes(user._id));

      setEnrolledCourses(enrolled);
      setAvailableCourses(available);

      // Get "recently accessed" — last 3 enrolled courses
      setRecentCourses(enrolled.slice(0, 3));

      // Compute real performance metrics
      let scoreSum = 0;
      let totalAttempts = 0;
      let passedAttempts = 0;
      const historyData = [];

      for (const course of enrolled) {
        try {
          const detailRes = await axios.get(`/api/courses/${course._id}`);
          const { studentData } = detailRes.data;

          if (studentData?.submissions) {
            studentData.submissions.forEach(sub => {
              const pct = sub.status === 'pass'
                ? 100
                : Math.round((sub.testCasesPassed / Math.max(sub.testCasesTotal, 1)) * 100);
              scoreSum += pct;
              totalAttempts++;
              if (sub.status === 'pass') passedAttempts++;
              historyData.push({
                name: (sub.assignment?.title || 'Task').slice(0, 12),
                score: pct,
                date: sub.createdAt
              });
            });
          }
        } catch (_) { /* skip failed course fetches */ }
      }

      const avgScore = totalAttempts > 0 ? Math.round(scoreSum / totalAttempts) : 0;
      const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

      setMetrics({ avgScore, totalAttempts, passRate });

      // Sort history by date and take last 7
      const sorted = historyData.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);
      setChartData(sorted.length > 0 ? sorted : [
        { name: 'Attempt 1', score: 0 },
        { name: 'Attempt 2', score: 0 },
      ]);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`/api/courses/${courseId}/enroll`);
      showMsg('Successfully enrolled!', 'success');
      fetchDashboardData();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Enrollment failed', 'error');
    }
  };

  const showMsg = (text, type) => {
    setMessage(text); setMsgType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="lms-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track your progress and explore new courses.</p>
      </div>

      {message && (
        <div className={msgType === 'success' ? 'toast-success' : 'toast-error'}>
          {message}
        </div>
      )}

      {/* KPI Metrics — 3 relevant cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="lms-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eef2ff' }}>
            <Award size={20} className="text-brand-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg. Score</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {metrics.avgScore > 0 ? `${metrics.avgScore}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">across all submissions</p>
          </div>
        </div>

        <div className="lms-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
            <Target size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pass Rate</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {metrics.totalAttempts > 0 ? `${metrics.passRate}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{metrics.totalAttempts} attempt{metrics.totalAttempts !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        <div className="lms-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fffbeb' }}>
            <Zap size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Enrolled In</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{enrolledCourses.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">{availableCourses.length} more available</p>
          </div>
        </div>
      </div>

      {/* Score Trend Chart + Recently Accessed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="lms-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Score Trend</h3>
              <p className="text-xs text-slate-400">Performance across your latest code submissions</p>
            </div>
          </div>
          {metrics.totalAttempts === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <FileCode size={32} className="text-slate-300" />
              <p className="text-sm font-medium">No submissions yet</p>
              <p className="text-xs">Complete a coding challenge to see your progress here.</p>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff', border: '1.5px solid #e0e7ff',
                      borderRadius: 10, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                    }}
                    formatter={(v) => [`${v}%`, 'Score']}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recently Accessed */}
        <div className="lms-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={17} className="text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Recently Accessed</h3>
          </div>
          {recentCourses.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <BookOpen size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Enroll in a course to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCourses.map(c => (
                <Link
                  key={c._id}
                  to={`/courses/${c._id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  style={{ border: '1.5px solid #f1f5f9' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#eef2ff' }}>
                    <BookOpen size={16} className="text-brand-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-800 truncate group-hover:text-brand-600 transition-colors">{c.title}</p>
                    <p className="text-xs text-slate-400 truncate">{c.teacher?.name}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0 transition-colors" />
                </Link>
              ))}
              {enrolledCourses.length > 3 && (
                <Link to="/courses" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 px-3 pt-1">
                  View all {enrolledCourses.length} courses <ArrowRight size={12} />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Available Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Available Courses</h2>
            <p className="text-xs text-slate-500">Courses you can enroll in and start learning</p>
          </div>
        </div>

        {availableCourses.length === 0 ? (
          <div className="lms-card p-10 text-center text-slate-400">
            <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="font-medium text-sm">All available courses enrolled!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableCourses.map(c => (
              <div key={c._id} className="lms-card flex flex-col overflow-hidden lms-card-clickable">
                {/* Color accent top bar */}
                <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
                <div className="p-5 flex-1 space-y-2">
                  <h4 className="font-bold text-slate-900">{c.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-2">{c.description}</p>
                  <p className="text-xs text-slate-400 font-medium">Instructor: <span className="text-slate-600">{c.teacher?.name}</span></p>
                </div>
                <div className="px-5 pb-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <FileCode size={13} />
                    <span>Code Assessment</span>
                  </div>
                  <button
                    onClick={() => handleEnroll(c._id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3.5 py-2 rounded-lg transition-colors"
                    style={{ border: '1px solid #c7d2fe' }}
                  >
                    Enroll <ArrowRight size={12} />
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
