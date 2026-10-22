import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { Badge, BarChart, Button, Empty, ErrorBox, HBar, Icon, LineChart, Loading, Ring, SubjectDot } from './ui';
import { TYPES, useAsync, useSyllabus } from './lib/hooks';
import { addDays, faNum, fmtDateISO, fmtDayNum, fmtMinutes, fromISO, toISO, weekRangeLabel, weekStart } from './lib/dates';

/* ── Week navigator (shared by student plan + counselor plan builder) ── */
export function WeekNav({ start, onChange }) {
  const current = toISO(weekStart());
  const move = (n) => onChange(toISO(addDays(fromISO(start), n * 7)));
  return (
    <div className="week-nav">
      <Button variant="ghost" icon="chevR" onClick={() => move(-1)} aria-label="هفته‌ی قبل" />
      <div className="week-label">
        <b>{weekRangeLabel(start)}</b>
        {start === current ? <small>این هفته</small> : <button className="link" onClick={() => onChange(current)}>برگشت به این هفته</button>}
      </div>
      <Button variant="ghost" icon="chevL" onClick={() => move(1)} aria-label="هفته‌ی بعد" />
    </div>
  );
}

/* ── One task row (student) ── */
export function TaskRow({ task, onToggle, onStart }) {
  const { subject } = useSyllabus();
  const s = subject(task.subjectId);
  return (
    <div className={`task ${task.done ? 'done' : ''}`}>
      <button className="check" style={{ '--c': s?.color || 'var(--lapis)' }} aria-pressed={task.done} aria-label={task.done ? 'برگرداندن به انجام‌نشده' : 'انجام شد'} onClick={() => onToggle(task)}>
        <Icon name="check" size={20} stroke={3} />
      </button>
      <div className="task-main">
        <b className="task-title">{task.title}</b>
        <span className="task-meta">
          <SubjectDot subject={s} />
          <span><Icon name="clock" size={14} /> {fmtMinutes(task.minutes)}</span>
          <span>{TYPES[task.type]?.label}</span>
        </span>
      </div>
      {onStart && !task.done && <Button size="sm" variant="soft" onClick={() => onStart(task)}>شروع</Button>}
    </div>
  );
}

/* ── Progress (student's own page + counselor's student tab) ── */
export function ProgressView({ studentId, studentView = true }) {
  const { subject, subjects } = useSyllabus();
  const { data, loading, error, reload } = useAsync(() => api.getProgress(studentId), [studentId]);
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const p = data;
  const weak = p.topics.filter((t) => t.accuracy < 60);
  const total7 = p.bySubject.reduce((a, x) => a + x.minutes, 0);
  const last = p.studyByDay.length - 1;
  return (
    <div className="stack-lg">
      <div className="statstrip">
        <div><small>مطالعه‌ی این هفته</small><b>{fmtMinutes(p.weekMinutes)}</b></div>
        <div><small>کارهای انجام‌شده</small><b>{faNum(p.weekDone)} از {faNum(p.weekTotal)}</b></div>
        <div><small>روزهای پیاپی</small><b><Icon name="flame" size={20} className="flame" />{faNum(p.streak)}</b></div>
        <div><small>میانگین آزمون‌ها</small><b>{p.avgScore === null ? '—' : `${faNum(p.avgScore)}٪`}</b></div>
      </div>

      <section className="block">
        <h2>مطالعه در ۱۴ روز اخیر</h2>
        <BarChart data={p.studyByDay.map((d, i) => ({ label: fmtDayNum(d.date), value: Math.round(d.minutes / 6) / 10, today: i === last }))} format={(v) => faNum(v)} unit=" ساعت" />
        <p className="muted sm">ارتفاع ستون‌ها بر حسب ساعت است؛ ستون زرد امروز است.</p>
      </section>

      <div className="grid2">
        <section className="block">
          <h2>روند نمره‌ی آزمون‌ها</h2>
          {p.examTrend.length ? (
            <>
              <LineChart points={p.examTrend.map((e) => ({ value: e.score }))} />
              <ul className="legend-list">{p.examTrend.map((e, i) => <li key={e.examId}><b>{faNum(i + 1)}</b> {e.title} <span className="muted">· {fmtDateISO(e.date)}</span></li>)}</ul>
            </>
          ) : (
            <Empty icon="exam" title="هنوز آزمونی داده نشده" text={studentView ? 'بعد از اولین آزمون، روند نمره‌هایت اینجا دیده می‌شود.' : 'بعد از اولین آزمون، نمودار اینجا ظاهر می‌شود.'} />
          )}
        </section>

        <section className="block">
          <h2>سهم درس‌ها در ۷ روز اخیر</h2>
          {total7 ? (
            <>
              <div className="stack-bar">
                {p.bySubject.map((x) => <div key={x.subjectId} style={{ flex: x.minutes, background: subject(x.subjectId)?.color }} title={`${subject(x.subjectId)?.name}: ${fmtMinutes(x.minutes)}`} />)}
              </div>
              <ul className="legend">
                {p.bySubject.sort((a, b) => b.minutes - a.minutes).map((x) => (
                  <li key={x.subjectId}><SubjectDot subject={subject(x.subjectId)} /><b>{fmtMinutes(x.minutes)}</b></li>
                ))}
              </ul>
            </>
          ) : <Empty icon="timer" title="مطالعه‌ای ثبت نشده" text="با انجام کارهای برنامه یا زمان‌سنج مطالعه، این بخش پر می‌شود." />}
        </section>
      </div>

      <section className="block">
        <h2>دقت در هر مبحث</h2>
        {p.topics.length ? (
          <>
            {weak.length > 0 && (
              <div className="callout warn">
                <Icon name="warning" size={20} />
                <span>{studentView ? 'این مبحث‌ها زیر ۶۰٪ هستند و به مرور نیاز دارند: ' : 'مبحث‌های ضعیف: '}<b>{weak.slice(0, 3).map((t) => t.name).join('، ')}</b></span>
              </div>
            )}
            <ul className="topic-list">
              {p.topics.map((t) => (
                <li key={t.topicId}>
                  <div className="topic-head"><b>{t.name}</b><SubjectDot subject={subject(t.subjectId)} label={false} /><span className={t.accuracy < 60 ? 'bad' : ''}>{faNum(t.accuracy)}٪</span></div>
                  <HBar value={t.accuracy} warn={t.accuracy < 60} color={subject(t.subjectId)?.color} />
                  <small className="muted">از {faNum(t.total)} سؤال</small>
                </li>
              ))}
            </ul>
          </>
        ) : <Empty icon="target" title="هنوز داده‌ای برای تحلیل نیست" text="بعد از چند آزمون، ضعیف‌ترین مبحث‌ها اینجا مشخص می‌شود." />}
      </section>
    </div>
  );
}

