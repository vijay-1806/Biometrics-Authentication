import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Common/Layout';
import axios from 'axios';
import {
  Mail, Shield, Calendar, Pencil, KeyRound, Check,
  X, Award, Target, FileCode, TrendingUp, ChevronRight
} from 'lucide-react';

const Profile = () => {
  const { user, token } = useAuth();

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  // Password reset state
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: '', type: '' });

  // Performance state
  const [perf, setPerf] = useState({ avgScore: 0, passRate: 0, totalAttempts: 0 });
  const [scoreHistory, setScoreHistory] = useState([]);
  const [perfLoading, setPerfLoading] = useState(true);

  useEffect(() => {
    setDisplayName(user?.name || '');
  }, [user]);

  useEffect(() => {
    if (user?.role === 'student') fetchPerformance();
    else setPerfLoading(false);
  }, [user]);

  const fetchPerformance = async () => {
    try {
      setPerfLoading(true);
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
                title: sub.assignment?.title || 'Coding Task',
                course: course.title,
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
      setPerf({ avgScore, passRate, totalAttempts });
      setScoreHistory(history.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error('Performance fetch error:', err);
    } finally {
      setPerfLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim() || displayName === user?.name) { setEditingName(false); return; }
    setNameLoading(true);
    try {
      await axios.patch('/api/auth/profile', { name: displayName.trim() });
      setNameMsg('Name updated successfully!');
      setTimeout(() => setNameMsg(''), 3000);
    } catch (err) {
      setNameMsg(err.response?.data?.message || 'Failed to update name');
      setDisplayName(user?.name || '');
    } finally {
      setNameLoading(false);
      setEditingName(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ text: 'Passwords do not match.', type: 'error' }); return;
    }
    if (newPw.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters.', type: 'error' }); return;
    }
    setPwLoading(true);
    try {
      await axios.post('/api/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setPwMsg({ text: '', type: '' }); setShowPwForm(false); }, 2500);
    } catch (err) {
      setPwMsg({ text: err.response?.data?.message || 'Failed to update password.', type: 'error' });
    } finally {
      setPwLoading(false);
    }
  };

  const inputCls = 'lms-input';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your account information and view your performance.</p>
        </div>

        {/* Identity Card */}
        <div className="lms-card overflow-hidden">
          {/* Banner */}
          <div className="h-28" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 50%, #a5b4fc 100%)' }} />

          <div className="px-7 pb-7">
            {/* Avatar */}
            <div className="flex items-end gap-5 -mt-8 mb-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black border-4 border-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4338ca' }}
              >
                {(displayName || user?.name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="pb-1">
                <span className="lms-badge badge-blue capitalize">{user?.role}</span>
              </div>
            </div>

            {/* Name edit */}
            {nameMsg && (
              <p className="text-xs font-medium text-brand-600 mb-3">{nameMsg}</p>
            )}
            <div className="flex items-center gap-3 mb-5">
              {editingName ? (
                <>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className={`${inputCls} text-xl font-bold max-w-xs`}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setDisplayName(user?.name || ''); setEditingName(false); } }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={nameLoading}
                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                    title="Save"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => { setDisplayName(user?.name || ''); setEditingName(false); }}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-slate-900">{displayName || user?.name}</h2>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition-colors"
                    title="Edit name"
                  >
                    <Pencil size={15} />
                  </button>
                </>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5 capitalize">{user?.role}</p>
                </div>
              </div>

              {user?.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member Since</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Password Reset */}
        <div className="lms-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <KeyRound size={17} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500">Update your account password</p>
              </div>
            </div>
            <button
              onClick={() => setShowPwForm(v => !v)}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 px-4 py-2 rounded-xl hover:bg-brand-50 transition-colors"
            >
              {showPwForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPwForm && (
            <form onSubmit={handlePasswordReset} className="mt-5 pt-5 border-t border-slate-100 space-y-4">
              {pwMsg.text && (
                <div className={pwMsg.type === 'success' ? 'toast-success' : 'toast-error'}>
                  {pwMsg.text}
                </div>
              )}
              <div>
                <label className="lms-label">Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className={inputCls} placeholder="Enter current password" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="lms-label">New Password</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inputCls} placeholder="Min 6 characters" required />
                </div>
                <div>
                  <label className="lms-label">Confirm Password</label>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} placeholder="Repeat new password" required />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  style={{ background: '#4f46e5' }}
                >
                  {pwLoading ? <div className="lms-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Check size={16} />}
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Performance Metrics — students only */}
        {user?.role === 'student' && (
          <>
            <div className="lms-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-brand-600" />
                <h3 className="font-bold text-slate-900">Performance Overview</h3>
              </div>

              {perfLoading ? (
                <div className="flex justify-center py-6"><div className="lms-spinner" /></div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl" style={{ background: '#eef2ff' }}>
                    <Award size={20} className="text-brand-600 mx-auto mb-1" />
                    <p className="text-2xl font-black text-slate-900">{perf.avgScore > 0 ? `${perf.avgScore}%` : '—'}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Avg. Score</p>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ background: '#f0fdf4' }}>
                    <Target size={20} className="text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-black text-slate-900">{perf.totalAttempts > 0 ? `${perf.passRate}%` : '—'}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Pass Rate</p>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ background: '#fffbeb' }}>
                    <FileCode size={20} className="text-amber-600 mx-auto mb-1" />
                    <p className="text-2xl font-black text-slate-900">{perf.totalAttempts}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Submissions</p>
                  </div>
                </div>
              )}
            </div>

            {/* Score History */}
            <div className="lms-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileCode size={17} className="text-slate-500" />
                <h3 className="font-bold text-slate-900">Score History</h3>
              </div>

              {perfLoading ? (
                <div className="flex justify-center py-10"><div className="lms-spinner" /></div>
              ) : scoreHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileCode size={36} className="mx-auto text-slate-200 mb-3" />
                  <p className="font-medium text-sm">No submissions yet</p>
                  <p className="text-xs mt-1">Complete coding challenges in your courses to build your history.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="lms-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Course</th>
                        <th>Score</th>
                        <th>Result</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreHistory.map((item, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-slate-800">{item.title}</td>
                          <td className="text-slate-500">{item.course}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="progress-bar w-20">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${item.score}%`,
                                    background: item.score >= 70 ? '#22c55e' : item.score >= 40 ? '#f59e0b' : '#ef4444'
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{item.score}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`lms-badge ${item.status === 'pass' ? 'badge-green' : 'badge-red'}`}>
                              {item.status === 'pass' ? 'Passed' : `${item.passed}/${item.total} tests`}
                            </span>
                          </td>
                          <td className="text-slate-400 text-xs">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
