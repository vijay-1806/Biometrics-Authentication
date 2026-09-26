import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail, Lock, User, AlertCircle, ArrowRight,
  GraduationCap, Users, ShieldAlert, CheckCircle
} from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters long'); return; }
    setError(''); setLoading(true);
    const result = await register(name, email, password, role);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.message);
  };

  const roles = [
    { key: 'student', label: 'Student', icon: GraduationCap, desc: 'Access courses and assessments' },
    { key: 'teacher', label: 'Teacher', icon: Users, desc: 'Create and manage courses' },
    { key: 'admin', label: 'Admin', icon: ShieldAlert, desc: 'Full platform access' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-2/5 p-12 text-white"
        style={{ background: 'linear-gradient(145deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">L</div>
          <span className="font-extrabold text-2xl text-white">LuminaLMS</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-black leading-tight">
            Join LuminaLMS<br />Today.
          </h1>
          <p className="text-indigo-200 text-lg">
            Get started in minutes. Choose your role and begin your learning journey.
          </p>
        </div>
        <p className="text-indigo-300 text-xs">© 2026 LuminaLMS. All rights reserved.</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-7">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white" style={{ background: '#4f46e5' }}>L</div>
            <span className="font-extrabold text-xl text-slate-900">LuminaLMS</span>
          </div>

          <div>
            <h2 className="text-3xl font-black text-slate-900">Create account</h2>
            <p className="text-slate-500 mt-1.5">Fill in the details to get started.</p>
          </div>

          {error && (
            <div className="toast-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="lms-label">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="John Doe" className="lms-input pl-10" />
              </div>
            </div>

            <div>
              <label className="lms-label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com" className="lms-input pl-10" />
              </div>
            </div>

            <div>
              <label className="lms-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" className="lms-input pl-10" />
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label className="lms-label">I'm joining as a</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(r => {
                  const Icon = r.icon;
                  const selected = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all relative"
                      style={{
                        borderColor: selected ? '#6366f1' : '#e2e8f0',
                        background: selected ? '#eef2ff' : '#ffffff',
                        color: selected ? '#4338ca' : '#64748b'
                      }}
                    >
                      {selected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#4f46e5' }}>
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      )}
                      <Icon size={19} />
                      <span className="text-xs font-bold">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}
            >
              {loading ? (
                <div className="lms-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