/* ── Exam result (student + counselor) ── */
export function ResultView({ data, student }) {
  const { topic, subject } = useSyllabus();
  const { exam, result: r } = data;
  const total = exam.questions.length;
  const tone = r.percent >= 70 ? 'var(--viridian)' : r.percent >= 40 ? 'var(--ochre)' : 'var(--madder)';
  const weakest = [...r.byTopic].map((t) => ({ ...t, acc: t.total ? Math.round((t.correct / t.total) * 100) : 0 })).sort((a, b) => a.acc - b.acc);
  const mins = Math.floor((r.spentSec || 0) / 60);
  return (
    <div className="stack-lg">
      <section className="result-hero sheet">
        <Ring value={r.percent} size={132} stroke={12} color="#fff" track="rgba(255,255,255,.25)">
          <b className="display big">{faNum(r.percent)}٪</b>
        </Ring>
        <div>
          <h2>{exam.title}</h2>
          <p className="muted-light">{student ? `نتیجه‌ی ${student.name}` : 'نمره با احتساب نمره‌ی منفی'}</p>
          <div className="result-stats">
            <span><b>{faNum(r.correct)}</b> درست</span>
            <span><b>{faNum(r.wrong)}</b> غلط</span>
            <span><b>{faNum(r.blank)}</b> نزده</span>
            <span><b>{faNum(mins)}</b> دقیقه</span>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>عملکرد در هر مبحث</h2>
        <ul className="topic-list">
          {weakest.map((t) => (
            <li key={t.topicId}>
              <div className="topic-head"><b>{topic(t.topicId)?.name}</b><span className={t.acc < 60 ? 'bad' : ''}>{faNum(t.correct)} از {faNum(t.total)}</span></div>
              <HBar value={t.acc} warn={t.acc < 60} color={subject(topic(t.topicId)?.subjectId)?.color} />
            </li>
          ))}
        </ul>
        {!student && weakest[0] && weakest[0].acc < 60 && (
          <Link className="btn btn-soft" to={`/s/assistant?q=${encodeURIComponent(`مبحث «${topic(weakest[0].topicId)?.name}» را برایم خلاصه توضیح بده`)}`}><Icon name="sparkle" size={18} />درباره‌ی «{topic(weakest[0].topicId)?.name}» از دستیار بپرس</Link>
        )}
      </section>

      <section className="block">
        <h2>مرور پاسخ‌ها</h2>
        <div className="qreview">
          {exam.questions.map((q, i) => {
            const a = r.answers[q.id];
            const state = a === undefined ? 'blank' : a === q.answer ? 'ok' : 'bad';
            return (
              <article key={q.id} className={`qr qr-${state}`}>
                <header>
                  <span className="qr-n">{faNum(i + 1)}</span>
                  <p>{q.text}</p>
                  <Badge tone={state === 'ok' ? 'good' : state === 'bad' ? 'bad' : 'neutral'}>{state === 'ok' ? 'درست' : state === 'bad' ? 'غلط' : 'نزده'}</Badge>
                </header>
                <ul>
                  {q.options.map((o, oi) => (
                    <li key={oi} className={`${oi === q.answer ? 'right' : ''} ${a === oi && oi !== q.answer ? 'wrong' : ''}`}>
                      {oi === q.answer ? <Icon name="check" size={16} stroke={3} /> : a === oi ? <Icon name="close" size={16} stroke={3} /> : <i />}
                      {o}
                    </li>
                  ))}
                </ul>
                {q.explanation && <details><summary>توضیح پاسخ</summary><p>{q.explanation}</p></details>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ── Practice work card (student + counselor) ── */
export function PracticeCard({ item, onOpen, showStudent }) {
  const { topic } = useSyllabus();
  return (
    <article className="pcard">
      <button className="pcard-img" onClick={() => onOpen?.(item)} aria-label={`باز کردن ${item.title}`}>
        <img src={item.image} alt={item.title} loading="lazy" />
        <Badge tone={item.status === 'pending' ? 'warn' : 'good'}>{item.status === 'pending' ? 'در انتظار بازبینی' : `نمره ${faNum(item.score ?? '—')} از ۲۰`}</Badge>
      </button>
      <div className="pcard-body">
        <b>{item.title}</b>
        <small className="muted">{showStudent && item.student ? `${item.student.name} · ` : ''}{topic(item.topicId)?.name} · {fmtDateISO(item.createdAt)}</small>
        {item.status === 'reviewed' && item.feedback && <p className="feedback"><Icon name="sparkle" size={14} /> {item.feedback}</p>}
      </div>
    </article>
  );
}
