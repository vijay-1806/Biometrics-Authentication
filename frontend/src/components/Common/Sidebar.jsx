import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  User,
  LogOut,
  ShieldAlert,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  BarChart3
} from 'lucide-react';

const Sidebar = ({ mobileOpen = false, onNavigate = () => {} }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const getNavLinks = () => {
    const studentLinks = [
      { path: '/dashboard', name: 'My learning', icon: LayoutDashboard },
      { path: '/live-assessments', name: 'Live assessments', icon: ShieldCheck },
      { path: '/my-performance', name: 'Grades & progress', icon: TrendingUp },
      { path: '/profile', name: 'Account settings', icon: User },
    ];

    const teacherLinks = [
      { path: '/dashboard', name: 'Teaching overview', icon: LayoutDashboard },
      { path: '/teacher/assessments/new', name: 'Create assessment', icon: ClipboardList },
      { path: '/teacher/results', name: 'Assessment results', icon: BarChart3 },
      { path: '/profile', name: 'Account settings', icon: User },
    ];

    const adminLinks = [
      { path: '/dashboard', name: 'System overview', icon: LayoutDashboard },
      { path: '/admin/behavior', name: 'Live monitoring', icon: ShieldAlert },
      { path: '/teacher/results', name: 'Assessment results', icon: BarChart3 },
      { path: '/profile', name: 'Account settings', icon: User },
    ];

    if (user?.role === 'student') return studentLinks;
    if (user?.role === 'teacher') return teacherLinks;
    if (user?.role === 'admin') return adminLinks;
    return [];
  };

  const navLinks = getNavLinks();

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <aside className={`app-sidebar w-60 bg-white border-r border-slate-200 flex flex-col h-full ${mobileOpen ? 'mobile-open' : ''}`} style={{ boxShadow: '1px 0 0 #f1f5f9' }}>
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-base" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
              L
            </div>
            <span className="font-extrabold text-lg" style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LuminaLMS
            </span>
          </div>
        </div>

        {/* User Capsule */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4338ca' }}>
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-800 truncate">{user?.name}</p>
              <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full inline-block mt-0.5" style={{ background: '#eef2ff', color: '#4338ca' }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1.5">Learning space</p>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onNavigate}
                className={`lms-nav-link ${active ? 'active' : ''}`}
              >
                <Icon size={17} className={active ? 'text-brand-600' : 'text-slate-400'} />
                <span>{link.name}</span>
                {active && <ChevronRight size={14} className="ml-auto text-brand-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all active:scale-[0.98]"
          >
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutModal(false); }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '380px',
              padding: '28px', boxShadow: '0 20px 48px rgba(0,0,0,0.16)',
              border: '1.5px solid #e2e8f0', textAlign: 'center',
              animation: 'modalSlideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div
              style={{
                width: '52px', height: '52px', borderRadius: '16px', background: '#ffe4e6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}
            >
              <LogOut size={24} style={{ color: '#e11d48' }} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
              Sign Out Confirmation
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px', lineHeight: '1.5' }}>
              Active assessment rooms remain available until their teacher ends them or the timer expires. Draft answers are saved on this device.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#475569', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', transition: 'all 150ms'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                style={{
                  flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #e11d48, #be123c)', color: '#fff',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(225,29,72,0.3)', transition: 'all 150ms'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
