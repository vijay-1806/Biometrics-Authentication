import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  FileCode,
  ChevronRight,
  ArrowRight,
  Users,
  Bell,
  BellOff,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  Clock,
  KeyRound,
  CheckCheck,
  Zap
} from 'lucide-react';

// ─── Notification Panel ────────────────────────────────────────────────────
const NotificationPanel = ({ notifications, onClose, onMarkRead, onMarkAllRead }) => {
  const unread = notifications.filter(n => !n.read);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '92vw',
      background: '#fff', borderLeft: '1.5px solid #e2e8f0',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', zIndex: 100,
      display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 250ms cubic-bezier(0.34,1.56,0.64,1)'
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={17} style={{ color: '#4f46e5' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>Notifications</span>
              {unread.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '11px', fontWeight: '800', padding: '1px 8px' }}>
                  {unread.length}
                </span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Announcements from teachers & admins</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {unread.length > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Mark all as read"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '6px 10px', fontSize: '11px', fontWeight: '700', color: '#4f46e5',
                cursor: 'pointer', transition: 'all 150ms'
              }}
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <BellOff size={40} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
            <p style={{ fontWeight: '700', fontSize: '15px', color: '#334155' }}>No notifications yet</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Messages from instructors will appear here</p>
          </div>
        ) : (
          notifications.map((n, i) => {
            const iconMap = {
              info: <Info size={15} style={{ color: '#3b82f6' }} />,
              warning: <AlertTriangle size={15} style={{ color: '#f59e0b' }} />,
              success: <CheckCircle size={15} style={{ color: '#22c55e' }} />
            };
            const notifId = n._id || i;

            return (
              <div
                key={notifId}
                onClick={() => onMarkRead(notifId)}
                style={{
                  padding: '14px', borderRadius: '14px', marginBottom: '8px',
                  background: n.read ? '#ffffff' : '#f5f7ff',
                  border: `1.5px solid ${n.read ? '#f1f5f9' : '#c7d2fe'}`,
                  cursor: 'pointer', transition: 'all 200ms ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    background: n.read ? '#f8fafc' : '#eef2ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {iconMap[n.type] || iconMap.info}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <p style={{ fontWeight: n.read ? '600' : '800', fontSize: '13px', color: '#1e293b', margin: 0 }}>
                        {n.title}
                      </p>
                      {n.read ? (
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                          Seen
                        </span>
                      ) : (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', marginTop: '4px', marginBottom: 0 }}>
                      {n.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', color: '#94a3b8', fontSize: '11px' }}>
                      <Clock size={11} />
                      <span>{n.fromName || 'Teacher'} · {new Date(n.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Course Card ────────────────────────────────────────────────────────────
const CourseCard = ({ course, enrolled, onEnroll, onOpenJoinSession }) => {
  const [hovered, setHovered] = useState(false);

  const colors = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
  const colorIndex = (course.title?.charCodeAt(0) || 0) % colors.length;
  const accentColor = colors[colorIndex];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '20px',
        border: '1.5px solid #e8edf5',
        background: '#fff',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 250ms cubic-bezier(0.34,1.56,0.64,1)'
      }}
    >
      {/* Color accent top */}
      <div style={{ height: '6px', background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />

      {/* Icon area */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={20} style={{ color: accentColor }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h4 style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</h4>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', fontWeight: '500' }}>
            by <span style={{ color: '#4f46e5', fontWeight: '600' }}>{course.teacher?.name || 'Instructor'}</span>
          </p>
        </div>
      </div>

      <div style={{ padding: '12px 20px', flex: 1 }}>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {course.description || 'Explore this course to expand your skills.'}
        </p>
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
          <Users size={13} />
          <span>{course.studentsEnrolled?.length || 0} enrolled</span>
        </div>

        {enrolled ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onOpenJoinSession(course)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '12px', fontWeight: '700', color: '#4f46e5',
                padding: '6px 12px', borderRadius: '8px',
                background: '#eef2ff', border: '1px solid #c7d2fe',
                cursor: 'pointer', transition: 'all 150ms ease'
              }}
              title="Join a live proctored exam session"
            >
              <KeyRound size={12} /> Join Session
            </button>
            <Link
              to={`/courses/${course._id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '12px', fontWeight: '700', color: '#334155',
                textDecoration: 'none', padding: '6px 12px', borderRadius: '8px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                transition: 'all 150ms ease'
              }}
            >
              Details <ChevronRight size={13} />
            </Link>
          </div>
        ) : (
          <button
            onClick={() => onEnroll(course._id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '12px', fontWeight: '700', color: '#fff',
              padding: '6px 14px', borderRadius: '8px',
              background: accentColor, border: 'none', cursor: 'pointer',
              boxShadow: `0 2px 8px ${accentColor}40`,
              transition: 'all 150ms ease'
            }}
          >
            Enroll <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main StudentDashboard ───────────────────────────────────────────────────
const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'available'

  // Join Session Dialog State
  const [joinModalCourse, setJoinModalCourse] = useState(null);
  const [joinPin, setJoinPin] = useState('');
  const [joinError, setJoinError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/courses');
      const allCourses = res.data;
      const enrolled = allCourses.filter(c => c.studentsEnrolled?.includes(user._id));
      const available = allCourses.filter(c => !c.studentsEnrolled?.includes(user._id));
      setEnrolledCourses(enrolled);
      setAvailableCourses(available);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
  }, [user]);

  const handleEnroll = async (courseId) => {
    try {
      await axios.post(`/api/courses/${courseId}/enroll`);
      showMsg('Successfully enrolled in course!', 'success');
      fetchDashboardData();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Enrollment failed', 'error');
    }
  };

  const handleMarkRead = async (notifId) => {
    // 1. Immediately update UI state so badge drops
    setNotifications(prev => prev.map((n, i) =>
      (n._id === notifId || i === notifId) ? { ...n, read: true } : n
    ));
    // 2. Persist to backend
    try {
      if (notifId && typeof notifId === 'string' && notifId.length > 5) {
        await axios.patch(`/api/notifications/${notifId}/read`);
      }
    } catch (err) {
      console.error('Failed to mark read on server:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await axios.patch('/api/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const showMsg = (text, type) => {
    setMessage(text); setMsgType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleQuickJoinSession = (e) => {
    e.preventDefault();
    if (!joinPin.trim()) {
      setJoinError('Please enter a 6-digit Session ID');
      return;
    }
    // Navigate to Attend Exam or assignment coding practice with the pin
    navigate(`/attend-exam?pin=${joinPin.trim()}&courseId=${joinModalCourse?._id || ''}`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="lms-spinner" />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Drawer Overlay */}
      {showNotifications && (
        <>
          <div
            onClick={() => setShowNotifications(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.25)', zIndex: 99, backdropFilter: 'blur(2px)' }}
          />
          <NotificationPanel
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </>
      )}

      {/* Quick Join Session Modal (No password required) */}
      {joinModalCourse && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setJoinModalCourse(null); }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '420px',
              padding: '28px', boxShadow: '0 20px 48px rgba(0,0,0,0.16)',
              border: '1.5px solid #e2e8f0',
              animation: 'modalSlideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={20} style={{ color: '#4f46e5' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Join Live Session</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{joinModalCourse.title}</p>
                </div>
              </div>
              <button
                onClick={() => setJoinModalCourse(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickJoinSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {joinError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' }}>
                  {joinError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Session ID (6-digit PIN)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 583920"
                  value={joinPin}
                  onChange={e => { setJoinPin(e.target.value.replace(/\D/g, '')); setJoinError(''); }}
                  style={{
                    width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: '24px',
                    fontWeight: '800', letterSpacing: '6px', fontFamily: 'monospace',
                    padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                    outline: 'none', color: '#0f172a'
                  }}
                  autoFocus
                />
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                  Enter the 6-digit session PIN announced by your instructor. No password required.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setJoinModalCourse(null)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                    background: '#fff', color: '#475569', fontSize: '13px', fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '11px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff',
                    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
                  }}
                >
                  Enter Exam Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-7">
        {/* Page Header — contains the SINGLE functional notification bell */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeView === 'dashboard' ? 'My Dashboard' : 'Available Courses'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {activeView === 'dashboard'
                ? `Welcome back, ${user?.name?.split(' ')[0]}! Access your enrolled courses and attend live exams.`
                : 'Browse and enroll in courses to start learning.'}
            </p>
          </div>

          {/* Dedicated Single Functional Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            title="Notifications"
            style={{
              position: 'relative', width: '42px', height: '42px',
              borderRadius: '12px', border: '1.5px solid #e2e8f0',
              background: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 200ms ease', flexShrink: 0
            }}
          >
            <Bell size={18} style={{ color: '#4f46e5' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '800',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Live Exam Fast Action Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          borderRadius: '20px', padding: '20px 24px', color: '#fff',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          boxShadow: '0 8px 24px rgba(79,70,229,0.22)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#fff' }}>Ready for a proctored exam?</h3>
              <p style={{ fontSize: '13px', margin: '2px 0 0', opacity: 0.9 }}>Join a live proctored session directly using your Session PIN.</p>
            </div>
          </div>
          <Link
            to="/attend-exam"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', borderRadius: '12px', background: '#fff',
              color: '#4f46e5', fontWeight: '800', fontSize: '13px', textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 150ms'
            }}
          >
            <KeyRound size={15} /> Attend Exam Now
          </Link>
        </div>

        {/* View Toggle Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '14px', padding: '4px', width: 'fit-content' }}>
          {[
            { key: 'dashboard', label: 'My Enrolled Courses' },
            { key: 'available', label: 'Available Courses' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              style={{
                padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: '700', fontSize: '13px', transition: 'all 200ms ease',
                background: activeView === tab.key ? '#fff' : 'transparent',
                color: activeView === tab.key ? '#4f46e5' : '#64748b',
                boxShadow: activeView === tab.key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {tab.label}
              {tab.key === 'dashboard' && (
                <span style={{ marginLeft: '6px', background: activeView === tab.key ? '#eef2ff' : '#e2e8f0', color: activeView === tab.key ? '#4f46e5' : '#94a3b8', borderRadius: '999px', fontSize: '11px', fontWeight: '700', padding: '1px 7px' }}>
                  {enrolledCourses.length}
                </span>
              )}
              {tab.key === 'available' && (
                <span style={{ marginLeft: '6px', background: activeView === tab.key ? '#eef2ff' : '#e2e8f0', color: activeView === tab.key ? '#4f46e5' : '#94a3b8', borderRadius: '999px', fontSize: '11px', fontWeight: '700', padding: '1px 7px' }}>
                  {availableCourses.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {message && (
          <div className={msgType === 'success' ? 'toast-success' : 'toast-error'}>
            {message}
          </div>
        )}

        {/* Dashboard View — My Enrolled Courses */}
        {activeView === 'dashboard' && (
          <div>
            {enrolledCourses.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '64px 24px',
                background: '#fff', borderRadius: '20px',
                border: '1.5px dashed #e2e8f0'
              }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <BookOpen size={28} style={{ color: '#4f46e5' }} />
                </div>
                <p style={{ fontWeight: '700', fontSize: '16px', color: '#334155', margin: '0 0 8px' }}>No courses enrolled yet</p>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Explore available courses and start learning today</p>
                <button
                  onClick={() => setActiveView('available')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff',
                    fontWeight: '700', fontSize: '14px',
                    boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
                  }}
                >
                  Browse Courses <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
                {enrolledCourses.map(c => (
                  <CourseCard
                    key={c._id}
                    course={c}
                    enrolled={true}
                    onOpenJoinSession={(course) => {
                      setJoinModalCourse(course);
                      setJoinPin('');
                      setJoinError('');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Available Courses View */}
        {activeView === 'available' && (
          <div>
            {availableCourses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px', background: '#fff', borderRadius: '20px', border: '1.5px dashed #e2e8f0' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <FileCode size={28} style={{ color: '#16a34a' }} />
                </div>
                <p style={{ fontWeight: '700', fontSize: '16px', color: '#334155', margin: '0 0 8px' }}>All courses enrolled!</p>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>You've enrolled in all available courses. Check back later for new ones.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
                {availableCourses.map(c => (
                  <CourseCard key={c._id} course={c} enrolled={false} onEnroll={handleEnroll} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
