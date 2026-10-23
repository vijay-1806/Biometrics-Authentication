import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  X, 
  Activity, 
  Layers, 
  Copy, 
  ExternalLink,
  Award
} from 'lucide-react';

export default function BehaviorReportModal({ isOpen, onClose, assessmentSessionId, studentId, studentName }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && assessmentSessionId) {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const url = `/api/behavior/report/${assessmentSessionId}${studentId ? `?studentId=${studentId}` : ''}`;

      axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          setReport(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading report:', err);
          setError(err.response?.data?.error || 'Failed to load candidate behavior report.');
          setLoading(false);
        });
    }
  }, [isOpen, assessmentSessionId, studentId]);

  if (!isOpen) return null;

  const getVerdictBadge = (status) => {
    switch (status) {
      case 'AUTHENTICATED':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 rounded-full font-bold text-xs">
            <CheckCircle size={14} />
            <span>AUTHENTICATED</span>
          </div>
        );
      case 'REQUIRES_REVIEW':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 rounded-full font-bold text-xs">
            <AlertTriangle size={14} />
            <span>REQUIRES REVIEW</span>
          </div>
        );
      case 'SUSPICIOUS':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 rounded-full font-bold text-xs">
            <XCircle size={14} />
            <span>SUSPICIOUS</span>
          </div>
        );
      case 'DEGRADED':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 rounded-full font-bold text-xs">
            <AlertTriangle size={14} />
            <span>ML SERVICE DEGRADED</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Behavioral Authentication Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Candidate: {studentName || report?.student?.name || 'Student'} | Session #{assessmentSessionId?.slice(-6)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold text-center">
              {error}
            </div>
          ) : report ? (
            <>
              {/* Verdict Banner */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Final Authentication Verdict</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      {report.verdict?.status}
                    </span>
                    {getVerdictBadge(report.verdict?.status)}
                  </div>
                  {report.verdict?.reasons?.length > 0 && (
                    <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc list-inside pt-1 space-y-0.5">
                      {report.verdict.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="text-right self-end md:self-auto border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-3 md:pt-0 md:pl-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Final Trust Score</span>
                  <div className="text-3xl font-black text-brand-600 dark:text-brand-400">
                    {report.trust?.final}%
                  </div>
                </div>
              </div>

              {/* Trust Score Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Initial Score</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{report.trust?.initial}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Trust</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{report.trust?.average}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Min Score</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{report.trust?.minimum}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Score</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{report.trust?.maximum}%</p>
                </div>
              </div>

              {/* Trust Trajectory Visualization */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Trust Score Trajectory History
                </h3>
                {report.trust?.history?.length > 0 ? (
                  <div className="flex items-end gap-2 h-24 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2 overflow-x-auto">
                    {report.trust.history.map((score, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-[24px]">
                        <span className="text-[9px] font-bold text-slate-400">{score}%</span>
                        <div 
                          className={`w-full rounded-t-md transition-all ${
                            score >= 75 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ height: `${Math.max(15, (score / 100) * 60)}px` }}
                        ></div>
                        <span className="text-[8px] text-slate-400">#{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No trust history available.</p>
                )}
              </div>

              {/* Security Metrics & Risk Transitions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Security Counter Card */}
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Session Security Counters
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-slate-500">Tab Switches (Blur Events):</span>
                      <span className="font-bold text-slate-900 dark:text-white">{report.security?.tabSwitches}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-slate-500">Paste Events:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{report.security?.pasteEvents}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-slate-500">Behavioral Anomalies:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{report.behaviour?.anomalyCount}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Transitions Timeline */}
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Candidate Risk Timeline
                  </h3>
                  {report.risk?.transitions?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {report.risk.transitions.map((t, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-amber-600 dark:text-amber-400">{t.from} → {t.to}</span>
                            <span className="text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{t.reason} (Score: {t.trustScore}%)</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold text-center">
                      ✓ No risk level escalation events recorded.
                    </div>
                  )}
                </div>

              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
}
