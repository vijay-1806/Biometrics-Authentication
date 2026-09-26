import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setError(''); setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.message);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #e8f0ff 100%)', padding: '24px' }}>
      {/* Floating background orbs */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1.5px solid rgba(226,232,240,0.8)',
          boxShadow: '0 8px 40px rgba(79,70,229,0.10), 0 2px 8px rgba(0,0,0,0.05)',
          padding: '48px 44px',
          animation: 'slideUp 350ms cubic-bezier(0.34,1.56,0.64,1)'
        }}>
          {/* Brand header */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
              fontSize: '22px', fontWeight: '900', color: '#fff'
            }}>L</div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Sign in to <strong style={{ color: '#4f46e5' }}>LuminaLMS</strong>
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '12px',
              background: '#fff1f2', border: '1px solid #fecdd3',
              color: '#e11d48', fontSize: '13px', fontWeight: '500',
              marginBottom: '20px', animation: 'fadeIn 150ms ease'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Email or Username
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: focusedField === 'email' ? '#6366f1' : '#9ca3af',
                    pointerEvents: 'none', transition: 'color 150ms ease', zIndex: 1
                  }}
                />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '12px',
                    border: focusedField === 'email' ? '2px solid #6366f1' : '2px solid #e2e8f0',
                    fontSize: '14px', color: '#1e293b',
                    background: '#fafbff', outline: 'none',
                    transition: 'border-color 200ms ease, box-shadow 200ms ease',
                    boxShadow: focusedField === 'email' ? '0 0 0 4px rgba(99,102,241,0.1)' : 'none'
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: focusedField === 'password' ? '#6366f1' : '#9ca3af',
                    pointerEvents: 'none', transition: 'color 150ms ease', zIndex: 1
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  placeholder="Enter your password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 44px 12px 42px',
                    borderRadius: '12px',
                    border: focusedField === 'password' ? '2px solid #6366f1' : '2px solid #e2e8f0',
                    fontSize: '14px', color: '#1e293b',
                    background: '#fafbff', outline: 'none',
                    transition: 'border-color 200ms ease, box-shadow 200ms ease',
                    boxShadow: focusedField === 'password' ? '0 0 0 4px rgba(99,102,241,0.1)' : 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', padding: '4px', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px',
                borderRadius: '12px',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#fff', fontSize: '15px', fontWeight: '700',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(79,70,229,0.35)',
                transform: 'scale(1)',
                transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)'
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.01)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.01)'; }}
            >
              {loading ? (
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite'
                }} />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>New to LuminaLMS?</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <Link
            to="/register"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '12px', borderRadius: '12px',
              border: '2px solid #e2e8f0', background: '#fff',
              color: '#4f46e5', fontWeight: '700', fontSize: '14px',
              textDecoration: 'none',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#f5f3ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
          >
            Create an account
          </Link>
        </div>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '20px' }}>
          © 2026 LuminaLMS · All rights reserved
        </p>
      </div>
    </div>
  );
};

export default Login;
