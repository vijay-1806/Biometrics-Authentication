import React, { useState, useEffect } from 'react';
import Layout from '../components/Common/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Brain, Upload, Plus, Trash2, CheckCircle, Clock, AlertCircle,
  Lock, FileText, ChevronDown, ChevronUp, Info, Send
} from 'lucide-react';

const MAX_FREE_ENTRIES = 20;

const MLTraining = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [bioStatus, setBioStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestAmount, setRequestAmount] = useState(5);
  const [reqLoading, setReqLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch biometric status to get collected samples
      try {
        const res = await axios.get(`/api/behavior/status/${user._id}`);
        setBioStatus(res.data);
        // Build entries from samples_collected count for display
        const count = res.data?.samples_collected || 0;
        setEntries(Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          label: `Session #${i + 1}`,
          collected: true,
          date: new Date(Date.now() - (count - i) * 86400000 * 2).toISOString()
        })));
      } catch {
        setBioStatus({ state: 'collecting', samples_collected: 0 });
        setEntries([]);
      }

      // Fetch pending requests
      try {
        const reqRes = await axios.get('/api/behavior/training-requests');
        setPendingRequests(reqRes.data || []);
      } catch {
        setPendingRequests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const samplesCollected = bioStatus?.samples_collected || entries.length;
  const approvedExtra = pendingRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0);
  const effectiveLimit = MAX_FREE_ENTRIES + approvedExtra;
  const atLimit = samplesCollected >= effectiveLimit;
  const hasPending = pendingRequests.some(r => r.status === 'pending');
  const overLimit = samplesCollected >= MAX_FREE_ENTRIES && approvedExtra === 0;

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setMsg({ text: 'Please provide a reason for your request.', type: 'error' });
      return;
    }
    setReqLoading(true);
    try {
      await axios.post('/api/behavior/training-requests', {
        reason: requestReason.trim(),
        amount: requestAmount,
      });
      setMsg({ text: 'Request submitted! An admin will review it shortly.', type: 'success' });
      setRequestReason('');
      setShowRequestForm(false);
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Failed to submit request.', type: 'error' });
    } finally {
      setReqLoading(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    }
  };

  const statusColor = {
    full: 'badge-green',
    provisional: 'badge-amber',
    collecting: 'badge-blue',
  }[bioStatus?.state || 'collecting'];

  const statusLabel = {
    full: 'Full Model (Protected)',
    provisional: 'Provisional Model',
    collecting: 'Collecting Data',
  }[bioStatus?.state || 'collecting'];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="lms-spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain size={24} className="text-brand-600" />
            ML Training Data
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your behavioral biometrics training data used to build your identity model.
          </p>
        </div>

        {msg.text && (
          <div className={msg.type === 'success' ? 'toast-success' : 'toast-error'}>
            {msg.text}
          </div>
        )}

        {/* Status Card */}
        <div className="lms-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                <Brain size={22} className="text-brand-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900">Your Biometric Model</h3>
                  <span className={`lms-badge ${statusColor}`}>{statusLabel}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {samplesCollected} of {effectiveLimit} training entries collected
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-slate-900">{samplesCollected}</p>
              <p className="text-xs text-slate-400 font-medium">/ {effectiveLimit} entries</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Collection progress</span>
              <span className="font-semibold">{Math.min(100, Math.round((samplesCollected / effectiveLimit) * 100))}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (samplesCollected / effectiveLimit) * 100)}%`,
                  background: bioStatus?.state === 'full' ? '#22c55e' : bioStatus?.state === 'provisional' ? '#f59e0b' : '#6366f1'
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
              <span>0</span>
              <span className="text-amber-600 font-semibold">10 → Provisional</span>
              <span className="text-green-600 font-semibold">{effectiveLimit} → Full</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd' }}>
          <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-sky-800">
            <p className="font-semibold mb-0.5">How training data works</p>
            <p className="text-sky-700">Each time you type in a session, the system passively collects your typing rhythm. You get up to <strong>{MAX_FREE_ENTRIES}</strong> entries by default. If you need more (e.g. to improve model accuracy), you can request additional entries — an admin must approve this before extra data is accepted.</p>
          </div>
        </div>

        {/* Entries List */}
        <div className="lms-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              <h3 className="font-bold text-slate-900">Training Entries</h3>
              <span className="lms-badge badge-slate">{samplesCollected} collected</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Brain size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="font-medium text-sm">No training entries yet</p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                Your model will start collecting data automatically when you complete coding sessions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={15} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800">{entry.label}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="lms-badge badge-green">Verified</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request More Entries */}
        <div className="lms-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: overLimit ? '#fff7ed' : '#f8fafc' }}>
                <Lock size={18} className={overLimit ? 'text-amber-600' : 'text-slate-400'} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Request Additional Entries</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {overLimit
                    ? `You've reached the ${MAX_FREE_ENTRIES}-entry default limit. Submit a request to add more.`
                    : `You can collect ${effectiveLimit - samplesCollected} more entries within your current limit.`}
                </p>
              </div>
            </div>
            {!hasPending && (
              <button
                onClick={() => setShowRequestForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex-shrink-0"
                style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}
              >
                <Plus size={16} />
                {showRequestForm ? 'Cancel' : 'Request More'}
              </button>
            )}
          </div>

          {hasPending && (
            <div className="mt-4 p-4 rounded-xl flex items-center gap-3" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
              <Clock size={16} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Pending approval</p>
                <p className="text-xs text-amber-700 mt-0.5">You have a request pending admin review. You'll be notified when it's approved.</p>
              </div>
            </div>
          )}

          {showRequestForm && !hasPending && (
            <form onSubmit={handleSubmitRequest} className="mt-5 pt-5 border-t border-slate-100 space-y-4">
              <div>
                <label className="lms-label">Number of Additional Entries</label>
                <select
                  value={requestAmount}
                  onChange={e => setRequestAmount(Number(e.target.value))}
                  className="lms-input"
                >
                  {[5, 10, 15, 20].map(n => (
                    <option key={n} value={n}>+{n} entries (total would be {MAX_FREE_ENTRIES + approvedExtra + n})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lms-label">Reason for Request</label>
                <textarea
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  rows={3}
                  className="lms-input"
                  placeholder="Explain why you need additional training entries (e.g. model accuracy low, switching keyboards, etc.)"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={reqLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50"
                  style={{ background: '#4f46e5' }}
                >
                  {reqLoading ? <div className="lms-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Send size={15} />}
                  Submit Request
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Past Requests */}
        {pendingRequests.length > 0 && (
          <div className="lms-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Request History</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingRequests.map((req, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    req.status === 'approved' ? 'bg-green-50' : req.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                  }`}>
                    {req.status === 'approved' ? <CheckCircle size={15} className="text-green-600" /> :
                     req.status === 'rejected' ? <AlertCircle size={15} className="text-red-600" /> :
                     <Clock size={15} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800">+{req.amount} additional entries</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{req.reason}</p>
                  </div>
                  <span className={`lms-badge ${
                    req.status === 'approved' ? 'badge-green' :
                    req.status === 'rejected' ? 'badge-red' : 'badge-amber'
                  } capitalize`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MLTraining;
