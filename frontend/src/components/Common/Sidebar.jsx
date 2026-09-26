import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  User,
  LogOut,
  Brain,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const getNavLinks = () => {
    const studentLinks = [
      { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
      { path: '/courses', name: 'My Courses', icon: BookOpen },
      { path: '/ml-training', name: 'ML Training Data', icon: Brain },
      { path: '/profile', name: 'My Profile', icon: User },
    ];

    const teacherLinks = [
      { path: '/dashboard', name: 'Teacher Panel', icon: LayoutDashboard },
      { path: '/courses', name: 'My Courses', icon: BookOpen },
      { path: '/admin/behavior', name: 'Proctor Monitor', icon: ShieldAlert },
      { path: '/profile', name: 'My Profile', icon: User },
    ];

    const adminLinks = [
      { path: '/dashboard', name: 'Admin Control', icon: LayoutDashboard },
      { path: '/courses', name: 'Manage Courses', icon: BookOpen },
      { path: '/admin/behavior', name: 'Proctor Monitor', icon: ShieldAlert },
      { path: '/profile', name: 'My Profile', icon: User },
    ];

    if (user?.role === 'student') return studentLinks;
    if (user?.role === 'teacher') return teacherLinks;
    if (user?.role === 'admin') return adminLinks;
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full" style={{ boxShadow: '1px 0 0 #f1f5f9' }}>
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
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1.5">Navigation</p>
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`lms-nav-link ${active ? 'active' : ''}`}
            >
              <Icon size={17} className={active ? 'text-brand-600' : 'text-slate-400'} />
              <span>{link.name}</span>
              {active && <ChevronRight size={14} className="ml-auto text-brand-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
