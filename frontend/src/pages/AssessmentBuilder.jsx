import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, BookOpen, Clock3, ShieldCheck, Save, Plus, FileCode } from 'lucide-react';
import Layout from '../components/Common/Layout';

const emptyTest = () => ({ input: '', expectedOutput: '' });

export default function AssessmentBuilder() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [courseMode, setCourseMode] = useState('existing');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState('create');
  const [assignmentId, setAssignmentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [starterCode, setStarterCode] = useState('');
  const [testCases, setTestCases] = useState([emptyTest()]);
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { axios.get('/api/courses').then(({ data }) => { setCourses(data); if (data[0]) setCourseId(String(data[0]._id)); }).catch(() => setError('Courses could not be loaded.')); }, []);
  useEffect(() => {
    if (!courseId || courseMode !== 'existing') { setAssignments([]); setAssignmentId(''); return; }
    axios.get(`/api/courses/${courseId}`).then(({ data }) => {
      // A live assessment is an assignment that can be scheduled again; each publish
      // creates a new AssessmentSession and PIN for the selected task.
      const items = data.assignments || [];
      setAssignments(items); setAssignmentId(items[0]?._id || '');
      setAssignmentMode(items.length ? 'existing' : 'create');
    }).catch(() => setError('Course coding assignments could not be loaded.'));
  }, [courseId, courseMode]);

  const publish = async (event) => {
    event.preventDefault(); setError('');
    // Reserve the browser tab during the click so popup blockers allow the dedicated monitor.
    const monitorTab = window.open('about:blank', '_blank');
    setSaving(true);
    try {
      let activeCourseId = courseId;
      if (courseMode === 'new') {
        const response = await axios.post('/api/courses', { title: courseTitle.trim(), description: courseDescription.trim() });
        activeCourseId = response.data._id;
        setCourses(current => [...current, response.data]);
      }
      let activeAssignmentId = assignmentId;
      if (assignmentMode === 'create' || courseMode === 'new') {
        const response = await axios.post('/api/assignments', {
          course: activeCourseId, title: title.trim(), description: description.trim(),
          language, starterCode, durationMinutes: Number(duration),
          testCases: testCases.filter(item => item.input.trim() || item.expectedOutput.trim())
        });
        activeAssignmentId = response.data._id;
      }
      if (!activeAssignmentId) throw new Error('Choose or create a coding assessment.');
      await axios.patch(`/api/assignments/${activeAssignmentId}/live`, { isLiveAssessment: true, durationMinutes: Number(duration) });
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const params = new URLSearchParams({ pin, examId: activeAssignmentId, courseId: activeCourseId, autostart: '1' });
      const monitorUrl = `/admin/behavior?${params.toString()}`;
      if (monitorTab) monitorTab.location.replace(monitorUrl);
      else window.location.assign(monitorUrl);
    } catch (err) {
      monitorTab?.close();
      setError(err.response?.data?.message || err.message || 'Could not publish the live assessment.');
    } finally { setSaving(false); }
  };

  return <Layout><div className="assessment-builder">
    <Link to="/dashboard" className="builder-back"><ArrowLeft size={16} /> Teacher dashboard</Link>
    <div className="builder-heading"><div><span className="builder-eyebrow">LIVE ASSESSMENTS</span><h1>Create a coding assessment</h1><p>Choose a course or create one, prepare the coding task, then publish and start its monitored room.</p></div><div className="builder-protection"><ShieldCheck size={18} /><span>Behavioral monitoring ready</span></div></div>
    {error && <div className="builder-error" role="alert">{error}</div>}
    <form onSubmit={publish} className="builder-form">
      <section className="builder-card"><h2><BookOpen size={18} /> Course</h2>
        <div className="flex gap-2 mb-4"><button type="button" onClick={() => setCourseMode('existing')} className={`rounded-lg px-3 py-2 text-xs font-bold ${courseMode === 'existing' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600'}`}>Use a course</button><button type="button" onClick={() => { setCourseMode('new'); setAssignmentMode('create'); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${courseMode === 'new' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600'}`}><Plus size={13} className="inline mr-1"/>Create a course</button></div>
        {courseMode === 'new' ? <div className="builder-grid"><label>Course name<input required value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="Course title" /></label><label>Description<input required value={courseDescription} onChange={e => setCourseDescription(e.target.value)} placeholder="What students will learn" /></label></div> : <label>Course<select required value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">Select a course</option>{courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}</select></label>}
      </section>
      {courseMode === 'existing' && assignments.length > 0 && <section className="builder-card"><h2><FileCode size={18}/> Coding task</h2><div className="flex gap-2 mb-4"><button type="button" onClick={() => setAssignmentMode('existing')} className={`rounded-lg px-3 py-2 text-xs font-bold ${assignmentMode === 'existing' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600'}`}>Use existing task</button><button type="button" onClick={() => setAssignmentMode('create')} className={`rounded-lg px-3 py-2 text-xs font-bold ${assignmentMode === 'create' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600'}`}><Plus size={13} className="inline mr-1"/>Create assessment task</button></div>{assignmentMode === 'existing' && <label>Practice coding task<select value={assignmentId} onChange={e => setAssignmentId(e.target.value)}>{assignments.map(item => <option value={item._id} key={item._id}>{item.title}</option>)}</select></label>}</section>}
      {(courseMode === 'new' || !assignments.length || assignmentMode === 'create') && <section className="builder-card"><h2><FileCode size={18}/> Coding assessment</h2><div className="builder-grid"><label>Assessment title<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Arrays and loops"/></label><label>Language<select value={language} onChange={e => setLanguage(e.target.value)}><option value="javascript">JavaScript</option><option value="python">Python</option></select></label></div><label>Instructions<textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain the problem and expected solution"/></label><label>Starter code<textarea rows={5} value={starterCode} onChange={e => setStarterCode(e.target.value)} placeholder="Optional code shown to students"/></label><div className="builder-section-heading"><div><h2>Sample tests</h2><p>Private test cases used to score student submissions.</p></div></div>{testCases.map((item, index) => <div className="builder-grid" key={index}><label>Input<textarea rows={2} value={item.input} onChange={e => setTestCases(rows => rows.map((row, i) => i === index ? {...row, input:e.target.value} : row))}/></label><label>Expected output<textarea required rows={2} value={item.expectedOutput} onChange={e => setTestCases(rows => rows.map((row, i) => i === index ? {...row, expectedOutput:e.target.value} : row))}/></label></div>)}<button type="button" className="builder-add-question" onClick={() => setTestCases(rows => [...rows, emptyTest()])}><Plus size={15}/>Add sample test</button></section>}
      <section className="builder-card"><label>Time limit (minutes)<div className="builder-input-icon"><Clock3 size={16}/><input type="number" min="1" max="240" required value={duration} onChange={e => setDuration(e.target.value)} /></div></label></section>
      <div className="builder-footer"><p>Publishing opens a dedicated monitoring tab and starts the live room. Keep this page for course setup and results.</p><button type="submit" disabled={saving || (courseMode === 'existing' && !courseId) || (courseMode === 'existing' && assignmentMode === 'existing' && !assignmentId)}>{saving ? 'Publishing…' : <><Save size={16}/> Publish and start live session</>}</button></div>
    </form>
  </div></Layout>;
}
