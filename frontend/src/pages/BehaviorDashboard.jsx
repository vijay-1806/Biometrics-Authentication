import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SEVERITY_COLORS = { high: '#dc2626', medium: '#d97706', low: '#65a30d' };

export default function BehaviorDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewed, setShowReviewed] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [showReviewed]);

  const fetchAlerts = () => {
    setLoading(true);
    // If showReviewed is false, we only fetch unreviewed alerts. Otherwise fetch all.
    const query = showReviewed ? '' : '?reviewed=false';
    axios.get(`/api/behavior/alerts${query}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setAlerts(res.data))
      .catch(err => console.error("Error fetching alerts", err))
      .finally(() => setLoading(false));
  };

  const handleReview = async (id, reviewed, reviewerNote) => {
    try {
      const res = await axios.patch(`/api/behavior/alerts/${id}`, { reviewed, reviewerNote }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!showReviewed && reviewed) {
        // If we are hiding reviewed alerts, remove it from the list immediately
        setAlerts(prev => prev.filter(a => a._id !== id));
      } else {
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, ...res.data } : a));
      }
    } catch (error) {
      console.error("Error reviewing alert", error);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Suspicious Exam Activity</h1>
          <p className="text-slate-500 text-sm mt-1">Review flagged behavior for students across your courses.</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showReviewed} 
            onChange={(e) => setShowReviewed(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show resolved alerts</span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-8 text-center">
          <h3 className="text-emerald-800 dark:text-emerald-300 font-semibold text-lg mb-1">All clear!</h3>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm">No suspicious behavior requires your attention right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <AlertCard
              key={alert._id}
              alert={alert}
              onReview={handleReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onReview }) {
  const [note, setNote] = useState(alert.reviewerNote || '');
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate a human-readable reason
  let reason = '';
  if (alert.alertType === 'behavioral_anomaly') {
    reason = "Typing rhythm or mouse movements deviated significantly from this student's historical baseline.";
  } else if (alert.alertType === 'paste_detected') {
    const f = alert.topDeviatingFeatures || {};
    reason = `Student pasted ${f.totalPastedChars || 'a large block of'} characters directly into the exam.`;
  } else if (alert.alertType === 'device_change') {
    reason = "Student changed devices or browsers in the middle of the exam.";
  }

  return (
    <div className={`border rounded-xl p-5 shadow-sm transition-all duration-200 ${alert.reviewed ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900/50'}`}>
      <div className="flex items-start gap-4">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
          title={`Severity: ${alert.severity}`}
        />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">
                {alert.student?.name || alert.student?.email || 'Unknown Student'}
              </h3>
              <p className="text-brand-600 dark:text-brand-400 font-medium text-sm">
                Exam: {alert.exam?.title || 'Unknown Exam'}
              </p>
            </div>
            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
              {new Date(alert.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="mt-3 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 p-3 rounded-lg border border-rose-100 dark:border-rose-900/40">
            <p className="font-medium text-sm">{reason}</p>
          </div>

          <div className="mt-4 flex gap-3 items-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 underline-offset-4"
            >
              {isExpanded ? 'Hide Details & Actions' : 'Review Issue'}
            </button>
            {alert.reviewed && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ✓ Resolved by Teacher
              </span>
            )}
          </div>

          {isExpanded && (
            <div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-4 animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Teacher Notes (Optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g., Exam required pasting code, anomaly ignored."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                rows={2}
              />
              <div className="flex gap-3 mt-3">
                {!alert.reviewed ? (
                  <button
                    onClick={() => {
                      onReview(alert._id, true, note);
                      setIsExpanded(false);
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
                  >
                    Mark as Resolved
                  </button>
                ) : (
                  <button
                    onClick={() => onReview(alert._id, false, note)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium rounded-lg text-sm transition-colors"
                  >
                    Reopen Issue
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
