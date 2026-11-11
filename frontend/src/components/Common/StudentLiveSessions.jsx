import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { KeyRound, Clock3, ShieldCheck, FileCode, X, BookOpen } from 'lucide-react';

export default function StudentLiveSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const { data } = await axios.get('/api/courses/live-assessments');
        if (alive) { setSessions(data || []); setError(''); }
      } catch { if (alive) setError('Could not load live sessions.'); }
      finally { if (alive) setLoading(false); }
    };
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => { alive = false; clearInterval(interval); };
  }, []);
  const join = async event => {
    event.preventDefault(); setJoinError(''); setJoining(true);
    try {
      const { data } = await axios.post('/api/courses/live-assessments/join', { pin });
      if (data.assignmentId !== String(selected._id)) {
        setJoinError('This PIN belongs to another assessment. Enter the code for this assessment.');
        return;
      }
      navigate(`/assignments/${data.assignmentId}/coding?sessionPin=${pin}`);
    } catch (err) { setJoinError(err.response?.data?.message || 'Could not join this session.'); }
    finally { setJoining(false); }
  };
  return <>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <div className="lms-card p-10 text-center text-sm text-slate-500">Loading live assessments...</div> : sessions.length ? <div className="space-y-4">{sessions.map(item => <article key={item._id} className="lms-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><FileCode size={22}/></div>
        <div><p className="text-xs font-semibold text-indigo-600">{item.courseTitle}</p><h2 className="mt-1 font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={13}/>{item.durationMinutes || 60} minutes</span><span className="inline-flex items-center gap-1"><ShieldCheck size={13}/>Behavior verification</span><span className={item.sessionStatus === 'active' ? 'text-emerald-700' : 'text-amber-700'}>{item.sessionStatus === 'active' ? 'Live now' : 'Waiting for teacher'}</span></div>
        </div>
      </div>
      <button type="button" onClick={() => { setSelected(item); setPin(''); setJoinError(''); }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"><KeyRound size={16}/>Enter session PIN</button>
    </article>)}</div> : <div className="lms-card py-14 text-center"><BookOpen size={36} className="mx-auto text-slate-300"/><h2 className="mt-3 font-semibold text-slate-800">No live assessments right now</h2><Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-indigo-600">Go to my courses</Link></div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={event => { if (event.target === event.currentTarget && !joining) setSelected(null); }}>
      <form onSubmit={join} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="live-assessment-title">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-indigo-600">{selected.courseTitle}</p><h2 id="live-assessment-title" className="mt-1 text-lg font-bold text-slate-900">{selected.title}</h2></div><button type="button" disabled={joining} onClick={() => setSelected(null)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
        <label className="mt-5 block text-xs font-semibold text-slate-600">Session ID / PIN<input autoFocus value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" className="lms-input mt-2 text-center font-mono text-2xl tracking-widest" /></label>
        {joinError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{joinError}</p>}
        <button type="submit" disabled={joining || pin.length !== 6} className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{joining ? 'Joining...' : 'Join monitored assessment'}</button>
      </form>
    </div>}
  </>;
}
