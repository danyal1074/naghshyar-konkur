import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import { NEGATIVE_MARK_EVERY } from '../config';
import { Badge, Button, ChipToggle, Empty, ErrorBox, Field, Icon, Loading, Modal, PageHead, useConfirm } from '../ui';
import { ProgressView, ResultView } from '../components';
import { useAsync, useSyllabus } from '../lib/hooks';
import { faNum, fmtClock, fmtDateISO, relativeDay } from '../lib/dates';

/* ═══════════════ فهرست آزمون‌ها ═══════════════ */
export function Exams() {
  const nav = useNavigate();
  const { topic, subjects } = useSyllabus();
  const { data, loading, error, reload } = useAsync(() => api.listExams(), []);
  const [selfOpen, setSelfOpen] = useState(false);
  const [topicIds, setTopicIds] = useState(['iran_art', 'basics']);
  const [qCount, setQCount] = useState(10);
  const [busy, setBusy] = useState(false);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const fresh = data.filter((e) => e.status === 'new');
  const done = data.filter((e) => e.status === 'done');

  const toggleTopic = (id) => {
    setTopicIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const startSelfExam = async () => {
    if (!topicIds.length) return;
    setBusy(true);
    try {
      const res = await api.createSelfExam({ topicIds, count: qCount });
      setSelfOpen(false);
      nav(`/s/exams/${res.id}`);
    } catch (e) {
      alert(e.message);
    }
    setBusy(false);
  };

  const theorySubjects = subjects.filter((s) => s.id !== 'practical');

  return (
    <div className="stack-lg">
      <PageHead
        title="آزمون‌ها"
        sub="آزمون‌های برنامه‌ریزی‌شده و آزمون‌های خودسنجی کنکور هنر با محاسبه نمره‌ی منفی."
        actions={<Button icon="plus" onClick={() => setSelfOpen(true)}>ساخت آزمون خودسنجی</Button>}
      />
      <section>
        <h2 className="sec-title">آزمون‌های جدید</h2>
        {fresh.length === 0 ? (
          <Empty
            icon="exam"
            title="آزمون جدیدی نداری"
            text="می‌توانی خودت یک آزمون تستی از مباحث دلخواه بسازی و شرکت کنی."
            action={<Button icon="plus" onClick={() => setSelfOpen(true)}>ساخت آزمون خودسنجی</Button>}
          />
        ) : (
          <div className="list">
            {fresh.map((e) => (
              <article className="list-row" key={e.id}>
                <div className="grow">
                  <b>{e.title}</b>
                  <small className="muted">{e.topicIds.map((t) => topic(t)?.name).filter(Boolean).slice(0, 3).join('، ')}</small>
                  <div className="meta-row">
                    <span><Icon name="list" size={14} /> {faNum(e.questionCount)} سؤال</span>
                    <span><Icon name="clock" size={14} /> {faNum(e.durationMin)} دقیقه</span>
                    {e.deadline && <span className={e.overdue ? 'bad' : ''}><Icon name="calendar" size={14} /> {e.overdue ? 'مهلت گذشته' : `تا ${fmtDateISO(e.deadline)}`}</span>}
                  </div>
                </div>
                <Link className="btn btn-primary" to={`/s/exams/${e.id}`}>شروع آزمون</Link>
              </article>
            ))}
          </div>
        )}
      </section>
      {done.length > 0 && (
        <section>
          <h2 className="sec-title">آزمون‌های انجام‌شده</h2>
          <div className="list">
            {done.map((e) => (
              <article className="list-row" key={e.id}>
                <div className="grow">
                  <b>{e.title}</b>
                  <small className="muted">{relativeDay(e.finishedAt)} · {faNum(e.questionCount)} سؤال</small>
                </div>
                <Badge tone={e.score >= 70 ? 'good' : e.score >= 40 ? 'warn' : 'bad'}>{faNum(e.score)}٪</Badge>
                <Link className="btn btn-soft btn-sm" to={`/s/exams/${e.id}/result`}>مرور پاسخ‌ها</Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={selfOpen}
        onClose={() => setSelfOpen(false)}
        title="ساخت آزمون خودسنجی"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelfOpen(false)}>انصراف</Button>
            <Button loading={busy} onClick={startSelfExam} disabled={!topicIds.length}>
              شروع آزمون
            </Button>
          </>
        }
      >
        <div className="stack">
          <p className="muted sm">مباحث مورد نظرت را برای سنجش انتخاب کن تا آزمون با زمان‌سنج و نمره منفی ساخته شود:</p>
          <Field label="تعداد سؤالات">
            <div className="chip-row">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip-toggle ${qCount === n ? 'on' : ''}`}
                  onClick={() => setQCount(n)}
                >
                  {faNum(n)} سؤال
                </button>
              ))}
            </div>
          </Field>
          <Field label="مباحث آزمون">
            <div className="stack-sm">
              {theorySubjects.map((s) => (
                <div key={s.id} className="block" style={{ padding: 12 }}>
                  <b style={{ color: s.color }}>{s.name}</b>
                  <div className="chip-row wrap" style={{ marginTop: 6 }}>
                    {s.topics.map((t) => (
                      <ChipToggle
                        key={t.id}
                        on={topicIds.includes(t.id)}
                        color={s.color}
                        onClick={() => toggleTopic(t.id)}
                      >
                        {t.name}
                      </ChipToggle>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════ شرکت در آزمون ═══════════════ */
export function TakeExam() {
  const { id } = useParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const { data: exam, error, reload } = useAsync(() => api.getExam(id), [id]);
  const [phase, setPhase] = useState('intro');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remain, setRemain] = useState(0);
  const [busy, setBusy] = useState(false);
  const endAt = useRef(0);
  const startedAt = useRef(0);
  const ref = useRef({});
  ref.current = { answers, exam };

  useEffect(() => { if (exam?.alreadyDone) nav(`/s/exams/${id}/result`, { replace: true }); }, [exam]); // eslint-disable-line

  const submit = async (auto = false) => {
    setBusy(true);
    try {
      await api.submitExam(id, ref.current.answers, (Date.now() - startedAt.current) / 1000);
      nav(`/s/exams/${id}/result`, { replace: true });
    } catch (e) {
      setBusy(false);
      alert(e.message); // eslint-disable-line no-alert
    }
    return auto;
  };

  useEffect(() => {
    if (phase !== 'run') return undefined;
    const t = setInterval(() => {
      const r = Math.round((endAt.current - Date.now()) / 1000);
      setRemain(Math.max(0, r));
      if (r <= 0) { clearInterval(t); submit(true); }
    }, 500);
    return () => clearInterval(t);
  }, [phase]); // eslint-disable-line

  if (error && !exam) return <ErrorBox error={error} onRetry={reload} />;
  if (!exam) return <Loading />;
  const qs = exam.questions;
  const q = qs[idx];
  const answered = Object.keys(answers).length;

  const begin = () => {
    startedAt.current = Date.now();
    endAt.current = Date.now() + exam.durationMin * 60 * 1000;
    setRemain(exam.durationMin * 60);
    setPhase('run');
  };
  const pick = (oi) => setAnswers((a) => (a[q.id] === oi ? Object.fromEntries(Object.entries(a).filter(([k]) => k !== q.id)) : { ...a, [q.id]: oi }));
  const finish = async () => {
    const blank = qs.length - answered;
    const ok = await confirm({
      title: 'پایان آزمون؟',
      text: blank ? `${faNum(blank)} سؤال را پاسخ نداده‌ای. بعد از پایان نمی‌توانی برگردی.` : 'همه‌ی سؤال‌ها پاسخ داده شده. بعد از پایان نمی‌توانی برگردی.',
      confirmLabel: 'پایان آزمون',
    });
    if (ok) submit();
  };

  if (phase === 'intro') {
    return (
      <div className="narrow-page stack-lg">
        <PageHead title={exam.title} sub="قبل از شروع، این چند نکته را بخوان." />
        <section className="block">
          <ul className="facts">
            <li><Icon name="list" size={20} /><span><b>{faNum(qs.length)} سؤال</b> چهارگزینه‌ای</span></li>
            <li><Icon name="clock" size={20} /><span>زمان آزمون <b>{faNum(exam.durationMin)} دقیقه</b> است و با شروع، زمان‌سنج روشن می‌شود.</span></li>
            <li><Icon name="warning" size={20} /><span>نمره‌ی منفی دارد: هر <b>{faNum(NEGATIVE_MARK_EVERY)} پاسخ غلط</b> یک پاسخ درست را از بین می‌برد. اگر مطمئن نیستی، رد شو.</span></li>
            <li><Icon name="refresh" size={20} /><span>می‌توانی بین سؤال‌ها جابه‌جا شوی و پاسخ را تغییر دهی.</span></li>
          </ul>
          <Button size="lg" block onClick={begin}>شروع آزمون</Button>
        </section>
      </div>
    );
  }

  return (
    <div className="exam-run">
      <header className="exam-bar">
        <span className="muted">سؤال <b>{faNum(idx + 1)}</b> از {faNum(qs.length)}</span>
        <span className={`exam-timer ${remain <= 60 ? 'low' : ''}`}><Icon name="clock" size={18} />{fmtClock(remain)}</span>
      </header>
      <div className="progress-line"><div style={{ width: `${((idx + 1) / qs.length) * 100}%` }} /></div>

      <section className="question">
        <h2>{q.text}</h2>
        <div className="options" role="radiogroup" aria-label="گزینه‌ها">
          {q.options.map((o, oi) => (
            <button key={oi} role="radio" aria-checked={answers[q.id] === oi} className={`opt ${answers[q.id] === oi ? 'on' : ''}`} onClick={() => pick(oi)}>
              <span className="opt-n">{faNum(oi + 1)}</span>
              {o}
            </button>
          ))}
        </div>
        <p className="muted sm">{answers[q.id] === undefined ? 'پاسخ ندادن مشکلی ندارد. روی گزینه‌ی انتخاب‌شده دوباره بزن تا پاک شود.' : 'روی همین گزینه دوباره بزن تا پاسخ پاک شود.'}</p>
      </section>

      <div className="qmap" aria-label="فهرست سؤال‌ها">
        {qs.map((x, i) => <button key={x.id} className={`${i === idx ? 'cur' : ''} ${answers[x.id] !== undefined ? 'ans' : ''}`} onClick={() => setIdx(i)} aria-label={`سؤال ${i + 1}`}>{faNum(i + 1)}</button>)}
      </div>

      <footer className="exam-foot">
        <Button variant="ghost" iconEnd={undefined} icon="prev" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>قبلی</Button>
        {idx < qs.length - 1
          ? <Button iconEnd="next" onClick={() => setIdx(idx + 1)}>بعدی</Button>
          : <Button loading={busy} icon="flag" onClick={finish}>پایان آزمون</Button>}
        {idx < qs.length - 1 && <Button variant="soft" loading={busy} onClick={finish}>پایان</Button>}
      </footer>
    </div>
  );
}

/* ═══════════════ نتیجه (دانش‌آموز و مشاور) ═══════════════ */
export function ExamResultPage() {
  const { id, studentId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data, error, reload } = useAsync(() => api.getResult(id, studentId), [id, studentId]);
  const isStudent = user.role === 'student';
  const back = isStudent ? '/s/exams' : `/c/exams/${id}`;
  return (
    <div className="stack-lg">
      <PageHead title="نتیجه‌ی آزمون" back={<button className="link back" onClick={() => nav(back)}><Icon name="prev" size={16} />{isStudent ? 'همه‌ی آزمون‌ها' : 'نتایج آزمون'}</button>} />
      {error && !data ? <ErrorBox error={error} onRetry={reload} /> : !data ? <Loading /> : <ResultView data={data} student={isStudent ? null : data.student} />}
    </div>
  );
}

/* ═══════════════ پیشرفت ═══════════════ */
export function Progress() {
  const { user } = useAuth();
  return (
    <div className="stack-lg">
      <PageHead title="پیشرفت من" sub="ببین کجا خوب پیش می‌روی و کدام مبحث‌ها به مرور نیاز دارند." />
      <ProgressView studentId={user.id} />
    </div>
  );
}
