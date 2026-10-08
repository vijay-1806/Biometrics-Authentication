import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Server, Activity, Key, PlusCircle, Trash2, Globe, ShieldAlert,
  LogOut, RefreshCw, Layers
} from 'lucide-react';

const MLAdminDashboard = () => {
  const [token, setToken] = useState(localStorage.getItem('ml_admin_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [tenants, setTenants] = useState([]);
  const [health, setHealth] = useState(null);

  // Axios instance specifically for ML Backend
  const mlApi = axios.create({
    baseURL: 'http://localhost:8000/v1',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await mlApi.post('/auth/login', { email, password });
      const sessToken = res.data.session_token;
      if (res.data.user.role !== 'admin') {
        setError('Access denied. Super Admin privileges required.');
        setLoading(false);
        return;
      }
      setToken(sessToken);
      localStorage.setItem('ml_admin_token', sessToken);
      mlApi.defaults.headers['Authorization'] = `Bearer ${sessToken}`;
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('ml_admin_token');
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tenantsRes, healthRes] = await Promise.all([
        mlApi.get('/tenants'),
        mlApi.get('/system/health')
      ]);
      setTenants(tenantsRes.data.tenants || []);
      setHealth(healthRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      } else {
        setError('Failed to fetch ML service data');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Server size={24} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">ML Platform Admin</h2>
          <p className="text-center text-sm text-slate-500 mb-6">Sign in with your Super Admin credentials to manage API tenants.</p>
          
          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">{error}</div>}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Email</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="admin@bioauth.service"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Password</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all">
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            ML Service Admin
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold uppercase tracking-wider">Superadmin</span>
          </h1>
          <p className="text-slate-500 mt-1">Manage global BaaS tenants, API quotas, and monitor ML infrastructure health.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm rounded-xl transition-all">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-sm rounded-xl transition-all">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl">{error}</div>}
      {message && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl">{message}</div>}

      {/* Cluster Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Tenants</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{tenants.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Server size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cached ML Models</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{health?.cache_size_bytes ? (health.cache_size_bytes / 1024 / 1024).toFixed(1) : 0} MB</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global API Req/min</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{health?.api_requests_per_min || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Latency (ms)</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{health?.avg_latency_ms || 0}</h3>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Platform Tenants</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage organizations consuming the BaaS API.</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all">
            <PlusCircle size={14} />
            Provision Tenant
          </button>
        </div>
        
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No tenants registered on the platform.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Tenant ID</th>
                  <th className="px-6 py-3">Tier</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Webhooks</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex justify-center items-center font-bold text-xs">
                          {t.name.charAt(0)}
                        </div>
                        {t.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{t.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        t.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                        t.tier === 'growth' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.tier || 'starter'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {t.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {t.webhook_url ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                          <Globe size={14} /> Enabled
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MLAdminDashboard;
