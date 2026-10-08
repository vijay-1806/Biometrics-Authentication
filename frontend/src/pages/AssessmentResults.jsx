import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Common/Layout';
import { BarChart3, Flag, ShieldCheck, Clock3, RefreshCw } from 'lucide-react';

export default function AssessmentResults() {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get('/api/behavior/assessment-history'); setSessions(data || []); setSelectedId(current => data.some(s => String(s._id) === current) ? current : String(data[0]?._id || '')); }
    catch (e) { setError(e.response?.data?.message || 'Could not load assessment results.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const active = sessions.find(s => String(s._id) === selectedId);
  const trustScores = active?.candidates.filter(candidate => candidate.trustScore !== null) || [];
  const averageTrust = trustScores.length ? Math.round(trustScores.reduce((sum, candidate) => sum + candidate.trustScore, 0) / trustScores.length) : null;
  const flag = async (candidate) => {
    setBusyId(candidate.studentId);
    try {
      await axios.post(`/api/behavior/assessment-history/${active._id}/candidates/${candidate.studentId}/flag`, { note: 'Teacher requested a trust review.' });
      await load();
    } catch (e) { setError(e.response?.data?.message || 'Could not flag this student.'); }
    finally { setBusyId(''); }
  };
  return <Layout><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Teacher workspace</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Assessment results</h1><p className="mt-1 text-sm text-slate-500">Review exam outcomes beside behavioral trust and recorded flags.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><RefreshCw size={15}/>Refresh</button></header>
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {loading ? <div className="lms-card p-8 text-center text-sm text-slate-500">Loading results…</div> : !sessions.length ? <div className="lms-card p-12 text-center"><BarChart3 className="mx-auto text-slate-300" size={34}/><h2 className="mt-3 font-bold text-slate-800">No assessment sessions yet</h2><p className="mt-1 text-sm text-slate-500">Published and completed live sessions will appear here.</p></div> : <>
      <div className="lms-card flex flex-wrap items-center justify-between gap-4 p-4"><label className="min-w-[240px] flex-1 text-xs font-bold text-slate-500">SESSION<select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="lms-input mt-1">{sessions.map(s => <option value={s._id} key={s._id}>{s.assessmentTitle} · {s.courseTitle} · {new Date(s.createdAt).toLocaleDateString()}</option>)}</select></label>{active && <div className="flex items-center gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={14}/>{active.status}</span><span>{active.candidates.length} students</span><span className="rounded-full bg-slate-100 px-2 py-1 font-bold">PIN {active.pin}</span></div>}</div>
      {active && <><div className="grid gap-3 sm:grid-cols-3"><div className="lms-card p-4"><p className="text-xs font-bold uppercase text-slate-400">Assessment</p><p className="mt-1 font-bold text-slate-800">{active.assessmentTitle}</p><p className="text-xs text-slate-500">{active.courseTitle}</p></div><div className="lms-card p-4"><p className="text-xs font-bold uppercase text-slate-400">Average trust</p><p className="mt-1 text-2xl font-extrabold text-indigo-700">{averageTrust === null ? '—' : averageTrust}{averageTrust !== null && <small className="ml-1 text-xs">/100</small>}</p></div><div className="lms-card p-4"><p className="text-xs font-bold uppercase text-slate-400">Needs review</p><p className="mt-1 text-2xl font-extrabold text-amber-600">{active.candidates.filter(c => c.manuallyFlagged || c.riskLevel === 'high').length}</p></div></div>
      <div className="lms-card overflow-hidden"><div className="border-b border-slate-100 p-4"><h2 className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={17} className="text-indigo-600"/>Student results and trust review</h2><p className="mt-1 text-xs text-slate-500">Trust score is a behavioral signal for teacher review, not a grade or proof of misconduct.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Student</th><th className="p-3">Exam result</th><th className="p-3">Trust score</th><th className="p-3">Signals</th><th className="p-3">Review</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{active.candidates.map(candidate => <tr key={candidate.studentId}><td className="p-3"><p className="font-bold text-slate-800">{candidate.name}</p><p className="text-xs text-slate-500">{candidate.email}</p></td><td className="p-3 font-semibold text-slate-700">{candidate.examScore}</td><td className="p-3"><span className={`font-extrabold ${candidate.trustScore === null ? 'text-slate-500' : candidate.trustScore < 50 ? 'text-rose-600' : candidate.trustScore < 75 ? 'text-amber-600' : 'text-emerald-600'}`}>{candidate.trustScore === null ? '—' : candidate.trustScore}{candidate.trustScore === null ? '' : '/100'}</span><span className="ml-2 text-xs capitalize text-slate-500">{candidate.riskLevel === 'unscored' ? 'not enough data' : candidate.riskLevel}</span></td><td className="p-3 text-xs text-slate-600">{candidate.tabSwitches} tab switches · {candidate.pasteEvents} paste events · {candidate.windowsScored} scored windows</td><td className="p-3">{candidate.manuallyFlagged ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Flagged for review</span> : <span className="text-xs text-slate-400">No teacher flag</span>}</td><td className="p-3"><button disabled={candidate.manuallyFlagged || busyId === candidate.studentId} onClick={() => flag(candidate)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-700 disabled:opacity-40"><Flag size={13}/>{candidate.manuallyFlagged ? 'Flagged' : busyId === candidate.studentId ? 'Saving…' : 'Flag review'}</button></td></tr>)}</tbody></table></div></div></>}
    </>}
  </div></Layout>;
}
