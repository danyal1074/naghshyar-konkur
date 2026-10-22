import { useState } from 'react';
import api from '../api';
import { Avatar, Badge, Button, ErrorBox, Field, Icon, Loading, Modal, PageHead, useConfirm, useToast } from '../ui';
import { useAsync } from '../lib/hooks';
import { daysUntil, faNum, fmtDateISO } from '../lib/dates';

const ST = { active: { tone: 'good', label: 'فعال' }, suspended: { tone: 'bad', label: 'معلق' } };

/* ═══════════════ نمای کلی و مشاورها ═══════════════ */
export function AdminHome() {
  const toast = useToast();
  const confirm = useConfirm();
  const stats = useAsync(() => api.getAdminStats(), []);
  const list = useAsync(() => api.listCounselors(), []);
  const plans = useAsync(() => api.listPlans(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', plan: 'trial' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (list.error && !list.data) return <ErrorBox error={list.error} onRetry={list.reload} />;
  if (!list.data || !stats.data) return <Loading />;
  const s = stats.data;
  const planName = (id) => plans.data?.find((p) => p.id === id)?.name || '—';

  const toggle = async (c) => {
    const suspend = c.status === 'active';
    const ok = await confirm({
      title: suspend ? `تعلیق ${c.name}؟` : `فعال‌سازی ${c.name}؟`,
      text: suspend ? 'مشاور و دانش‌آموزانش دیگر نمی‌توانند وارد شوند تا دوباره فعال شود.' : 'مشاور دوباره می‌تواند وارد شود.',
      confirmLabel: suspend ? 'تعلیق' : 'فعال‌سازی', danger: suspend,
    });
    if (ok) { await api.updateCounselor(c.id, { status: suspend ? 'suspended' : 'active' }); toast(suspend ? 'مشاور معلق شد.' : 'مشاور فعال شد.'); list.reload(); stats.reload(); }
  };
  const changePlan = async (c, plan) => { await api.updateCounselor(c.id, { plan }); toast('پلن تغییر کرد.'); list.reload(); stats.reload(); };
  const create = async () => {
    setBusy(true); setErr('');
    try {
      await api.createCounselor(form);
      toast('مشاور اضافه شد.');
      setOpen(false); setForm({ name: '', phone: '', plan: 'trial' });
      list.reload(); stats.reload();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="stack-lg">
      <PageHead title="نمای کلی" sub="وضعیت مشاورها، دانش‌آموزان و اشتراک‌ها."
        actions={<Button icon="plus" onClick={() => setOpen(true)}>افزودن مشاور</Button>} />
      <div className="statstrip">
        <div><small>مشاورهای فعال</small><b>{faNum(s.activeCounselors)} از {faNum(s.counselors)}</b></div>
        <div><small>دانش‌آموزان</small><b>{faNum(s.students)}</b></div>
        <div><small>آزمون‌های ساخته‌شده</small><b>{faNum(s.exams)}</b></div>
        <div><small>درآمد ماهانه (تومان)</small><b>{faNum(s.monthlyRevenue)}</b></div>
      </div>

      <section className="block">
        <h2>مشاورها</h2>
        <div className="list flat">
          {list.data.map((c) => {
            const left = c.renewAt ? daysUntil(c.renewAt) : null;
            return (
              <div key={c.id} className="list-row counselor-row">
                <Avatar user={c} size={42} />
                <div className="grow">
                  <b>{c.name}</b>
                  <small className="muted"><span className="ltr-inline">{c.phone}</span> · {faNum(c.studentCount)} دانش‌آموز · {faNum(c.examCount)} آزمون</small>
                </div>
                <select className="select compact" value={c.plan} onChange={(e) => changePlan(c, e.target.value)} aria-label={`پلن ${c.name}`}>
                  {(plans.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="score-col"><small>تمدید</small><b className={left !== null && left <= 7 ? 'bad' : ''}>{c.renewAt ? fmtDateISO(c.renewAt) : '—'}</b></div>
                <Badge tone={ST[c.status].tone}>{ST[c.status].label}</Badge>
                <Button variant="ghost" size="sm" onClick={() => toggle(c)}>{c.status === 'active' ? 'تعلیق' : 'فعال‌سازی'}</Button>
              </div>
            );
          })}
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="افزودن مشاور"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button><Button loading={busy} onClick={create} disabled={!form.name || !form.phone}>افزودن</Button></>}>
        <div className="stack">
          <Field label="نام و نام خانوادگی"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="شماره موبایل" error={err}><input className="input ltr" inputMode="numeric" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="پلن"><select className="select" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>{(plans.data || []).map((p) => <option key={p.id} value={p.id}>{p.name} · تا {faNum(p.studentLimit)} دانش‌آموز</option>)}</select></Field>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════ پلن‌ها ═══════════════ */
export function AdminPlans() {
  const { data, error, reload } = useAsync(() => api.listPlans(), []);
  const counselors = useAsync(() => api.listCounselors(), []);
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <div className="stack-lg">
      <PageHead title="پلن‌های اشتراک" sub="اشتراک را مشاور می‌خرد و سقف تعداد دانش‌آموزش را تعیین می‌کند." />
      <div className="plans-grid">
        {data.map((p) => {
          const n = (counselors.data || []).filter((c) => c.plan === p.id).length;
          return (
            <section key={p.id} className={`plan-card ${p.id === 'pro' ? 'hot' : ''}`}>
              <h3>{p.name}</h3>
              <div className="price"><b>{p.priceText || (p.price ? `${faNum(p.price)} تومان` : 'تماس بگیرید')}</b></div>
              {p.desc && <p className="muted sm">{p.desc}</p>}
              <ul>{p.perks.map((x) => <li key={x}><Icon name="check" size={16} stroke={3} />{x}</li>)}</ul>
              <p className="muted sm">{faNum(n)} مشاور در این پلن</p>
            </section>
          );
        })}
      </div>
      <div className="callout soft"><Icon name="warning" size={20} /><span>قیمت‌ها و سقف‌ها در نسخه‌ی نمایشی ثابت‌اند. در نسخه‌ی اصلی از بک‌اند خوانده می‌شوند (GET /plans).</span></div>
    </div>
  );
}
