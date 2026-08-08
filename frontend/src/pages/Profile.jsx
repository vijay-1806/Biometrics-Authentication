import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Common/Layout';
import { User, Mail, Calendar, Shield, ArrowLeft, Fingerprint, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BiometricEnrollmentModal from '../components/BiometricEnrollmentModal';

const Profile = () => {
  const { user, token } = useAuth();
  const [bioStatus, setBioStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user && token) {
      axios.get('/api/behavior/status', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setBioStatus(res.data))
        .catch(err => console.error('Failed to load biometric status:', err));
    }
  }, [user, token]);

  const getStatusBadge = () => {
    const state = bioStatus?.state || 'collecting';
    if (state === 'full') {
      return <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">Fully Trained (Isolation Forest)</span>;
    }
    if (state === 'provisional') {
      return <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">Provisional Model ({bioStatus?.samples_collected || 10}/20)</span>;
    }
    return <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700">Collecting ({bioStatus?.samples_collected || 0}/10 samples)</span>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Back navigation */}
        <Link 
          to="/dashboard" 
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm max-w-2xl mx-auto overflow-hidden">
          {/* Header Accent */}
          <div className="h-32 bg-gradient-to-r from-brand-650 to-indigo-650 relative">
            <div className="absolute -bottom-10 left-8">
              <div className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-900 bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-3xl shadow-md uppercase">
                {user?.name?.slice(0, 2)}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8 pt-14 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{user?.name}</h2>
              <span className="text-xs text-brand-600 dark:text-brand-400 font-bold px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/30 rounded-full inline-block capitalize mt-1.5">
                {user?.role} Role
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permissions Role</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 capitalize">{user?.role}</p>
                </div>
              </div>

              {user?.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Created</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Biometrics Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl border border-slate-700 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-brand-400" />
                  <span className="font-bold text-sm">Behavioral Biometrics Profile</span>
                </div>
                <div className="pt-1">
                  {getStatusBadge()}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Enrolling your typing baseline ensures real-time trust scoring during proctored coding assessments.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Train Biometrics</span>
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs text-slate-500 border border-slate-100 dark:border-slate-800/60 mt-4">
              <strong>Security Note:</strong> Behavioral biometrics monitor keystroke timing and mouse kinetics during proctored exams to verify your authentic identity without requiring invasive video surveillance.
            </div>

          </div>
        </div>

        {/* Enrollment Modal */}
        <BiometricEnrollmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onStatusUpdate={(newStatus) => setBioStatus(newStatus)}
        />

      </div>
    </Layout>
  );
};

export default Profile;
