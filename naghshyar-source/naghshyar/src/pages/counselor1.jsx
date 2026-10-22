import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Avatar, Badge, Button, Empty, ErrorBox, Field, HBar, Icon, Loading, Modal, PageHead, Seg, Tabs, useConfirm, useToast } from '../ui';
import { PracticeCard, ProgressView, WeekNav } from '../components';
import { PracticeReviewModal } from './counselor2';
import { TYPES, useAsync, useSyllabus } from '../lib/hooks';
import { WEEKDAYS, addDays, faNum, fmtDateISO, fmtMinutes, fromISO, relativeDay, toISO, todayISO, weekStart } from '../lib/dates';

const STATUS = {
  good: { tone: 'good', label: 'منظم' },
  warn: { tone: 'warn', label: 'نیاز به پیگیری' },
  late: { tone: 'bad', label: 'عقب‌مانده' },
  noplan: { tone: 'neutral', label: 'بدون برنامه' },
};
const ORDER = { late: 0, warn: 1, noplan: 2, good: 3 };

/* ═══════════════ فهرست دانش‌آموزان ═══════════════ */
export function CounselorHome() {
  const nav = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.listStudents(), []);
  const practice = useAsync(() => api.listPractice(), []);
  const fields = useAsync(() => api.listFields(), []);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', field: 'گرافیک' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const items = data?.items || [];
  const list = useMemo(() => items
    .filter((s) => (filter === 'all' ? true : filter === 'attn' ? s.status === 'late' || s.status === 'warn' : s.status === 'good'))
    .filter((s) => !q || s.name.includes(q))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]), [items, filter, q]);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const attn = items.filter((s) => s.status === 'late' || s.status === 'warn').length;
  const pending = (practice.data || []).filter((p) => p.status === 'pending').length;

  const invite = async () => {
    setBusy(true); setErr('');
    try {
      const s = await api.inviteStudent(form);
      setCreated(s);
      reload();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const close = () => { setOpen(false); setCreated(null); setErr(''); setForm({ name: '', phone: '', field: 'گرافیک' }); };

  return (
    <div className="stack-lg">
      <PageHead title="دانش‌آموزان من" sub="وضعیت این هفته‌ی همه‌ی دانش‌آموزها؛ اولویت با کسانی است که عقب مانده‌اند."
        actions={<Button icon="plus" onClick={() => setOpen(true)}>افزودن دانش‌آموز</Button>} />

      <div className="statstrip">
        <div><small>دانش‌آموزان</small><b>{faNum(items.length)}{data.limit ? <span className="muted"> از {faNum(data.limit)}</span> : ''}</b></div>
        <div><small>نیازمند پیگیری</small><b className={attn ? 'bad' : ''}>{faNum(attn)}</b></div>
        <div><small>کار عملی منتظر بازبینی</small><b>{faNum(pending)}</b></div>
        <div><small>این هفته</small><b>{faNum(items.reduce((a, s) => a + s.weekDone, 0))} کار انجام شد</b></div>
      </div>

      <div className="toolbar">
        <Seg size="sm" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'همه' }, { value: 'attn', label: `نیازمند پیگیری${attn ? ` (${faNum(attn)})` : ''}` }, { value: 'good', label: 'منظم' }]} />
        <div className="search"><Icon name="search" size={18} /><input className="input" placeholder="جستجوی نام" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" /></div>
      </div>

      {list.length === 0 ? (
        <Empty icon="users" title={items.length ? 'موردی پیدا نشد' : 'هنوز دانش‌آموزی اضافه نکرده‌ای'} text={items.length ? 'فیلتر یا جستجو را تغییر بده.' : 'با شماره‌ی موبایل دانش‌آموز را اضافه کن تا بتواند وارد شود.'}
          action={!items.length && <Button icon="plus" onClick={() => setOpen(true)}>افزودن دانش‌آموز</Button>} />
      ) : (
        <div className="list">
          {list.map((s) => {
            const pct = s.weekTotal ? Math.round((s.weekDone / s.weekTotal) * 100) : 0;
            return (
              <button key={s.id} className="list-row student-row" onClick={() => nav(`/c/students/${s.id}`)}>
                <Avatar user={s} size={44} />
                <div className="grow">
                  <b>{s.name}</b>
                  <small className="muted">{s.field}{s.lastActive ? ` · آخرین فعالیت ${relativeDay(s.lastActive)}` : ' · هنوز فعالیتی ندارد'}</small>
                </div>
                <div className="week-meter">
                  <small>{s.weekTotal ? `${faNum(s.weekDone)} از ${faNum(s.weekTotal)} کار` : 'برنامه‌ای ندارد'}</small>
                  <HBar value={pct} warn={s.status === 'late'} />
                </div>
                <div className="score-col"><small>میانگین آزمون</small><b>{s.avgScore === null ? '—' : `${faNum(s.avgScore)}٪`}</b></div>
                <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                <Icon name="chevL" size={18} className="row-arrow" />
              </button>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={close} title={created ? 'دانش‌آموز اضافه شد' : 'افزودن دانش‌آموز'}
        footer={created ? (
          <><Button variant="ghost" onClick={close}>بستن</Button><Button onClick={() => { nav(`/c/students/${created.id}`); close(); }}>ساخت برنامه برای او</Button></>
        ) : (
          <><Button variant="ghost" onClick={close}>انصراف</Button><Button loading={busy} onClick={invite} disabled={!form.name || !form.phone}>افزودن</Button></>
        )}>
        {created ? (
          <div className="stack">
            <p><b>{created.name}</b> با شماره‌ی <span className="ltr-inline">{created.phone}</span> می‌تواند وارد سامانه شود. کد تأیید برای خودش پیامک می‌شود.</p>
          </div>
        ) : (
          <div className="stack">
            <Field label="نام و نام خانوادگی"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
            <Field label="شماره موبایل" error={err}><input className="input ltr" inputMode="numeric" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="رشته‌ی هدف">
              <select className="select" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })}>{(fields.data || []).map((f) => <option key={f}>{f}</option>)}</select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ═══════════════ صفحه‌ی یک دانش‌آموز ═══════════════ */
export function StudentDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'plan';
  const { data: s, error, reload } = useAsync(() => api.getStudent(id), [id]);
  if (error && !s) return <ErrorBox error={error} onRetry={reload} />;
  if (!s) return <Loading />;
  const st = STATUS[s.status];
  return (
    <div className="stack-lg">
      <div className="student-head">
        <Link to="/c" className="link back"><Icon name="prev" size={16} />همه‌ی دانش‌آموزان</Link>
        <div className="row wrap between">
          <div className="row">
            <Avatar user={s} size={56} />
            <div>
              <h1>{s.name}</h1>
              <p className="muted">{s.field} · <span className="ltr-inline">{s.phone}</span></p>
            </div>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <div className="row wrap">
            <Link className="btn btn-soft" to={`/c/chat?student=${s.id}`}><Icon name="chat" size={18} />گفتگو با {s.name.split(' ')[0]}</Link>
            <Link className="btn btn-primary" to={`/c/exams/new?student=${s.id}`}><Icon name="exam" size={18} />ساخت آزمون برای {s.name.split(' ')[0]}</Link>
          </div>
        </div>
      </div>
      <Tabs value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })}
        tabs={[{ value: 'plan', label: 'برنامه', icon: 'calendar' }, { value: 'exams', label: 'آزمون‌ها', icon: 'exam' }, { value: 'progress', label: 'پیشرفت', icon: 'chart' }, { value: 'practice', label: 'کار عملی', icon: 'brush' }]} />
      {tab === 'plan' && <PlanBuilder student={s} />}
      {tab === 'exams' && <StudentExams student={s} />}
      {tab === 'progress' && <ProgressView studentId={s.id} studentView={false} />}
      {tab === 'practice' && <StudentPractice student={s} />}
    </div>
  );
}

/* ── tabs ── */
function StudentExams({ student }) {
  const { data, loading } = useAsync(() => api.listExams(student.id), [student.id]);
  if (loading && !data) return <Loading />;
  if (!data?.length) return <Empty icon="exam" title="هنوز آزمونی برای او ساخته نشده" action={<Link className="btn btn-primary" to={`/c/exams/new?student=${student.id}`}>ساخت آزمون</Link>} />;
  return (
    <div className="list">
      {data.map((e) => (
        <article key={e.id} className="list-row">
          <div className="grow"><b>{e.title}</b><small className="muted">{fmtDateISO(e.createdAt)} · {faNum(e.questionCount)} سؤال</small></div>
          {e.studentDone ? (
            <><Badge tone={e.studentScore >= 70 ? 'good' : e.studentScore >= 40 ? 'warn' : 'bad'}>{faNum(e.studentScore)}٪</Badge>
              <Link className="btn btn-soft btn-sm" to={`/c/exams/${e.id}/result/${student.id}`}>دیدن نتیجه</Link></>
          ) : <Badge tone="neutral" icon="clock">منتظر پاسخ</Badge>}
        </article>
      ))}
    </div>
  );
}

function StudentPractice({ student }) {
  const { data, loading, reload } = useAsync(() => api.listPractice(student.id), [student.id]);
  const [open, setOpen] = useState(null);
  if (loading && !data) return <Loading />;
  if (!data?.length) return <Empty icon="brush" title="هنوز کار عملی نفرستاده" text="وقتی طراحی یا نقاشی بفرستد، اینجا بازخورد می‌دهی." />;
  return (
    <>
      <div className="pgrid">{data.map((p) => <PracticeCard key={p.id} item={p} onOpen={setOpen} />)}</div>
      <PracticeReviewModal item={open} onClose={() => setOpen(null)} onDone={reload} />
    </>
  );
}

/* ═══════════════ برنامه‌ساز هفتگی ═══════════════ */
function PlanBuilder({ student }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { subject, topic } = useSyllabus();
  const [ws, setWs] = useState(toISO(weekStart()));
  const end = toISO(addDays(fromISO(ws), 6));
  const tasks = useAsync(() => api.listTasks(student.id, ws, end), [ws, student.id]);
  const prog = useAsync(() => api.getProgress(student.id), [student.id]);
  const tpls = useAsync(() => api.listTemplates(), []);
  const [edit, setEdit] = useState(null);
  const [tplOpen, setTplOpen] = useState(false);
  const today = todayISO();
  const list = tasks.data || [];
  const days = [...Array(7)].map((_, i) => {
    const date = toISO(addDays(fromISO(ws), i));
    const ts = list.filter((t) => t.date === date);
    return { date, name: WEEKDAYS[i], tasks: ts, minutes: ts.reduce((a, t) => a + t.minutes, 0) };
  });
  const total = list.reduce((a, t) => a + t.minutes, 0);
  const weak = (prog.data?.topics || []).filter((t) => t.accuracy < 60).slice(0, 3);
  const defaultDate = today >= ws && today <= end ? today : ws;

  const act = async (fn, msg) => { await fn(); tasks.reload(); if (msg) toast(msg); };
  const applyTpl = async (t) => {
    const ok = await confirm({ title: `اعمال «${t.name}»؟`, text: list.length ? 'کارهای این قالب به برنامه‌ی موجود همین هفته اضافه می‌شود؛ چیزی پاک نمی‌شود.' : 'کارهای این قالب روی همین هفته گذاشته می‌شود و بعد می‌توانی تک‌تک ویرایششان کنی.', confirmLabel: 'اعمال کن' });
    if (ok) { setTplOpen(false); act(() => api.applyTemplate(student.id, t.id, ws), `${faNum(t.taskCount)} کار اضافه شد.`); }
  };
  const copyPrev = async () => {
    const prev = toISO(addDays(fromISO(ws), -7));
    const ok = await confirm({ title: 'کپی از هفته‌ی قبل؟', text: 'همه‌ی کارهای هفته‌ی قبل (بدون وضعیت انجام) به این هفته اضافه می‌شود.', confirmLabel: 'کپی کن' });
    if (ok) act(() => api.copyWeek(student.id, prev, ws), 'برنامه‌ی هفته‌ی قبل کپی شد.');
  };
  const clear = async () => {
    const ok = await confirm({ title: 'پاک‌کردن برنامه‌ی این هفته؟', text: `همه‌ی ${faNum(list.length)} کار این هفته حذف می‌شود و برگشتی ندارد.`, confirmLabel: 'پاک کن', danger: true });
    if (ok) act(() => api.clearWeek(student.id, ws), 'برنامه‌ی هفته پاک شد.');
  };
  const publish = async () => { await api.publishPlan(student.id, ws); toast(`به ${student.name.split(' ')[0]} اعلان فرستاده شد.`); };

  return (
    <div className="stack-lg">
      <div className="plan-toolbar">
        <WeekNav start={ws} onChange={setWs} />
        <div className="row wrap">
          <Button variant="soft" icon="copy" onClick={() => setTplOpen(true)}>قالب آماده</Button>
          <Button variant="soft" icon="refresh" onClick={copyPrev}>کپی از هفته‌ی قبل</Button>
          {list.length > 0 && <Button variant="ghost" icon="trash" onClick={clear}>پاک کردن هفته</Button>}
          <Button icon="send" onClick={publish} disabled={!list.length}>اعلام به دانش‌آموز</Button>
        </div>
      </div>

      {weak.length > 0 && (
        <div className="callout warn">
          <Icon name="target" size={20} />
          <div className="grow">
            <b>مبحث‌های ضعیف {student.name.split(' ')[0]}</b>
            <div className="chip-row">
              {weak.map((t) => (
                <button key={t.topicId} className="chip-toggle" onClick={() => setEdit({ date: defaultDate, preset: { type: 'review', subjectId: t.subjectId, topicId: t.topicId, minutes: 40 } })}>
                  <Icon name="plus" size={14} />{t.name} ({faNum(t.accuracy)}٪) · افزودن مرور
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="muted sm">مجموع این هفته: <b>{fmtMinutes(total)}</b> · روی هر کار بزن تا ویرایش یا حذفش کنی.</div>

      {tasks.loading && !tasks.data ? <Loading /> : (
        <div className="week-grid">
          {days.map((d) => (
            <section key={d.date} className={`wcol ${d.date === today ? 'today' : ''}`}>
              <header>
                <b>{d.name}</b>
                <small>{fmtDateISO(d.date)}</small>
                {d.minutes > 0 && <span className={`mins ${d.minutes > 480 ? 'over' : ''}`}>{fmtMinutes(d.minutes)}</span>}
              </header>
              <div className="wtasks">
                {d.tasks.map((t) => {
                  const s = subject(t.subjectId);
                  return (
                    <button key={t.id} className={`wtask ${t.done ? 'done' : ''}`} style={{ '--c': s?.color }} onClick={() => setEdit({ task: t, date: t.date })}>
                      <span className="wtask-title">{t.done && <Icon name="check" size={14} stroke={3} />}{topic(t.topicId)?.name || t.title}</span>
                      <small>{TYPES[t.type]?.label} · {faNum(t.minutes)} دقیقه</small>
                    </button>
                  );
                })}
              </div>
              <button className="wadd" onClick={() => setEdit({ date: d.date })}><Icon name="plus" size={16} />افزودن</button>
            </section>
          ))}
        </div>
      )}

      {!tasks.loading && list.length === 0 && (
        <Empty icon="calendar" title="برای این هفته برنامه‌ای نیست" text="از یک قالب آماده شروع کن و بعد تغییرش بده؛ سریع‌تر از ساخت از صفر است."
          action={<Button icon="copy" onClick={() => setTplOpen(true)}>انتخاب قالب آماده</Button>} />
      )}

      <TaskModal edit={edit} ws={ws} student={student} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); tasks.reload(); }} />

      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title="قالب‌های آماده">
        <div className="stack">
          {(tpls.data || []).map((t) => (
            <button key={t.id} className="tpl" onClick={() => applyTpl(t)}>
              <div className="grow"><b>{t.name}</b><small className="muted">{t.desc}</small></div>
              <span className="muted sm">{faNum(t.taskCount)} کار · {fmtMinutes(t.minutes)}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function TaskModal({ edit, ws, student, onClose, onSaved }) {
  const toast = useToast();
  const { subjects } = useSyllabus();
  const open = !!edit;
  const task = edit?.task;
  const init = () => ({
    type: task?.type || edit?.preset?.type || 'study',
    subjectId: task?.subjectId || edit?.preset?.subjectId || 'art',
    topicId: task?.topicId || edit?.preset?.topicId || 'iran_art',
    minutes: task?.minutes || edit?.preset?.minutes || 60,
    date: edit?.date || ws,
    note: task?.note || '',
  });
  const [f, setF] = useState(init);
  useEffect(() => { if (edit) setF(init()); }, [edit]); // eslint-disable-line
  const [busy, setBusy] = useState(false);
  const subj = subjects.find((s) => s.id === f.subjectId);

  const setSubject = (id) => {
    const s = subjects.find((x) => x.id === id);
    setF({ ...f, subjectId: id, topicId: s.topics[0].id, type: id === 'practical' ? 'practice' : f.type === 'practice' ? 'study' : f.type });
  };
  const save = async () => {
    setBusy(true);
    try {
      if (task) await api.updateTask(task.id, { ...f, minutes: Number(f.minutes) });
      else await api.createTask(student.id, { ...f, minutes: Number(f.minutes) });
      toast(task ? 'تغییرات ذخیره شد.' : 'کار به برنامه اضافه شد.');
      onSaved();
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  const del = async () => { await api.deleteTask(task.id); toast('کار حذف شد.'); onSaved(); };

  return (
    <Modal open={open} onClose={onClose} title={task ? 'ویرایش کار' : 'افزودن کار به برنامه'}
      footer={<>
        {task && <Button variant="ghost" icon="trash" onClick={del}>حذف</Button>}
        <span className="grow" />
        <Button variant="ghost" onClick={onClose}>انصراف</Button>
        <Button loading={busy} onClick={save}>{task ? 'ذخیره' : 'افزودن'}</Button>
      </>}>
      <div className="stack">
        <Field label="نوع کار">
          <Seg value={f.type} onChange={(v) => setF({ ...f, type: v })} options={Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label }))} />
        </Field>
        <div className="grid2">
          <Field label="درس"><select className="select" value={f.subjectId} onChange={(e) => setSubject(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="مبحث"><select className="select" value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value })}>{(subj?.topics || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        </div>
        <div className="grid2">
          <Field label="روز">
            <select className="select" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}>
              {[...Array(7)].map((_, i) => { const d = toISO(addDays(fromISO(ws), i)); return <option key={d} value={d}>{WEEKDAYS[i]} · {fmtDateISO(d)}</option>; })}
            </select>
          </Field>
          <Field label="مدت (دقیقه)"><input className="input ltr" type="number" min="5" max="600" step="5" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field>
        </div>
        <div className="chip-row">{[30, 45, 60, 90, 120].map((m) => <button key={m} type="button" className={`chip-toggle ${Number(f.minutes) === m ? 'on' : ''}`} onClick={() => setF({ ...f, minutes: m })}>{faNum(m)}</button>)}</div>
        <Field label="یادداشت برای دانش‌آموز (اختیاری)"><textarea className="textarea" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مثلاً: فصل ۳ کتاب و حل تست‌های آخرش" /></Field>
      </div>
    </Modal>
  );
}
