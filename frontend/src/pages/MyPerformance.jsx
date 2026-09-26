import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Common/Layout';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Award,
  Target,
  FileCode,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MyPerformance = () => {
  const { user } = useAuth();
  const [perf, setPerf] = useState({ avgScore: 0, passRate: 0, totalAttempts: 0, passedAttempts: 0 });
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, [user]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/courses');
      const enrolled = res.data.filter(c => c.studentsEnrolled?.includes(user._id));

      let scoreSum = 0, totalAttempts = 0, passedAttempts = 0;
      const history = [];

      for (const course of enrolled) {
        try {
          const detail = await axios.get(`/api/courses/${course._id}`);
          const { studentData } = detail.data;

          if (studentData?.submissions) {
            studentData.submissions.forEach(sub => {
              const pct = sub.status === 'pass'
                ? 100
                : Math.round((sub.testCasesPassed / Math.max(sub.testCasesTotal, 1)) * 100);
              scoreSum += pct;
              totalAttempts++;
              if (sub.status === 'pass') passedAttempts++;
              history.push({
                id: sub._id,
                title: sub.assignment?.title || 'Coding Assessment',
                course: course.title,
                courseId: course._id,
                score: pct,
                status: sub.status,
                passed: sub.testCasesPassed,
                total: sub.testCasesTotal,
                date: sub.createdAt,
              });
            });
          }
        } catch (_) {}
      }

      const avgScore = totalAttempts > 0 ? Math.round(scoreSum / totalAttempts) : 0;
      const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
      setPerf({ avgScore, passRate, totalAttempts, passedAttempts });
      setScoreHistory(history.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error('Performance fetch error:', err);
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-5xl mx-auto space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Performance</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track your coding scores, assessment history, and biometric integrity over time.
          </p>
        </div>

        {/* Top Summary Metrics Cards (Google Workspace Style) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Avg Score */}
          <div style={{
            background: '#fff', borderRadius: '20px', border: '1.5px solid #e2e8f0',
            padding: '22px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Average Score</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} style={{ color: '#4f46e5' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{perf.avgScore}%</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: perf.avgScore >= 70 ? '#16a34a' : '#ea580c' }}>
                {perf.avgScore >= 70 ? 'Good Standing' : 'Needs Practice'}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '14px' }}>
              <div style={{ height: '100%', width: `${perf.avgScore}%`, background: 'linear-gradient(90deg, #4f46e5, #818cf8)', borderRadius: '999px', transition: 'width 600ms ease' }} />
            </div>
          </div>

          {/* Pass Rate */}
          <div style={{
            background: '#fff', borderRadius: '20px', border: '1.5px solid #e2e8f0',
            padding: '22px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Pass Rate</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} style={{ color: '#16a34a' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{perf.passRate}%</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a' }}>
                {perf.passedAttempts} passed
              </span>
            </div>
            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '14px' }}>
              <div style={{ height: '100%', width: `${perf.passRate}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)', borderRadius: '999px', transition: 'width 600ms ease' }} />
            </div>
          </div>

          {/* Total Attempts */}
          <div style={{
            background: '#fff', borderRadius: '20px', border: '1.5px solid #e2e8f0',
            padding: '22px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Total Submissions</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={18} style={{ color: '#d97706' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{perf.totalAttempts}</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                across enrolled courses
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '14px 0 0' }}>
              Each run is verified with continuous biometrics
            </p>
          </div>
        </div>

        {/* Score History Over Time Table/Cards */}
        <div style={{
          background: '#fff', borderRadius: '20px', border: '1.5px solid #e2e8f0',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCode size={16} style={{ color: '#4f46e5' }} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Score History Over Time
              </h2>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>
              {scoreHistory.length} Record{scoreHistory.length !== 1 ? 's' : ''}
            </span>
          </div>

          {scoreHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 20px', color: '#94a3b8' }}>
              <FileCode size={40} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
              <p style={{ fontWeight: '700', fontSize: '15px', color: '#334155' }}>No assessment attempts recorded yet</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 16px' }}>
                Take your first proctored exam to view your score progression.
              </p>
              <Link
                to="/attend-exam"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 18px', borderRadius: '10px', background: '#4f46e5',
                  color: '#fff', fontSize: '13px', fontWeight: '700', textDecoration: 'none'
                }}
              >
                Attend Exam <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="lms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '14px 24px', fontWeight: '700' }}>Assessment</th>
                    <th style={{ padding: '14px 20px', fontWeight: '700' }}>Course</th>
                    <th style={{ padding: '14px 20px', fontWeight: '700' }}>Date & Time</th>
                    <th style={{ padding: '14px 20px', fontWeight: '700' }}>Test Cases</th>
                    <th style={{ padding: '14px 20px', fontWeight: '700' }}>Score</th>
                    <th style={{ padding: '14px 24px', fontWeight: '700', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreHistory.map((item, idx) => {
                    const isPass = item.status === 'pass';
                    return (
                      <tr
                        key={item.id || idx}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 150ms' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fcfdfe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <p style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', margin: 0 }}>
                            {item.title}
                          </p>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                            {item.course}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                            <Calendar size={13} />
                            <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                            {item.passed} / {item.total}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            fontSize: '14px', fontWeight: '800',
                            color: item.score >= 80 ? '#16a34a' : item.score >= 50 ? '#d97706' : '#dc2626'
                          }}>
                            {item.score}%
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                            background: isPass ? '#f0fdf4' : '#fef2f2',
                            color: isPass ? '#16a34a' : '#dc2626',
                            border: `1px solid ${isPass ? '#bbf7d0' : '#fecdd3'}`
                          }}>
                            {isPass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {isPass ? 'Passed' : 'Needs Work'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyPerformance;
