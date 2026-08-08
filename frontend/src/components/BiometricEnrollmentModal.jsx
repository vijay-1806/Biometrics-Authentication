import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';

export default function BiometricEnrollmentModal({ isOpen, onClose, onStatusUpdate }) {
  const { token } = useAuth();
  const [passage, setPassage] = useState('');
  const [typedText, setTypedText] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const eventsRef = useRef([]);
  const inputRef = useRef(null);

  // Fetch passage and student biometric status on modal open
  useEffect(() => {
    if (isOpen) {
      fetchStatusAndPassage();
    }
  }, [isOpen]);

  const fetchStatusAndPassage = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const [statusRes, passageRes] = await Promise.all([
        axios.get('/api/behavior/status', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/behavior/passage/enroll', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStatus(statusRes.data);
      setPassage(passageRes.data.text || 'The quick brown fox jumps over the lazy dog.');
    } catch (err) {
      console.error('Error loading enrollment setup:', err);
      setFeedback({ type: 'error', text: 'Failed to load enrollment text. Ensure ML service is running.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    eventsRef.current.push({
      key: e.key,
      type: 'down',
      t: Date.now()
    });
  };

  const handleKeyUp = (e) => {
    eventsRef.current.push({
      key: e.key,
      type: 'up',
      t: Date.now()
    });
  };

  const handleSubmitSample = async () => {
    if (typedText.trim().length < 20) {
      setFeedback({ type: 'error', text: 'Please type the full passage before submitting.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await axios.post(
        '/api/behavior/enroll',
        { events: eventsRef.current },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTypedText('');
      eventsRef.current = [];
      setStatus({
        state: res.data.state,
        samples_collected: res.data.samples_collected,
        samples_to_provisional: res.data.samples_to_provisional,
        samples_to_full: res.data.samples_to_full
      });

      if (onStatusUpdate) {
        onStatusUpdate(res.data);
      }

      setFeedback({
        type: 'success',
        text: `Sample #${res.data.samples_collected} recorded! State: ${res.data.state.toUpperCase()}`
      });

      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error('Enrollment submission error:', err);
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit sample. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const samplesCount = status?.samples_collected || 0;
  const progressPercent = Math.min(100, Math.round((samplesCount / 10) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Biometric Typing Enrollment</h2>
              <p className="text-xs text-slate-400">Train your continuous authentication model</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-sm">Loading biometric enrollment data...</p>
            </div>
          ) : (
            <>
              {/* Progress Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrollment Progress</span>
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                    {samplesCount} / 10 Samples ({status?.state || 'collecting'})
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-brand-500 to-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {status?.state === 'full' ? (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Your biometric typing model is fully trained and active for exams!</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">
                    Type the passage below naturally. We need at least 10 samples to create your initial baseline.
                  </p>
                )}
              </div>

              {/* Passage Box */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Passage</label>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl font-mono text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 leading-relaxed">
                  {passage}
                </div>
              </div>

              {/* Typing Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Type Here</label>
                <textarea
                  ref={inputRef}
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  rows={4}
                  placeholder="Start typing the passage here..."
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>

              {/* Feedback Message */}
              {feedback && (
                <div className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                  feedback.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {feedback.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                  <span>{feedback.text}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSubmitSample}
            disabled={submitting || loading || typedText.length < 10}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>Submit Sample</span>
          </button>
        </div>
      </div>
    </div>
  );
}
