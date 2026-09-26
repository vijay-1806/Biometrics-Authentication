import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Common/Layout';
import axios from 'axios';
import {
  Mail, Shield, Calendar, Pencil, KeyRound, Check,
  X, TrendingUp, ArrowRight, UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();

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

  useEffect(() => {
    setDisplayName(user?.name || '');
  }, [user]);

  const handleSaveName = async () => {
    if (!displayName.trim() || displayName === user?.name) {
      setEditingName(false);
      return;
    }
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
      setPwMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setPwLoading(true);
    try {
      await axios.post('/api/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => {
        setPwMsg({ text: '', type: '' });
        setShowPwForm(false);
      }, 2500);
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
          <h1 className="text-2xl font-bold text-slate-900">My Profile & Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your personal credentials, account details, and security preferences.
          </p>
        </div>

        {/* Identity Card (Google Workspace Style) */}
        <div className="lms-card overflow-hidden">
          {/* Banner */}
          <div className="h-28" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 50%, #a5b4fc 100%)' }} />

          <div className="px-7 pb-7">
            {/* Avatar & Role */}
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
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setDisplayName(user?.name || '');
                        setEditingName(false);
                      }
                    }}
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
                    onClick={() => {
                      setDisplayName(user?.name || '');
                      setEditingName(false);
                    }}
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Role</p>
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

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <UserCheck size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biometrics Profile</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">Continuous Auth Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Reset Card */}
        <div className="lms-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <KeyRound size={18} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500">Update your security credentials</p>
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
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className={inputCls}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="lms-label">New Password</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    className={inputCls}
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div>
                  <label className="lms-label">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    className={inputCls}
                    placeholder="Repeat new password"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                  style={{ background: '#4f46e5' }}
                >
                  {pwLoading ? <div className="lms-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Check size={16} />}
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Link to My Performance for Students */}
        {user?.role === 'student' && (
          <div style={{
            background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0',
            padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} style={{ color: '#4f46e5' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Looking for your scores?</h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>View your full assessment score history and progress analytics.</p>
              </div>
            </div>
            <Link
              to="/my-performance"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '10px', background: '#fff',
                color: '#4f46e5', border: '1.5px solid #c7d2fe', fontSize: '13px', fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              Open My Performance <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
