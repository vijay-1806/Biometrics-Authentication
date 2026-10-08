import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Common/Layout';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, KeyRound, Clock3, BookOpen, ArrowRight, X, FileCode } from 'lucide-react';

export default function LiveAssessments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get('/api/courses/live-assessments');
        if (alive) setAssessments(data || []);
      } catch { if (alive) setError('Live assessments could not be loaded. Refresh and try again.'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user?._id]);

  const join = (event) => {
    event.preventDefault();
    if (pin.length !== 6 || !selected) return;
    navigate(`/assignments/${selected._id}/coding?sessionPin=${pin}`);
  };

  return <Layout><div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Assessment center</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Live assessments</h1><p className="mt-1 text-sm text-slate-500">Teacher monitored assessments for your enrolled courses. Regular practice remains in each course.</p></header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    {loading ? <div className="lms-card p-10 text-center text-sm text-slate-500">Loading assessments…</div> : assessments.length ? <div className="grid gap-3">{assessments.map(item => <article key={`${item.kind}:${item._id}`} className="lms-card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex min-w-0 items-start gap-3"><div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><FileCode size={20}/></div><div><p className="text-xs font-semibold text-indigo-600">{item.courseTitle}</p><h2 className="mt-0.5 font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.description}</p><div className="mt-2 flex items-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={13}/>{item.durationMinutes || 60} minutes</span><span className="inline-flex items-center gap-1"><ShieldCheck size={13}/>Behavior verification</span></div></div></div>
      <button onClick={() => { setSelected(item); setPin(''); }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"><KeyRound size={15}/> Enter session PIN</button>
    </article>)}</div> : <div className="lms-card py-14 text-center"><BookOpen className="mx-auto text-slate-300" size={36}/><h2 className="mt-3 font-bold text-slate-800">No live assessments right now</h2><p className="mt-1 text-sm text-slate-500">When a teacher schedules an assessment for an enrolled course, it will appear here.</p><Link to="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">Go to my courses <ArrowRight size={14}/></Link></div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}><form onSubmit={join} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{selected.courseTitle}</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18}/></button></div><p className="mt-3 text-sm text-slate-500">Enter the six digit code your teacher shared for this live session.</p><label className="mt-5 block text-xs font-bold text-slate-600">Session code<input autoFocus inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-2xl tracking-[.45em] outline-none focus:border-indigo-500" placeholder="000000"/></label><button disabled={pin.length !== 6} className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Join monitored assessment</button></form></div>}
  </div></Layout>;
}
