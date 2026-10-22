import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import { Badge, Button, Empty, Field, Icon, Loading, Modal, PageHead, Spinner, useToast } from '../ui';
import { PracticeCard } from '../components';
import { fileToDataURL, useAsync, useSyllabus } from '../lib/hooks';
import { faNum } from '../lib/dates';

/* ═══════════════ بخش عملی ═══════════════ */
export function Practice() {
  const { user } = useAuth();
  const toast = useToast();
  const { subject } = useSyllabus();
  const topics = subject('practical')?.topics || [];
  const { data, loading, reload } = useAsync(() => api.listPractice(), []);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ title: '', topicId: 'draw', note: '', image: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const choose = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const image = await fileToDataURL(f);
    setForm((x) => ({ ...x, image }));
  };
  const send = async () => {
    setBusy(true);
    try {
      await api.submitPractice(form);
      toast('کارت برای مشاور فرستاده شد.');
      setOpen(false);
      setForm({ title: '', topicId: 'draw', note: '', image: '' });
      reload();
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };

  return (
    <div className="stack-lg">
      <PageHead title="بخش عملی" sub="از کار طراحی یا نقاشی‌ات عکس بگیر و برای مشاورت بفرست تا بازخورد بگیری."
        actions={<Button icon="upload" onClick={() => setOpen(true)}>فرستادن کار جدید</Button>} />
      {loading && !data ? <Loading /> : !data?.length ? (
        <Empty icon="brush" title="هنوز کاری نفرستاده‌ای" text="اولین طراحی‌ات را بفرست؛ مشاورت نمره و نکته‌هایش را همین‌جا می‌نویسد."
          action={<Button icon="upload" onClick={() => setOpen(true)}>فرستادن کار جدید</Button>} />
      ) : (
        <div className="pgrid">{data.map((p) => <PracticeCard key={p.id} item={p} onOpen={setView} />)}</div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="فرستادن کار عملی"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button><Button loading={busy} onClick={send} disabled={!form.image}>فرستادن برای مشاور</Button></>}>
        <div className="stack">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={choose} />
          {form.image ? (
            <button className="upload-preview" onClick={() => fileRef.current.click()}><img src={form.image} alt="پیش‌نمایش" /><span>تغییر عکس</span></button>
          ) : (
            <button className="upload-drop" onClick={() => fileRef.current.click()}><Icon name="image" size={34} /><b>انتخاب عکس کار</b><small>از گالری انتخاب کن یا با دوربین بگیر</small></button>
          )}
          <Field label="عنوان کار"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: طراحی طبیعت بی‌جان" /></Field>
          <Field label="نوع تمرین">
            <select className="select" value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })}>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </Field>
          <Field label="توضیح (اختیاری)"><textarea className="textarea" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="با چه ابزاری و چند دقیقه کار کردی؟" /></Field>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title} wide>
        {view && (
          <div className="stack">
            <img className="work-img" src={view.image} alt={view.title} />
            {view.note && <p className="muted">{view.note}</p>}
            {view.status === 'reviewed' ? (
              <div className="callout soft"><Icon name="sparkle" size={20} /><div><b>نمره: {faNum(view.score ?? '—')} از ۲۰</b><p>{view.feedback}</p></div></div>
            ) : <Badge tone="warn" icon="clock">منتظر بازبینی مشاور</Badge>}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ═══════════════ دستیار درسی ═══════════════ */
const SUGGEST = ['رنگ‌های مکمل چیست؟', 'پرسپکتیو را ساده توضیح بده', 'مقرنس چه کاربردی دارد؟', 'چطور برنامه‌ی مطالعه‌ام را بچینم؟'];

export function Assistant() {
  const [params, setParams] = useSearchParams();
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'سلام! من دستیار درسی کنکور هنر هستم. هر سؤال نظری‌ای داری بپرس؛ مثلاً درباره‌ی تاریخ هنر، رنگ، هندسه یا برنامه‌ریزی.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const sent = useRef(false);

  const ask = async (q) => {
    const m = (q ?? text).trim();
    if (!m || busy) return;
    setText('');
    setMsgs((x) => [...x, { role: 'me', text: m }]);
    setBusy(true);
    try {
      const r = await api.askAssistant(m, msgs.slice(-6));
      setMsgs((x) => [...x, { role: 'bot', text: r.reply }]);
    } catch (e) {
      setMsgs((x) => [...x, { role: 'bot', text: 'جواب را نتوانستم بگیرم. دوباره امتحان کن.', error: true }]);
    }
    setBusy(false);
  };

  useEffect(() => {
    const q = params.get('q');
    if (q && !sent.current) { sent.current = true; setParams({}, { replace: true }); ask(q); }
  }, []); // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  return (
    <div className="assistant">
      <PageHead title="دستیار درسی" sub="پرسش‌های نظری‌ات را بپرس." />
      <div className="chat" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === 'bot' && <span className="bot-ico"><Icon name="sparkle" size={16} /></span>}
            <p>{m.text}</p>
          </div>
        ))}
        {busy && <div className="bubble bot"><span className="bot-ico"><Icon name="sparkle" size={16} /></span><Spinner size="sm" /></div>}
        <div ref={end} />
      </div>
      {msgs.length < 3 && (
        <div className="chip-row suggest">{SUGGEST.map((s) => <button key={s} className="chip-toggle" onClick={() => ask(s)}>{s}</button>)}</div>
      )}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="سؤالت را بنویس…" aria-label="سؤال" />
        <Button type="submit" icon="send" disabled={!text.trim() || busy} aria-label="ارسال" />
      </form>
    </div>
  );
}
