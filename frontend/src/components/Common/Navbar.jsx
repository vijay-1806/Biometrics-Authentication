import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user } = useAuth();

  const getFormattedDate = () =>
    new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-7" style={{ boxShadow: '0 1px 0 #f1f5f9' }}>
      {/* Left */}
      <div>
        <p className="text-xs font-medium text-slate-400">{getFormattedDate()}</p>
        <p className="text-sm font-semibold text-slate-700 leading-tight">
          Welcome back, <span className="text-brand-600 font-bold">{user?.name?.split(' ')[0]}</span>
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Notifications"
        >
          <Bell size={18} />
        </button>
        <Link
          to="/profile"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4338ca' }}
          >
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
