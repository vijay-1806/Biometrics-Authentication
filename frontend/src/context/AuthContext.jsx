import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure axios base url (uses relative path for proxy compliance)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  // Configure Axios headers whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Always enforce light theme
  useEffect(() => {
    window.document.documentElement.classList.remove('dark');
  }, []);

  // Global Axios interceptor for single-device session enforcement
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401 && error.response.data?.sessionExpired) {
          // Show a polished toast banner instead of a browser alert
          const banner = document.createElement('div');
          banner.id = 'session-expired-banner';
          banner.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #fff1f2; border: 1.5px solid #fecdd3; color: #e11d48;
            padding: 14px 24px; border-radius: 14px;
            font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600;
            box-shadow: 0 8px 32px rgba(225,29,72,0.15);
            z-index: 99999; display: flex; align-items: center; gap: 10px;
            animation: slideDown 300ms ease;
            max-width: 420px; text-align: center;
          `;
          banner.innerHTML = `<span>🔒</span><span>Your account was logged in on another device. This session has been ended.</span>`;
          document.body.appendChild(banner);
          setToken('');
          setUser(null);
          setTimeout(() => { window.location.href = '/login'; }, 2500);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Fetch user profile on load & heartbeat check for single-session eviction
  useEffect(() => {
    let intervalId;
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get('/api/auth/profile');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to fetch profile', err);
          setToken('');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();

    // Heartbeat every 5 seconds to detect single-session eviction when logged in from another device
    if (token) {
      intervalId = setInterval(async () => {
        try {
          await axios.get('/api/auth/profile');
        } catch (err) {
          // Interceptor will trigger force-logout if 401 sessionExpired
        }
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      setUser({
        _id: res.data._id,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please try again.',
      };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const res = await axios.post('/api/auth/register', { name, email, password, role });
      setToken(res.data.token);
      setUser({
        _id: res.data._id,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed. Please try again.',
      };
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        login,
        register,
        logout,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
