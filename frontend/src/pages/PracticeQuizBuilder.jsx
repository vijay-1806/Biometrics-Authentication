import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Common/Layout';
import { ArrowLeft, BookOpen, Plus, Trash2, Save } from 'lucide-react';

const emptyQuestion = () => ({ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 });
export default function PracticeQuizBuilder() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]); const [course, setCourse] = useState('');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [questions, setQuestions] = useState([emptyQuestion()]);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { axios.get('/api/courses').then(({ data }) => { setCourses(data); if (data[0]) setCourse(data[0]._id); }).catch(() => setError('Courses could not be loaded.')); }, []);
  const update = (qi, key, value) => setQuestions(items => items.map((q, i) => i === qi ? { ...q, [key]: value } : q));
  const updateOption = (qi, oi, value) => setQuestions(items => items.map((q, i) => i === qi ? { ...q, options: q.options.map((option, j) => j === oi ? value : option) } : q));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const { data } = await axios.post('/api/quizzes', { course, title: title.trim(), description: description.trim(), durationMinutes: 30, isExam: false, questions: questions.map(q => ({ ...q, questionText: q.questionText.trim(), options: q.options.map(o => o.trim()), correctAnswerIndex: Number(q.correctAnswerIndex) })) });
      navigate(`/courses/${data.course}`);
    } catch (e) { setError(e.response?.data?.message || 'Could not publish this practice quiz.'); }
    finally { setSaving(false); }
  };
  return <Layout><div className="assessment-builder"><Link to="/dashboard" className="builder-back"><ArrowLeft size={16}/> Teaching overview</Link><div className="builder-heading"><div><span className="builder-eyebrow">COURSE PRACTICE</span><h1>Create a practice quiz</h1><p>Practice quizzes are available inside the course and do not open a monitored exam room.</p></div></div>{error && <div className="builder-error" role="alert">{error}</div>}<form onSubmit={submit} className="builder-form"><section className="builder-card"><h2><BookOpen size={18}/>Practice quiz details</h2><label>Course<select required value={course} onChange={e => setCourse(e.target.value)}><option value="">Select a course</option>{courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}</select></label><label>Quiz title<input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Topic review"/></label><label>Instructions<textarea required rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short guidance for students"/></label></section><section className="builder-card"><div className="builder-section-heading"><div><h2>Questions</h2><p>Students can retry practice quizzes and review their score.</p></div><span>{questions.length} items</span></div><div className="builder-question-list">{questions.map((q, qi) => <article key={qi} className="builder-question"><div className="builder-question-title"><strong>Question {qi + 1}</strong><button type="button" disabled={questions.length === 1} onClick={() => setQuestions(items => items.filter((_, i) => i !== qi))} aria-label="Remove question"><Trash2 size={15}/></button></div><label>Prompt<textarea required rows={2} value={q.questionText} onChange={e => update(qi, 'questionText', e.target.value)} placeholder="Write a practice question"/></label><div className="builder-options"><span>Answer options · choose the correct answer</span>{q.options.map((option, oi) => <label key={oi} className={Number(q.correctAnswerIndex) === oi ? 'is-answer' : ''}><input type="radio" name={`answer-${qi}`} checked={Number(q.correctAnswerIndex) === oi} onChange={() => update(qi, 'correctAnswerIndex', oi)}/><input required value={option} onChange={e => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`}/></label>)}</div></article>)}</div><button type="button" className="builder-add-question" onClick={() => setQuestions(items => [...items, emptyQuestion()])}><Plus size={15}/>Add question</button></section><div className="builder-footer"><p>To turn published course material into a monitored event, use <strong>Schedule live assessment</strong>.</p><button disabled={saving || !courses.length}>{saving ? 'Publishing…' : <><Save size={16}/> Publish practice quiz</>}</button></div></form></div></Layout>;
}
