import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { KONKUR_DATE } from '../config';
import { useAuth } from '../auth';
import { Badge, Button, Empty, ErrorBox, Field, Icon, Loading, Modal, PageHead, Ring, SubjectDot, useConfirm, useToast } from '../ui';
import { TaskRow, WeekNav } from '../components';
import { TaskModal } from './counselor1';
import { useAsync, useSyllabus } from '../lib/hooks';
import { WEEKDAYS, addDays, daysUntil, faNum, fmtClock, fmtDateISO, fmtFull, fmtMinutes, fromISO, relativeDay, toISO, todayISO, weekStart } from '../lib/dates';

/* ═══════════════ امروز من ═══════════════ */
export function Today() {
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const { subject } = useSyllabus();
  const today = todayISO();
  const tasks = useAsync(() => api.listTasks(user.id, today, today), [user.id]);
  const exams = useAsync(() => api.listExams(), []);
  const prog = useAsync(() => api.getProgress(user.id), [user.id]);
  const [addEdit, setAddEdit] = useState(null);

  if (tasks.error && !tasks.data) return <ErrorBox error={tasks.error} onRetry={tasks.reload} />;
  const list = tasks.data || [];
  const done = list.filter((t) => t.done).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const nextId = list.find((t) => !t.done)?.id;
  const newExam = (exams.data || []).find((e) => e.status === 'new');
  const weak = (prog.data?.topics || []).find((t) => t.accuracy < 60 && t.total >= 2);
  const first = (user?.name || 'دانش‌آموز').trim().split(' ')[0] || 'دانش‌آموز';
  const left = list.length - done;

  const toggle = async (t) => {
    await api.toggleTask(t.id, !t.done);
    tasks.reload(); prog.reload();
    if (!t.done && left === 1) toast('همه‌ی کارهای امروز انجام شد. دمت گرم!');
  };
  const start = (t) => {
    if (t.type === 'practice') nav('/s/practice');
    else if (t.type === 'test') nav('/s/exams');
    else nav(`/s/study?task=${t.id}`);
  };

  return (
    <div className="stack-lg">
      <section className="today-hero sheet">
        <div className="grow">
          <p className="hello">سلام {first}</p>
          <h1 className="display">
            {!list.length ? 'برای امروز کاری ثبت نشده' : left === 0 ? 'امروز تمام شد' : `${faNum(left)} کار برای امروز مانده`}
          </h1>
          <p className="muted-light">{fmtFull(new Date())}</p>
          <div className="chips-light">
            <span><Icon name="calendar" size={16} />{faNum(Math.max(0, daysUntil(KONKUR_DATE)))} روز تا کنکور</span>
            <span><Icon name="flame" size={16} />{faNum(prog.data?.streak || 0)} روز پیاپی</span>
          </div>
        </div>
        <Ring value={pct} size={116} stroke={10}>
          <b className="display big">{faNum(done)}<small> از {faNum(list.length)}</small></b>
        </Ring>
      </section>

      {newExam && (
        <Link to="/s/exams" className="banner">
          <Icon name="exam" size={24} />
          <div className="grow">
            <b>آزمون جدید: {newExam.title}</b>
            <small>{faNum(newExam.questionCount)} سؤال · {faNum(newExam.durationMin)} دقیقه{newExam.deadline ? ` · مهلت: ${fmtDateISO(newExam.deadline)}` : ''}</small>
          </div>
          <span className="btn btn-primary btn-sm">شروع آزمون</span>
        </Link>
      )}

      <section>
        <div className="row between mb-s">
          <h2 className="sec-title" style={{ margin: 0 }}>کارهای امروز</h2>
          <Button size="sm" icon="plus" variant="soft" onClick={() => setAddEdit({ date: today })}>
            افزودن کار برای امروز
          </Button>
        </div>
        {tasks.loading && !tasks.data ? <Loading /> : list.length === 0 ? (
          <Empty
            icon="calendar"
            title="برای امروز برنامه‌ای ثبت نشده است"
            text="می‌توانی از بخش برنامه‌ی هفته یک قالب آماده را اعمال کنی یا با دکمه‌ی زیر کار دلخواهت را اضافه کنی."
            action={
              <div className="row wrap">
                <Button icon="plus" onClick={() => setAddEdit({ date: today })}>افزودن کار برای امروز</Button>
                <Link className="btn btn-soft" to="/s/plan">انتخاب قالب برنامه‌ریزی</Link>
                <Link className="btn btn-ghost" to="/s/study">رفتن به زمان‌سنج</Link>
              </div>
            }
          />
        ) : (
          <div className="task-list">
            {list.map((t) => (
              <div key={t.id} className={t.id === nextId ? 'is-next' : ''}>
                <TaskRow task={t} onToggle={toggle} onStart={t.id === nextId ? start : undefined} />
              </div>
            ))}
          </div>
        )}
      </section>

      {weak && (
        <section className="callout soft">
          <Icon name="target" size={22} />
          <div className="grow">
            <b>پیشنهاد مرور: {weak.name}</b>
            <small>دقتت در این مبحث {faNum(weak.accuracy)}٪ است. چند دقیقه از دستیار بپرس.</small>
          </div>
          <Link className="btn btn-soft btn-sm" to={`/s/assistant?q=${encodeURIComponent(`مبحث «${weak.name}» را برایم خلاصه توضیح بده`)}`}>مرور کنیم</Link>
        </section>
      )}

      {addEdit && (
        <TaskModal
          edit={addEdit}
          ws={today}
          student={user}
          onClose={() => setAddEdit(null)}
          onSaved={() => { setAddEdit(null); tasks.reload(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════ برنامه‌ی هفتگی ═══════════════ */
export function Plan() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { subject, topic } = useSyllabus();
  const [ws, setWs] = useState(toISO(weekStart()));
  const nav = useNavigate();
  const end = toISO(addDays(fromISO(ws), 6));
  const tasks = useAsync(() => api.listTasks(user.id, ws, end), [ws, user.id]);
  const tpls = useAsync(() => api.listTemplates(), []);
  const [tplOpen, setTplOpen] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [applying, setApplying] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const today = todayISO();
  const list = tasks.data || [];
  const days = useMemo(() => [...Array(7)].map((_, i) => {
    const date = toISO(addDays(fromISO(ws), i));
    return { date, name: WEEKDAYS[i], tasks: list.filter((t) => t.date === date) };
  }), [ws, list]);
  const planned = list.reduce((a, t) => a + t.minutes, 0);
  const done = list.filter((t) => t.done).length;

  const toggle = async (t) => { await api.toggleTask(t.id, !t.done); tasks.reload(); };
  const start = (t) => {
    if (t.type === 'practice') nav('/s/practice');
    else if (t.type === 'test') nav('/s/exams');
    else nav(`/s/study?task=${t.id}`);
  };

  const applyTemplate = async (t) => {
    setApplying(true);
    try {
      await api.applyTemplate(user.id, t.id, ws);
      toast(`قالب «${t.name}» روی برنامه‌ی این هفته اعمال شد.`);
      setTplOpen(false);
      setSelectedTpl(null);
      tasks.reload();
    } catch (e) {
      toast(e.message, 'err');
    }
    setApplying(false);
  };

  const copyNext = async () => {
    const nextWs = toISO(addDays(fromISO(ws), 7));
    const ok = await confirm({
      title: 'کپی به هفته بعد؟',
      text: `آیا مایلید تمام ${faNum(list.length)} کار این هفته به هفته‌ی بعد کپی شوند؟`,
      confirmLabel: 'کپی به هفته بعد',
    });
    if (ok) {
      try {
        await api.copyWeek(user.id, ws, nextWs);
        toast('برنامه با موفقیت به هفته بعد کپی شد.');
        setWs(nextWs);
      } catch (e) {
        toast(e.message, 'err');
      }
    }
  };

  const clearWeek = async () => {
    const ok = await confirm({
      title: 'حذف برنامه‌های این هفته؟',
      text: `آیا از حذف تمام ${faNum(list.length)} برنامه این هفته مطمئن هستید؟ این عملیات قابل بازگشت نیست.`,
      confirmLabel: 'حذف کل برنامه هفته',
      danger: true,
    });
    if (ok) {
      try {
        await api.clearWeek(user.id, ws);
        toast('برنامه‌های این هفته پاک شدند.');
        tasks.reload();
      } catch (e) {
        toast(e.message, 'err');
      }
    }
  };

  return (
    <div className="stack-lg">
      <PageHead
        title="برنامه‌ی هفته"
        sub="برنامه‌ی مطالعاتی کنکور هنر؛ کارهای انجام‌شده را تیک بزن تا در گزارش پیشرفتت ثبت شوند."
        actions={
          <div className="row wrap">
            <Button icon="plus" onClick={() => setEditTask({ date: ws })}>افزودن کار دلخواه</Button>
            <Button icon="copy" variant="soft" onClick={() => { setTplOpen(true); setSelectedTpl(null); }}>
              انتخاب قالب آماده
            </Button>
          </div>
        }
      />

      <div className="plan-toolbar">
        <WeekNav start={ws} onChange={setWs} />
        <div className="row wrap">
          {list.length > 0 && (
            <>
              <Button variant="ghost" size="sm" icon="refresh" onClick={copyNext}>
                کپی به هفته‌ی بعد
              </Button>
              <Button variant="ghost" size="sm" icon="trash" onClick={clearWeek}>
                پاک کردن این هفته
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="statstrip slim">
        <div><small>کل زمان برنامه</small><b>{fmtMinutes(planned)}</b></div>
        <div><small>انجام‌شده</small><b>{faNum(done)} از {faNum(list.length)}</b></div>
      </div>

      {tasks.loading && !tasks.data ? <Loading /> : (
        <div className="days">
          {days.map((d) => {
            const dn = d.tasks.filter((t) => t.done).length;
            return (
              <section key={d.date} className={`day ${d.date === today ? 'today' : ''}`}>
                <header>
                  <h3>{d.name} <span className="muted">{fmtDateISO(d.date)}</span></h3>
                  <div className="row">
                    {d.date === today && <Badge tone="info">امروز</Badge>}
                    {d.tasks.length > 0 && <span className="muted sm">{faNum(dn)} از {faNum(d.tasks.length)}</span>}
                    <button
                      className="link sm"
                      style={{ marginRight: 6 }}
                      onClick={() => setEditTask({ date: d.date })}
                      title="افزودن کار برای این روز"
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                </header>
                {d.tasks.length === 0 ? (
                  <p className="muted sm pad-s">کاری ثبت نشده است.</p>
                ) : (
                  <div className="task-list">
                    {d.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        onToggle={toggle}
                        onStart={d.date === today ? start : undefined}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {list.length === 0 && !tasks.loading && (
        <Empty
          icon="calendar"
          title="برای این هفته برنامه‌ای تنظیم نشده است"
          text="می‌توانی با انتخاب یکی از قالب‌های استاندارد (متعادل، گرافیک، نقاشی، سینما یا تست‌زنی)، به سرعت جدول هفته‌ات را تکمیل کنی."
          action={
            <div className="row wrap">
              <Button icon="copy" onClick={() => { setTplOpen(true); setSelectedTpl(null); }}>
                انتخاب قالب آماده برای شروع
              </Button>
              <Button variant="soft" icon="plus" onClick={() => setEditTask({ date: ws })}>
                افزودن کار دستی
              </Button>
            </div>
          }
        />
      )}

      {/* Template Selection Modal */}
      <Modal
        open={tplOpen}
        onClose={() => { setTplOpen(false); setSelectedTpl(null); }}
        title="قالب‌های برنامه‌ریزی هفتگی کنکور هنر"
        wide
        footer={
          selectedTpl ? (
            <div className="row between grow">
              <Button variant="ghost" onClick={() => setSelectedTpl(null)}>
                بازگشت به لیست قالب‌ها
              </Button>
              <Button loading={applying} icon="check" onClick={() => applyTemplate(selectedTpl)}>
                اعمال این قالب روی هفته جاری
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setTplOpen(false)}>بستن</Button>
          )
        }
      >
        {!selectedTpl ? (
          <div className="stack">
            <p className="muted sm">
              یکی از قالب‌های استاندارد کنکور هنر را انتخاب کن تا جدول هفتگی‌ات به صورت خودکار با درس‌های مصوب پر شود:
            </p>
            <div className="stack-sm">
              {(tpls.data || []).map((t) => (
                <article
                  key={t.id}
                  className="tpl clickable"
                  style={{ cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center' }}
                  onClick={() => setSelectedTpl(t)}
                >
                  <div className="grow">
                    <div className="row wrap" style={{ gap: 6, marginBottom: 4 }}>
                      <b>{t.name}</b>
                      {t.badge && <Badge tone="info">{t.badge}</Badge>}
                    </div>
                    <p className="muted sm" style={{ margin: 0 }}>{t.desc}</p>
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 120 }}>
                    <span className="badge tone-neutral sm">{faNum(t.taskCount)} کار</span>
                    <div className="muted sm" style={{ marginTop: 4 }}>{fmtMinutes(t.minutes)}</div>
                  </div>
                  <Icon name="chevL" size={18} className="row-arrow" />
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="callout soft">
              <div className="grow">
                <h3>{selectedTpl.name}</h3>
                <p className="muted sm">{selectedTpl.desc}</p>
                <div className="chips-light" style={{ marginTop: 8 }}>
                  <span>{faNum(selectedTpl.taskCount)} برنامه هفتگی</span>
                  <span>مجموع {fmtMinutes(selectedTpl.minutes)} در کل هفته</span>
                </div>
              </div>
            </div>

            <h4>پیش‌نمایش برنامه‌ی روزانه این قالب:</h4>
            <div className="stack-sm">
              {[...Array(7)].map((_, dayIdx) => {
                const dayTasks = (selectedTpl.tasks || []).filter((x) => x.day === dayIdx);
                if (!dayTasks.length) return null;
                return (
                  <div key={dayIdx} className="block" style={{ padding: 10 }}>
                    <b style={{ color: 'var(--lapis)' }}>{WEEKDAYS[dayIdx]}</b>
                    <ul className="plain-list" style={{ marginTop: 6 }}>
                      {dayTasks.map((x, idx) => (
                        <li key={idx} className="row between" style={{ padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
                          <span className="row" style={{ gap: 6 }}>
                            <SubjectDot subject={subject(x.subjectId)} />
                            <span>{x.title || `${topic(x.topicId)?.name || x.topicId}`}</span>
                          </span>
                          <span className="muted sm">{faNum(x.minutes)} دقیقه</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Task Modal */}
      {editTask && (
        <TaskModal
          edit={editTask}
          ws={ws}
          student={user}
          onClose={() => setEditTask(null)}
          onSaved={() => { setEditTask(null); tasks.reload(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════ زمان مطالعه ═══════════════ */
const PRESETS = [25, 45, 60, 90];

export function Study() {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const taskId = params.get('task');
  const { subjects, subject } = useSyllabus();
  const ws = toISO(weekStart());
  const week = useAsync(() => api.listTasks(user.id, ws, toISO(addDays(weekStart(), 6))), [user.id]);
  const sessions = useAsync(() => api.listSessions(6), []);
  const task = taskId ? (week.data || []).find((t) => t.id === taskId) : null;

  const [subjectId, setSubjectId] = useState('art');
  const [minutes, setMinutes] = useState(45);
  const [total, setTotal] = useState(45 * 60);
  const [remain, setRemain] = useState(45 * 60);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const endAt = useRef(0);
  const stateRef = useRef({});
  stateRef.current = { total, remain, subjectId, taskId: task?.id };

  useEffect(() => {
    if (task) {
      setSubjectId(task.subjectId);
      setMinutes(task.minutes);
      setTotal(task.minutes * 60);
      setRemain(task.minutes * 60);
    }
  }, [task?.id]); // eslint-disable-line

  const save = async (elapsedSec) => {
    const m = Math.round(elapsedSec / 60);
    if (m < 1) { toast('کمتر از یک دقیقه ثبت نمی‌شود.', 'err'); return; }
    setSaving(true);
    await api.logStudy({ subjectId: stateRef.current.subjectId, minutes: m, taskId: stateRef.current.taskId });
    setSaving(false);
    toast(`${faNum(m)} دقیقه مطالعه ثبت شد.`);
    sessions.reload(); week.reload();
    setRemain(stateRef.current.total);
  };

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const r = Math.round((endAt.current - Date.now()) / 1000);
      if (r <= 0) { setRunning(false); setRemain(0); save(stateRef.current.total); }
      else setRemain(r);
    }, 250);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line

  const pick = (m) => {
    if (running) return;
    setMinutes(m); setTotal(m * 60); setRemain(m * 60);
  };
  const start = () => { endAt.current = Date.now() + remain * 1000; setRunning(true); };
  const pause = () => setRunning(false);
  const finish = () => { setRunning(false); save(total - remain); };
  const elapsed = total - remain;
  const idle = !running && remain === total;

  const [mSubject, setMSubject] = useState('art');
  const [mMin, setMMin] = useState(30);
  const manual = async () => {
    await api.logStudy({ subjectId: mSubject, minutes: Number(mMin) });
    toast(`${faNum(mMin)} دقیقه مطالعه ثبت شد.`);
    sessions.reload();
  };

  return (
    <div className="stack-lg">
      <PageHead title="زمان مطالعه" sub="زمان‌سنج را روشن کن و فقط مطالعه کن؛ ثبت زمان خودکار انجام می‌شود." />
      <section className="timer-panel">
        {task && <div className="callout soft"><Icon name="book" size={20} /><span>کار برنامه: <b>{task.title}</b>. با پایان زمان‌سنج، این کار انجام‌شده علامت می‌خورد.</span></div>}
        <div className="timer-grid">
          <Ring value={(elapsed / total) * 100} size={220} stroke={14} color="var(--lapis)" track="var(--lapis-l)">
            <div className="timer-face">
              <b className="display">{fmtClock(remain)}</b>
              <small>{running ? 'در حال مطالعه' : idle ? 'آماده' : 'متوقف شده'}</small>
            </div>
          </Ring>
          <div className="stack">
            <Field label="درس">
              <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!!task || running}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div>
              <span className="field-label">مدت</span>
              <div className="chip-row">
                {PRESETS.map((m) => <button key={m} className={`chip-toggle ${minutes === m ? 'on' : ''}`} onClick={() => pick(m)} disabled={running}>{faNum(m)} دقیقه</button>)}
              </div>
            </div>
            <div className="row wrap">
              {!running ? <Button size="lg" icon="play" onClick={start} disabled={remain <= 0}>{idle ? 'شروع' : 'ادامه'}</Button> : <Button size="lg" variant="soft" icon="pause" onClick={pause}>توقف موقت</Button>}
              {!idle && <Button size="lg" variant="ghost" loading={saving} onClick={finish}>پایان و ثبت ({faNum(Math.round(elapsed / 60))} دقیقه)</Button>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid2">
        <section className="block">
          <h2>ثبت دستی</h2>
          <p className="muted sm">اگر بدون زمان‌سنج خوانده‌ای، زمانش را اینجا اضافه کن.</p>
          <div className="row wrap end">
            <Field label="درس" className="grow">
              <select className="select" value={mSubject} onChange={(e) => setMSubject(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label="دقیقه">
              <input className="input ltr narrow" type="number" min="5" max="600" value={mMin} onChange={(e) => setMMin(e.target.value)} />
            </Field>
            <Button variant="soft" onClick={manual} disabled={!mMin || mMin < 1}>ثبت</Button>
          </div>
        </section>
        <section className="block">
          <h2>آخرین مطالعه‌ها</h2>
          {!sessions.data?.length ? <p className="muted">هنوز زمانی ثبت نشده.</p> : (
            <ul className="plain-list">
              {sessions.data.map((s) => <li key={s.id}><SubjectDot subject={subject(s.subjectId)} /><span className="muted">{relativeDay(s.date)}</span><b>{fmtMinutes(s.minutes)}</b></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
