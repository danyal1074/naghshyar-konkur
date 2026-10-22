import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Avatar, Badge, Button, ChipToggle, Empty, ErrorBox, Field, HBar, Icon, Loading, Modal, PageHead, Seg, Tabs, useConfirm, useToast } from '../ui';
import { PracticeCard } from '../components';
import { DIFFICULTY, useAsync, useSyllabus } from '../lib/hooks';
import { addDays, faNum, fmtDateISO, toISO } from '../lib/dates';

/* ═══════════════ فهرست آزمون‌ها ═══════════════ */
export function CExams() {
  const { data, loading, error, reload } = useAsync(() => api.listExams(), []);
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <div className="stack-lg">
      <PageHead title="آزمون‌ها" sub="آزمون‌هایی که ساخته‌ای و نتیجه‌ی هرکدام."
        actions={<Link className="btn btn-primary" to="/c/exams/new"><Icon name="plus" size={18} />ساخت آزمون</Link>} />
      {!data.length ? (
        <Empty icon="exam" title="هنوز آزمونی نساخته‌ای" text="در سه مرحله آزمون می‌سازی: مبحث، سؤال‌ها، دانش‌آموزان."
          action={<Link className="btn btn-primary" to="/c/exams/new">ساخت اولین آزمون</Link>} />
      ) : (
        <div className="list">
          {data.map((e) => (
            <Link key={e.id} to={`/c/exams/${e.id}`} className="list-row">
              <div className="grow">
                <b>{e.title}</b>
                <small className="muted">{fmtDateISO(e.createdAt)} · {faNum(e.questionCount)} سؤال · {faNum(e.durationMin)} دقیقه</small>
              </div>
              <div className="score-col"><small>پاسخ‌داده</small><b>{faNum(e.submitted)} از {faNum(e.sent)}</b></div>
              <div className="score-col"><small>میانگین</small><b>{e.avg === null ? '—' : `${faNum(e.avg)}٪`}</b></div>
              <Icon name="chevL" size={18} className="row-arrow" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ نتایج یک آزمون ═══════════════ */
export function ExamDetail() {
  const { id } = useParams();
  const { topic } = useSyllabus();
  const { data, error, reload } = useAsync(() => api.listExamResults(id), [id]);
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const { exam, rows, questionStats } = data;
  const done = rows.filter((r) => r.result);
  const avg = done.length ? Math.round(done.reduce((a, r) => a + r.result.percent, 0) / done.length) : null;
  const hardest = [...questionStats].filter((q) => q.correctRate !== null).sort((a, b) => a.correctRate - b.correctRate).slice(0, 3);
  return (
    <div className="stack-lg">
      <PageHead title={exam.title}
        back={<Link to="/c/exams" className="link back"><Icon name="prev" size={16} />همه‌ی آزمون‌ها</Link>}
        sub={`${exam.topicIds.map((t) => topic(t)?.name).filter(Boolean).join('، ')} · ${faNum(exam.questions.length)} سؤال`} />
      <div className="statstrip">
        <div><small>فرستاده‌شده</small><b>{faNum(rows.length)} نفر</b></div>
        <div><small>پاسخ داده‌اند</small><b>{faNum(done.length)} نفر</b></div>
        <div><small>میانگین نمره</small><b>{avg === null ? '—' : `${faNum(avg)}٪`}</b></div>
        <div><small>مهلت</small><b>{exam.deadline ? fmtDateISO(exam.deadline) : 'ندارد'}</b></div>
      </div>

      <section className="block">
        <h2>نتیجه‌ی دانش‌آموزان</h2>
        <div className="list flat">
          {rows.map(({ student, result }) => (
            <div key={student.id} className="list-row">
              <Avatar user={student} size={38} />
              <div className="grow"><b>{student.name}</b></div>
              {result ? (
                <>
                  <small className="muted">{faNum(result.correct)} درست · {faNum(result.wrong)} غلط · {faNum(result.blank)} نزده</small>
                  <Badge tone={result.percent >= 70 ? 'good' : result.percent >= 40 ? 'warn' : 'bad'}>{faNum(result.percent)}٪</Badge>
                  <Link className="btn btn-soft btn-sm" to={`/c/exams/${id}/result/${student.id}`}>جزئیات</Link>
                </>
              ) : <Badge icon="clock">هنوز پاسخ نداده</Badge>}
            </div>
          ))}
        </div>
      </section>

      {hardest.length > 0 && (
        <section className="block">
          <h2>سخت‌ترین سؤال‌ها</h2>
          <p className="muted sm">سؤال‌هایی که کمترین درصد پاسخ درست را داشتند؛ برای مرور کلاسی یا برنامه‌ی هفته‌ی بعد مفیدند.</p>
          <ul className="topic-list">
            {hardest.map((q) => (
              <li key={q.questionId}>
                <div className="topic-head"><b>{q.text}</b><span className="bad">{faNum(q.correctRate)}٪ درست</span></div>
                <HBar value={q.correctRate} warn />
                <small className="muted">{topic(q.topicId)?.name}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ═══════════════ آزمون‌ساز (سه مرحله) ═══════════════ */
export function ExamBuilder() {
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const preStudent = params.get('student');
  const { subjects, topic } = useSyllabus();
  const students = useAsync(() => api.listStudents(), []);
  const [step, setStep] = useState(1);
  const [subjectId, setSubjectId] = useState('art');
  const [topicIds, setTopicIds] = useState([]);
  const [picked, setPicked] = useState([]); // bank question ids
  const [drafts, setDrafts] = useState([]); // AI drafts (accepted)
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [meta, setMeta] = useState({ title: '', durationMin: 10, deadline: toISO(addDays(new Date(), 7)), noDeadline: false });
  const [studentIds, setStudentIds] = useState(preStudent ? [preStudent] : []);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const bank = useAsync(() => api.listQuestions({}), []);
  const bankList = useMemo(() => (bank.data || []).filter((q) => topicIds.includes(q.topicId)), [bank.data, topicIds]);
  const subj = subjects.find((s) => s.id === subjectId);
  const total = picked.length + drafts.length;

  const toggleTopic = (id) => setTopicIds((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const selectAllBank = () => setPicked((p) => [...new Set([...p, ...bankList.map((q) => q.id)])]);

  const generate = async () => {
    setAiLoading(true);
    try {
      const out = await api.aiGenerateQuestions({ topicIds, count: aiCount, difficulty: 'mixed' });
      setDrafts((d) => [...d, ...out]);
      toast(`${faNum(out.length)} پیش‌نویس ساخته شد؛ لطفاً مرورشان کن.`);
    } catch (e) { toast(e.message, 'err'); }
    setAiLoading(false);
  };

  const sendExam = async () => {
    setBusy(true);
    try {
      const { questionIds, newQuestions } = { questionIds: picked, newQuestions: drafts.map(({ id, ...q }) => q) };
      await api.createExam({
        title: meta.title, topicIds, questionIds, newQuestions, studentIds, durationMin: Number(meta.durationMin),
        deadline: meta.noDeadline ? null : meta.deadline,
      });
      toast(`آزمون برای ${faNum(studentIds.length)} نفر فرستاده شد.`);
      nav('/c/exams');
    } catch (e) { toast(e.message, 'err'); setBusy(false); }
  };

  useEffect(() => {
    if (step === 2 && !meta.title && topicIds.length) {
      setMeta((m) => ({ ...m, title: `آزمون ${topicIds.slice(0, 2).map((t) => topic(t)?.name).join(' و ')}` }));
    }
  }, [step]); // eslint-disable-line

  const stepper = ['مبحث و سؤال‌ها', 'تنظیمات', 'ارسال'];
  const canNext = step === 1 ? total > 0 : step === 2 ? meta.title.trim() && Number(meta.durationMin) > 0 : studentIds.length > 0;

  return (
    <div className="stack-lg builder">
      <PageHead title="ساخت آزمون" back={<Link to="/c/exams" className="link back"><Icon name="prev" size={16} />آزمون‌ها</Link>} />
      <ol className="stepper">
        {stepper.map((s, i) => (
          <li key={s} className={step === i + 1 ? 'on' : step > i + 1 ? 'done' : ''}>
            <span>{step > i + 1 ? <Icon name="check" size={16} stroke={3} /> : faNum(i + 1)}</span>{s}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="stack-lg">
          <section className="block">
            <h2>۱. مبحث‌های آزمون را انتخاب کن</h2>
            <div className="chip-row">
              {subjects.filter((s) => s.id !== 'practical').map((s) => (
                <button key={s.id} className={`chip-toggle tone ${subjectId === s.id ? 'on' : ''}`} style={subjectId === s.id ? { background: s.color, borderColor: s.color } : { '--c': s.color }} onClick={() => setSubjectId(s.id)}>{s.name}</button>
              ))}
            </div>
            <div className="chip-row topics">
              {subj?.topics.map((t) => <ChipToggle key={t.id} on={topicIds.includes(t.id)} color={subj.color} onClick={() => toggleTopic(t.id)}>{t.name}</ChipToggle>)}
            </div>
            {topicIds.length > 0 && <p className="muted sm">انتخاب‌شده: {topicIds.map((t) => topic(t)?.name).join('، ')}</p>}
          </section>

          {topicIds.length > 0 && (
            <>
              <section className="block">
                <div className="row between wrap">
                  <h2>۲. سؤال‌ها را از بانک انتخاب کن</h2>
                  {bankList.length > 0 && <Button variant="soft" size="sm" onClick={selectAllBank}>انتخاب همه‌ی {faNum(bankList.length)} سؤال</Button>}
                </div>
                {bankList.length === 0 ? <p className="muted">برای این مبحث‌ها سؤالی در بانک نیست. از پیشنهاد هوش مصنوعی استفاده کن یا در «بانک سؤال» اضافه کن.</p> : (
                  <div className="qpick">
                    {bankList.map((q) => (
                      <label key={q.id} className={`qpick-row ${picked.includes(q.id) ? 'on' : ''}`}>
                        <input type="checkbox" checked={picked.includes(q.id)} onChange={() => togglePick(q.id)} />
                        <span className="grow">{q.text}</span>
                        <small className="muted">{topic(q.topicId)?.name}</small>
                        <Badge tone={q.difficulty === 'easy' ? 'good' : q.difficulty === 'hard' ? 'bad' : 'neutral'}>{DIFFICULTY[q.difficulty]}</Badge>
                      </label>
                    ))}
                  </div>
                )}
              </section>

              <section className="block ai-block">
                <h2><Icon name="sparkle" size={20} />پیشنهاد سؤال با هوش مصنوعی</h2>
                <p className="muted sm">پیش‌نویس سؤال‌ها ساخته می‌شود و تو آن‌ها را مرور و ویرایش می‌کنی؛ تا تأیید نکنی به دانش‌آموز نمی‌رسد.</p>
                <div className="row wrap end">
                  <Field label="تعداد"><select className="select" value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}>{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{faNum(n)} سؤال</option>)}</select></Field>
                  <Button icon="sparkle" loading={aiLoading} onClick={generate}>ساخت پیش‌نویس</Button>
                </div>
                {drafts.length > 0 && (
                  <div className="drafts">
                    {drafts.map((d, i) => (
                      <article key={d.id} className="draft">
                        <header><Badge tone={d.needsEdit ? 'warn' : 'info'} icon="sparkle">{d.needsEdit ? 'نیاز به ویرایش' : 'پیش‌نویس'}</Badge><small className="muted">{topic(d.topicId)?.name}</small></header>
                        <p>{d.text}</p>
                        <ol className="opts-mini">{d.options.map((o, oi) => <li key={oi} className={oi === d.answer ? 'right' : ''}>{o}</li>)}</ol>
                        <footer>
                          <Button size="sm" variant="soft" icon="edit" onClick={() => setEditing({ index: i, q: d })}>ویرایش</Button>
                          <Button size="sm" variant="ghost" icon="trash" onClick={() => setDrafts((x) => x.filter((_, k) => k !== i))}>حذف</Button>
                        </footer>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <section className="block stack">
          <h2>تنظیمات آزمون</h2>
          <Field label="عنوان آزمون"><input className="input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="مدت آزمون (دقیقه)" hint={`پیشنهاد: حدود ${faNum(Math.max(5, Math.round(total * 0.8)))} دقیقه برای ${faNum(total)} سؤال`}>
              <input className="input ltr" type="number" min="1" value={meta.durationMin} onChange={(e) => setMeta({ ...meta, durationMin: e.target.value })} />
            </Field>
            <Field label="مهلت شرکت">
              <input className="input ltr" type="date" disabled={meta.noDeadline} value={meta.deadline} onChange={(e) => setMeta({ ...meta, deadline: e.target.value })} />
              <label className="check-inline"><input type="checkbox" checked={meta.noDeadline} onChange={(e) => setMeta({ ...meta, noDeadline: e.target.checked })} /> بدون مهلت</label>
            </Field>
          </div>
          <div className="callout soft"><Icon name="exam" size={20} /><span>در این آزمون <b>{faNum(total)}</b> سؤال هست ({faNum(picked.length)} از بانک، {faNum(drafts.length)} پیشنهادی).</span></div>
        </section>
      )}

      {step === 3 && (
        <section className="block stack">
          <div className="row between wrap"><h2>برای چه کسانی بفرستم؟</h2>
            <Button variant="soft" size="sm" onClick={() => setStudentIds(studentIds.length === (students.data?.items.length || 0) ? [] : students.data.items.map((s) => s.id))}>
              {studentIds.length === students.data?.items.length ? 'برداشتن همه' : 'انتخاب همه'}
            </Button></div>
          {!students.data ? <Loading /> : (
            <div className="qpick">
              {students.data.items.map((s) => (
                <label key={s.id} className={`qpick-row ${studentIds.includes(s.id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={studentIds.includes(s.id)} onChange={() => setStudentIds((x) => (x.includes(s.id) ? x.filter((i) => i !== s.id) : [...x, s.id]))} />
                  <Avatar user={s} size={32} />
                  <span className="grow">{s.name}</span>
                  <small className="muted">{s.field}</small>
                </label>
              ))}
            </div>
          )}
          <div className="callout soft"><Icon name="send" size={20} /><span><b>{meta.title}</b> · {faNum(total)} سؤال · {faNum(meta.durationMin)} دقیقه · برای <b>{faNum(studentIds.length)}</b> نفر</span></div>
        </section>
      )}

      <div className="builder-foot">
        {step > 1 ? <Button variant="ghost" icon="prev" onClick={() => setStep(step - 1)}>قبلی</Button> : <span />}
        <span className="muted sm">{step === 1 && total > 0 ? `${faNum(total)} سؤال انتخاب شده` : ''}</span>
        {step < 3 ? <Button iconEnd="next" disabled={!canNext} onClick={() => setStep(step + 1)}>ادامه</Button> : <Button icon="send" loading={busy} disabled={!canNext} onClick={sendExam}>ارسال آزمون</Button>}
      </div>

      <QuestionEditor open={!!editing} question={editing?.q} onClose={() => setEditing(null)}
        saveLabel="ذخیره‌ی تغییر" onSave={async (q) => { setDrafts((d) => d.map((x, i) => (i === editing.index ? { ...q, needsEdit: false } : x))); setEditing(null); }} />
    </div>
  );
}

/* ═══════════════ ویرایشگر سؤال ═══════════════ */
const BLANK = { text: '', options: ['', '', '', ''], answer: 0, explanation: '', difficulty: 'medium', topicId: 'iran_art' };

export function QuestionEditor({ open, question, onClose, onSave, saveLabel = 'ذخیره', defaultTopic }) {
  const { subjects } = useSyllabus();
  const [q, setQ] = useState(BLANK);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setQ(question ? { ...question, options: [...question.options] } : { ...BLANK, topicId: defaultTopic || 'iran_art' }); setErr(''); }
  }, [open, question, defaultTopic]);
  const theory = subjects.filter((s) => s.id !== 'practical');
  const setOpt = (i, v) => setQ((x) => ({ ...x, options: x.options.map((o, k) => (k === i ? v : o)) }));
  const save = async () => {
    setBusy(true); setErr('');
    try { await onSave(q); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} title={question?.id ? 'ویرایش سؤال' : 'سؤال جدید'} wide
      footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button loading={busy} onClick={save}>{saveLabel}</Button></>}>
      <div className="stack">
        <Field label="متن سؤال"><textarea className="textarea" rows={3} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} autoFocus /></Field>
        <fieldset className="opts-edit">
          <legend className="field-label">گزینه‌ها؛ گزینه‌ی درست را با دایره علامت بزن</legend>
          {q.options.map((o, i) => (
            <div className="opt-edit" key={i}>
              <input type="radio" name="correct" checked={q.answer === i} onChange={() => setQ({ ...q, answer: i })} aria-label={`گزینه‌ی ${i + 1} درست است`} />
              <input className="input" value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`گزینه‌ی ${faNum(i + 1)}`} />
            </div>
          ))}
        </fieldset>
        <div className="grid2">
          <Field label="مبحث">
            <select className="select" value={q.topicId} onChange={(e) => setQ({ ...q, topicId: e.target.value })}>
              {theory.map((s) => <optgroup key={s.id} label={s.name}>{s.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>)}
            </select>
          </Field>
          <Field label="سختی">
            <select className="select" value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value })}>
              {['easy', 'medium', 'hard'].map((d) => <option key={d} value={d}>{DIFFICULTY[d]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="توضیح پاسخ (بعد از آزمون به دانش‌آموز نشان داده می‌شود)"><textarea className="textarea" rows={2} value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })} /></Field>
        {err && <p className="field-error">{err}</p>}
      </div>
    </Modal>
  );
}

/* ═══════════════ بانک سؤال ═══════════════ */
export function Questions() {
  const toast = useToast();
  const confirm = useConfirm();
  const { subjects, topic } = useSyllabus();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useAsync(() => api.listQuestions({ subjectId, topicId, q }), [subjectId, topicId, q]);
  const [editing, setEditing] = useState(null);
  const subj = subjects.find((s) => s.id === subjectId);

  const save = async (qq) => {
    await api.saveQuestion(qq);
    toast('سؤال ذخیره شد.');
    setEditing(null);
    reload();
  };
  const del = async (item) => {
    const ok = await confirm({ title: 'حذف سؤال؟', text: 'این سؤال از بانک حذف می‌شود. آزمون‌هایی که قبلاً فرستاده‌ای تغییری نمی‌کنند.', confirmLabel: 'حذف', danger: true });
    if (ok) { await api.deleteQuestion(item.id); toast('سؤال حذف شد.'); reload(); }
  };

  return (
    <div className="stack-lg">
      <PageHead title="بانک سؤال" sub="سؤال‌های تو؛ در ساخت آزمون از همین‌جا انتخاب می‌شوند."
        actions={<Button icon="plus" onClick={() => setEditing({})}>سؤال جدید</Button>} />
      <div className="toolbar">
        <select className="select" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }} aria-label="درس">
          <option value="">همه‌ی درس‌ها</option>
          {subjects.filter((s) => s.id !== 'practical').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!subj} aria-label="مبحث">
          <option value="">همه‌ی مبحث‌ها</option>
          {subj?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="search"><Icon name="search" size={18} /><input className="input" placeholder="جستجو در متن سؤال" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" /></div>
      </div>
      {error && !data ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : !data.length ? (
        <Empty icon="bank" title="سؤالی پیدا نشد" text="فیلترها را تغییر بده یا سؤال جدید اضافه کن." action={<Button icon="plus" onClick={() => setEditing({})}>سؤال جدید</Button>} />
      ) : (
        <>
          <p className="muted sm">{faNum(data.length)} سؤال</p>
          <div className="list">
            {data.map((item) => (
              <article key={item.id} className="list-row qrow">
                <div className="grow">
                  <b className="qtext">{item.text}</b>
                  <div className="meta-row"><span>{topic(item.topicId)?.name}</span><Badge tone={item.difficulty === 'easy' ? 'good' : item.difficulty === 'hard' ? 'bad' : 'neutral'}>{DIFFICULTY[item.difficulty]}</Badge>{item.source === 'ai' && <Badge tone="info" icon="sparkle">هوش مصنوعی</Badge>}</div>
                </div>
                <Button variant="ghost" icon="edit" onClick={() => setEditing(item)} aria-label="ویرایش" />
                <Button variant="ghost" icon="trash" onClick={() => del(item)} aria-label="حذف" />
              </article>
            ))}
          </div>
        </>
      )}
      <QuestionEditor open={!!editing} question={editing?.id ? editing : null} defaultTopic={topicId || undefined} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

/* ═══════════════ بازبینی کار عملی ═══════════════ */
export function PracticeReviewModal({ item, onClose, onDone }) {
  const toast = useToast();
  const [fb, setFb] = useState('');
  const [score, setScore] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (item) { setFb(item.feedback || ''); setScore(item.score ?? ''); setErr(''); } }, [item]);
  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.reviewPractice(item.id, { feedback: fb, score });
      toast('بازخورد برای دانش‌آموز فرستاده شد.');
      onDone?.(); onClose();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const quick = ['نسبت‌ها را بهتر رعایت کن.', 'سایه‌روشن قوی‌تر شود.', 'ترکیب‌بندی متعادل است.', 'خطوط را سبک‌تر شروع کن.', 'زمان‌بندی کار را رعایت کن.'];
  return (
    <Modal open={!!item} onClose={onClose} title={item?.title} wide
      footer={<><Button variant="ghost" onClick={onClose}>بستن</Button><Button loading={busy} onClick={save}>{item?.status === 'reviewed' ? 'به‌روزرسانی بازخورد' : 'ثبت و ارسال بازخورد'}</Button></>}>
      {item && (
        <div className="review-grid">
          <img className="work-img" src={item.image} alt={item.title} />
          <div className="stack">
            <p className="muted">{item.student?.name}{item.note ? ` · ${item.note}` : ''}</p>
            <Field label="بازخورد" error={err}><textarea className="textarea" rows={5} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="نقطه‌های قوت و چیزهایی که باید تمرین کند…" /></Field>
            <div className="chip-row">{quick.map((t) => <button key={t} type="button" className="chip-toggle" onClick={() => setFb((x) => (x ? `${x} ${t}` : t))}>{t}</button>)}</div>
            <Field label="نمره از ۲۰ (اختیاری)"><input className="input ltr narrow" type="number" min="0" max="20" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} /></Field>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function PracticeReview() {
  const { data, loading, error, reload } = useAsync(() => api.listPractice(), []);
  const [tab, setTab] = useState('pending');
  const [open, setOpen] = useState(null);
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const pending = data.filter((p) => p.status === 'pending');
  const reviewed = data.filter((p) => p.status === 'reviewed');
  const list = tab === 'pending' ? pending : reviewed;
  return (
    <div className="stack-lg">
      <PageHead title="کارهای عملی" sub="طراحی‌ها و نقاشی‌هایی که دانش‌آموزان فرستاده‌اند." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'pending', label: 'منتظر بازبینی', count: pending.length }, { value: 'reviewed', label: 'بازبینی‌شده' }]} />
      {!list.length ? <Empty icon="brush" title={tab === 'pending' ? 'همه‌ی کارها بازبینی شده‌اند' : 'هنوز کاری بازبینی نکرده‌ای'} text={tab === 'pending' ? 'کار تازه که برسد، اعلان می‌گیری.' : undefined} /> : (
        <div className="pgrid">{list.map((p) => <PracticeCard key={p.id} item={p} showStudent onOpen={setOpen} />)}</div>
      )}
      <PracticeReviewModal item={open} onClose={() => setOpen(null)} onDone={reload} />
    </div>
  );
}
