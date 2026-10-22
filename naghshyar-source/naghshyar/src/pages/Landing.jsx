import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { APP_NAME, USE_MOCK } from '../config';
import { homeFor, useAuth } from '../auth';
import { Brand } from '../Shell';
import { Button, Icon } from '../ui';
import { useAsync } from '../lib/hooks';
import { faNum } from '../lib/dates';

const LOOP = [
  { t: 'مشاور برنامه می‌نویسد', d: 'از قالب آماده شروع می‌کند و هر روز را متناسب با دانش‌آموز تنظیم می‌کند.' },
  { t: 'دانش‌آموز انجام می‌دهد', d: 'صفحه‌ی «امروز» فقط کارهای همان روز را نشان می‌دهد؛ تیک می‌زند و زمان مطالعه ثبت می‌شود.' },
  { t: 'آزمون همان بخش ساخته می‌شود', d: 'مشاور مبحث را انتخاب می‌کند، سؤال‌ها از بانک سؤال یا پیش‌نویس هوش مصنوعی می‌آید و او تأیید می‌کند.' },
  { t: 'ضعف‌ها پیدا می‌شوند', d: 'نتیجه به تفکیک مبحث تحلیل می‌شود و ضعیف‌ترین مبحث‌ها مشخص‌اند.' },
  { t: 'برنامه‌ی بعد اصلاح می‌شود', d: 'مشاور همان‌جا برای مبحث ضعیف یک مرور به برنامه اضافه می‌کند.' },
];

const ROLES = [
  { icon: 'home', name: 'دانش‌آموز', items: ['برنامه‌ی هر روز با یک نگاه', 'آزمون با زمان‌سنج و نمره‌ی منفی', 'تحلیل مبحث‌های ضعیف', 'ارسال کار طراحی و نقاشی برای مشاور', 'دستیار درسی برای پرسش‌های نظری'] },
  { icon: 'users', name: 'مشاور', items: ['برنامه‌ی هفتگی با قالب آماده و کپی هفته', 'آزمون‌ساز سه‌مرحله‌ای', 'بانک سؤال شخصی', 'گزارش وضعیت همه‌ی دانش‌آموزان', 'بازخورد روی کارهای عملی'] },
  { icon: 'chart', name: 'مدیر سامانه', items: ['مدیریت مشاورها و اشتراک‌ها', 'پلن‌ها بر اساس تعداد دانش‌آموز', 'آمار کلی استفاده'] },
];

export default function Landing() {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const { data: plans } = useAsync(() => api.listPlans(), []);
  const demo = async (role) => {
    const r = await api.demoLogin(role);
    setUser(r.user);
    nav(homeFor(role));
  };
  return (
    <div className="landing">
      <header className="land-top">
        <Brand />
        <div className="grow" />
        {user ? (
          <Button variant="soft" onClick={() => nav(homeFor(user.role))}>ورود به سامانه</Button>
        ) : (
          <Link to="/login" className="btn btn-soft">ورود</Link>
        )}
      </header>

      <section className="hero-land sheet">
        <div className="hero-copy">
          <h1 className="display">کنکور هنر را روی یک برگه مدیریت کن</h1>
          <p>
            مشاور برنامه می‌نویسد، دانش‌آموز تیک می‌زند، آزمون همان بخش خودکار ساخته می‌شود و ضعف‌ها پیش از روز کنکور پیدا می‌شوند.
          </p>
          <div className="row wrap">
            <Button size="lg" variant="light" onClick={() => demo('student')}>دیدن از نگاه دانش‌آموز</Button>
            <Button size="lg" variant="outline-light" onClick={() => demo('counselor')}>دیدن از نگاه مشاور</Button>
          </div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          <div className="pv-head">
            <div>
              <small>سه‌شنبه</small>
              <b>امروز</b>
            </div>
            <div className="pv-ring">
              <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="#e8ebff" strokeWidth="7" /><circle cx="32" cy="32" r="27" fill="none" stroke="#2b3fd6" strokeWidth="7" strokeLinecap="round" strokeDasharray="170" strokeDashoffset="68" transform="rotate(-90 32 32)" /></svg>
              <span>۶۰٪</span>
            </div>
          </div>
          {[
            ['تاریخ هنر ایران', 'مطالعه · ۹۰ دقیقه', '#2b3fd6', true],
            ['هندسه و تناسب', 'مطالعه · ۷۵ دقیقه', '#1f8a70', true],
            ['طراحی با مداد', 'تمرین عملی · ۹۰ دقیقه', '#e8742a', false],
          ].map(([t, s, c, done]) => (
            <div className={`pv-task ${done ? 'done' : ''}`} key={t}>
              <span className="pv-check" style={done ? { background: c, borderColor: c } : { borderColor: c }}>{done && <Icon name="check" size={14} stroke={3} />}</span>
              <div>
                <b>{t}</b>
                <small>{s}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="land-sec">
        <h2>چرخه‌ای که هر هفته تکرار می‌شود</h2>
        <ol className="loop">
          {LOOP.map((s, i) => (
            <li key={s.t}>
              <span className="loop-n">{faNum(i + 1)}</span>
              <div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="land-sec">
        <h2>برای هر نفر، همان چیزی که لازم دارد</h2>
        <div className="roles">
          {ROLES.map((r) => (
            <div className="role-col" key={r.name}>
              <h3><Icon name={r.icon} size={22} />{r.name}</h3>
              <ul>{r.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section className="land-sec">
        <h2>پلن‌های اشتراک مشاورین</h2>
        <p className="muted">دانش‌آموزها از طریق مشاور خود به صورت رایگان به سامانه دسترسی خواهند داشت. برای فعال‌سازی پنل مشاور با ما در ارتباط باشید.</p>
        <div className="price-rows">
          {(plans || []).map((p) => (
            <div className={`price-row ${p.id === 'pro' ? 'hot' : ''}`} key={p.id}>
              <div className="grow">
                <h3>{p.name}</h3>
                {p.desc && <p className="muted sm pad-s">{p.desc}</p>}
                <ul className="inline-list">{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div className="price">
                <b>{p.priceText || (p.price ? `${faNum(p.price)} تومان` : 'تماس بگیرید')}</b>
                {p.id === 'trial' ? <small>۱۴ روز هدیه</small> : <small>اشتراک دوره‌ای</small>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="land-foot">
        <Brand small />
        <span className="muted">{APP_NAME} · نسخه‌ی نمایشی</span>
      </footer>
    </div>
  );
}
