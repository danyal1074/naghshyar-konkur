import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { APP_NAME, KONKUR_DATE } from '../config';
import { homeFor, useAuth } from '../auth';
import { Brand } from '../Shell';
import { Button, Icon } from '../ui';
import { useAsync } from '../lib/hooks';
import { faNum } from '../lib/dates';
import { Reveal, CountUp } from '../lib/reveal';

/* ═══════════════ Data ═══════════════ */

const LOOP = [
  { t: 'مشاور برنامه می‌نویسد', d: 'از قالب آماده شروع می‌کند و هر روز را متناسب با دانش‌آموز تنظیم می‌کند.', icon: 'edit' },
  { t: 'دانش‌آموز انجام می‌دهد', d: 'صفحه‌ی «امروز» فقط کارهای همان روز را نشان می‌دهد؛ تیک می‌زند و زمان مطالعه ثبت می‌شود.', icon: 'check' },
  { t: 'آزمون همان بخش ساخته می‌شود', d: 'مشاور مبحث را انتخاب می‌کند، سؤال‌ها از بانک سؤال یا هوش مصنوعی می‌آید.', icon: 'exam' },
  { t: 'ضعف‌ها پیدا می‌شوند', d: 'نتیجه به تفکیک مبحث تحلیل می‌شود و ضعیف‌ترین مبحث‌ها مشخص‌اند.', icon: 'chart' },
  { t: 'برنامه اصلاح می‌شود', d: 'مشاور همان‌جا برای مبحث ضعیف یک مرور به برنامه اضافه می‌کند.', icon: 'refresh' },
];

const ROLES = [
  { icon: 'home', name: 'دانش‌آموز', color: '#2b3fd6', items: ['برنامه‌ی هر روز با یک نگاه', 'آزمون با زمان‌سنج و نمره‌ی منفی', 'تحلیل مبحث‌های ضعیف', 'ارسال کار طراحی و نقاشی برای مشاور', 'دستیار هوش مصنوعی برای پرسش‌های نظری'] },
  { icon: 'users', name: 'مشاور', color: '#e5446d', items: ['برنامه‌ی هفتگی با قالب آماده و کپی هفته', 'آزمون‌ساز سه‌مرحله‌ای', 'بانک سؤال شخصی', 'گزارش وضعیت همه‌ی دانش‌آموزان', 'بازخورد روی کارهای عملی'] },
  { icon: 'chart', name: 'مدیر سامانه', color: '#1f8a70', items: ['مدیریت مشاورها و اشتراک‌ها', 'پلن‌ها بر اساس تعداد دانش‌آموز', 'تنظیمات پیامک و هوش مصنوعی', 'آمار کلی استفاده و درآمد'] },
];

const FAQS = [
  { q: 'آیا دانش‌آموز باید هزینه بپردازد؟', a: 'خیر! هزینه‌ی اشتراک را مشاور پرداخت می‌کند و دانش‌آموزان از طریق مشاور خود به صورت کاملاً رایگان به سامانه دسترسی خواهند داشت.' },
  { q: 'آیا آزمون‌ها مشابه کنکور واقعی هنر هستند؟', a: 'بله! آزمون‌ها با فرمت چهار‌گزینه‌ای، زمان‌سنج و نمره‌ی منفی (هر ۳ اشتباه = ۱ نمره منفی) دقیقاً مطابق با آزمون واقعی کنکور هنر طراحی شده‌اند.' },
  { q: 'آیا می‌توانم بدون مشاور از سامانه استفاده کنم؟', a: 'بله! دانش‌آموز می‌تواند مستقل ثبت‌نام کند و از آزمون‌ها، دستیار هوش مصنوعی و برنامه‌ریزی بهره ببرد. اما با مشاور تجربه‌ی شخصی‌سازی‌شده‌تری خواهید داشت.' },
  { q: 'چطور با مشاورم ارتباط برقرار کنم؟', a: 'سامانه دارای سیستم گفتگوی آنلاین اختصاصی بین دانش‌آموز و مشاور است. همچنین مشاور می‌تواند روی تمرین‌های عملی شما (طراحی، نقاشی و...) بازخورد دهد.' },
  { q: 'دستیار هوش مصنوعی چه کاری انجام می‌دهد؟', a: 'دستیار هوش مصنوعی به سؤالات درسی و نظری شما در حوزه‌های مختلف کنکور هنر (تاریخ هنر، خلاقیت تصویری، هنرهای تجسمی و...) پاسخ می‌دهد و می‌تواند به تولید سؤالات آزمون نیز کمک کند.' },
];

const TESTIMONIALS = [
  { name: 'سارا احمدی', role: 'رتبه ۵۳ کنکور هنر ۱۴۰۴', text: 'با نقش‌یار تونستم ضعف‌هام رو در تاریخ هنر ایران شناسایی کنم و قبل از کنکور جبران کنم. خیلی ممنونم!', avatar: '#e5446d' },
  { name: 'مهدی رضایی', role: 'مشاور کنکور هنر', text: 'مدیریت ۱۵ دانش‌آموز بدون نقش‌یار واقعاً سخت بود. الان همه چیز در یک پنل جمع شده و آزمون‌ساز هوشمندش عالیه.', avatar: '#2b3fd6' },
  { name: 'نیلوفر کریمی', role: 'داوطلب رشته سینما', text: 'بخش تمرین عملی و ارسال کارهای طراحی برای مشاور بهترین بخش سامانه‌ست. بازخورد مشاورم خیلی کمکم کرد.', avatar: '#1f8a70' },
];

/* ═══════════════ Helpers ═══════════════ */

function daysToKonkur() {
  const diff = new Date(KONKUR_DATE) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <Icon name={open ? 'minus' : 'plus'} size={20} />
      </button>
      <div className="faq-a">{open && <p>{a}</p>}</div>
    </div>
  );
}

/* ═══════════════ Landing Page ═══════════════ */

export default function Landing({ defaultSection }) {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const { data: plans } = useAsync(() => api.listPlans(), []);
  const { data: statsData } = useAsync(() => api.getPublicStats().catch(() => null), []);
  const [demoLoading, setDemoLoading] = useState('');
  const [demoErr, setDemoErr] = useState('');

  const scrollTo = (id) => (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const sec = defaultSection || (window.location.hash.includes('demo') ? 'demo' : null);
    if (sec) {
      setTimeout(() => {
        const el = document.getElementById(sec);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [defaultSection]);

  const enterDemo = async (role) => {
    setDemoLoading(role);
    setDemoErr('');
    try {
      const r = await api.demoLogin(role);
      if (r?.user) {
        setUser(r.user);
        nav(homeFor(r.user.role));
      } else {
        throw new Error('خطا در دریافت اطلاعات کاربری دمو.');
      }
    } catch (e) {
      console.error('Demo login error:', e);
      setDemoErr(e.message || 'خطا در ورود به حالت دمو. لطفاً دوباره تلاش کنید.');
    }
    setDemoLoading('');
  };

  const days = daysToKonkur();

  return (
    <div className="landing">
      {/* ── Sticky Header ── */}
      <header className="land-top">
        <Brand />
        <nav className="land-nav">
          <a href="#demo" onClick={scrollTo('demo')} className="land-nav-link land-nav-demo">🎮 تست دموی سامانه</a>
          <a href="#features" onClick={scrollTo('features')} className="land-nav-link">امکانات</a>
          <a href="#plans" onClick={scrollTo('plans')} className="land-nav-link">اشتراک</a>
          <a href="#faq" onClick={scrollTo('faq')} className="land-nav-link">سؤالات متداول</a>
        </nav>
        <div className="grow" />
        {user ? (
          <Button variant="soft" onClick={() => nav(homeFor(user.role))}>ورود به پنل</Button>
        ) : (
          <div className="row" style={{ gap: '8px' }}>
            <button type="button" onClick={scrollTo('demo')} className="btn btn-soft btn-sm" style={{ fontWeight: 700 }}>تست دمو</button>
            <Link to="/login" className="btn btn-primary">ورود / ثبت‌نام</Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="hero-land sheet">
        <div className="hero-particles" aria-hidden="true">
          {[...Array(6)].map((_, i) => <span key={i} className={`particle p${i + 1}`} />)}
        </div>

        <div className="hero-copy">
          <div className="hero-badge">
            <Icon name="calendar" size={16} />
            <span>{faNum(days)} روز تا کنکور هنر ۱۴۰۶</span>
          </div>
          <h1 className="display">کنکور هنر را<br />روی یک برگه مدیریت کن</h1>
          <p>
            مشاور برنامه می‌نویسد، دانش‌آموز تیک می‌زند، آزمون همان بخش خودکار ساخته می‌شود و ضعف‌ها پیش از روز کنکور پیدا می‌شوند.
          </p>
          <div className="hero-ctas">
            <button
              type="button"
              onClick={scrollTo('demo')}
              className="btn btn-light btn-lg hero-demo-main-btn"
            >
              <Icon name="eye" size={20} />
              تست دموی سامانه (بدون ثبت‌نام)
            </button>
            <Link to="/login" className="btn btn-outline-light btn-lg">ورود / ثبت‌نام</Link>
          </div>
          <div className="hero-demo-quick">
            <span className="hero-demo-quick-lbl">یا ورود سریع آزمایشی:</span>
            <button
              type="button"
              className="hero-quick-pill"
              disabled={!!demoLoading}
              onClick={() => enterDemo('student')}
            >
              {demoLoading === 'student' ? 'در حال ورود...' : 'دانش‌آموز هنر'}
            </button>
            <button
              type="button"
              className="hero-quick-pill"
              disabled={!!demoLoading}
              onClick={() => enterDemo('counselor')}
            >
              {demoLoading === 'counselor' ? 'در حال ورود...' : 'مشاور کنکور'}
            </button>
            <button
              type="button"
              className="hero-quick-pill"
              disabled={!!demoLoading}
              onClick={() => enterDemo('admin')}
            >
              {demoLoading === 'admin' ? 'در حال ورود...' : 'مدیر سامانه'}
            </button>
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

      {/* ── Live Stats Strip ── */}
      <Reveal>
        <section className="stats-strip">
          <div className="stat-item">
            <span className="stat-icon" style={{ background: '#e8ebff', color: '#2b3fd6' }}>
              <Icon name="users" size={24} />
            </span>
            <div>
              <b><CountUp end={statsData?.counselors || 3} suffix="+" /></b>
              <small>مشاور فعال</small>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon" style={{ background: '#dcf3ec', color: '#1f8a70' }}>
              <Icon name="home" size={24} />
            </span>
            <div>
              <b><CountUp end={statsData?.students || 6} suffix="+" /></b>
              <small>دانش‌آموز</small>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon" style={{ background: '#fbf0d4', color: '#8a6000' }}>
              <Icon name="exam" size={24} />
            </span>
            <div>
              <b><CountUp end={statsData?.exams || 6} suffix="+" /></b>
              <small>آزمون برگزار شده</small>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon" style={{ background: '#fde6eb', color: '#d63a5b' }}>
              <Icon name="bank" size={24} />
            </span>
            <div>
              <b><CountUp end={statsData?.questions || 49} suffix="+" /></b>
              <small>سؤال در بانک</small>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Interactive Demo Playground ── */}
      <section className="land-sec demo-section" id="demo">
        <Reveal>
          <div className="demo-section-head">
            <span className="demo-badge-pill">⚡ محیط آزمایشی و زنده</span>
            <h2 className="sec-heading">فضای سامانه را بدون ثبت‌نام تست کنید</h2>
            <p className="sec-sub">
              نقش مورد نظر خود را انتخاب کنید تا بلافاصله با یک کلیک وارد پنل آزمایشی شوید و تمامی امکانات را از نزدیک امتحان کنید:
            </p>
          </div>
        </Reveal>

        {demoErr && (
          <div className="callout warn" style={{ maxWidth: 700, margin: '0 auto 20px', fontSize: '.9rem' }}>
            <Icon name="warning" size={18} />
            <span>{demoErr}</span>
          </div>
        )}

        <div className="demo-grid">
          <Reveal delay={50}>
            <div className="demo-card demo-card-student">
              <div className="demo-card-top">
                <span className="demo-role-icon student">
                  <Icon name="home" size={26} />
                </span>
                <div>
                  <h3>پنل دانش‌آموز</h3>
                  <small>حساب نمونه: سارا کریمی (رشته گرافیک)</small>
                </div>
              </div>
              <p className="demo-card-desc">
                محیط اختصاصی داوطلب کنکور هنر با تمرکز بر اجرای برنامه، آزمون‌های مبحثی و رفع اشکال.
              </p>
              <ul className="demo-perks">
                <li><Icon name="check" size={16} stroke={3} /><span>صفحه «امروز» و ثبت تیک مطالعه و ساعت درس‌ها</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>شرکت در آزمون تستی با زمان‌سنج و نمره منفی</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>دستیار هوش مصنوعی برای پاسخ به سؤالات تئوری هنر</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>گفتگوی آنلاین با مشاور و ارسال کارهای عملی طراحی</span></li>
              </ul>
              <Button
                size="lg"
                variant="primary"
                className="demo-btn-student"
                loading={demoLoading === 'student'}
                onClick={() => enterDemo('student')}
              >
                ورود به دموی دانش‌آموز ←
              </Button>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="demo-card demo-card-counselor hot">
              <div className="demo-card-ribbon">محبوب‌ترین</div>
              <div className="demo-card-top">
                <span className="demo-role-icon counselor">
                  <Icon name="users" size={26} />
                </span>
                <div>
                  <h3>پنل مشاور کنکور</h3>
                  <small>حساب نمونه: مریم احمدی (مشاور ارشد)</small>
                </div>
              </div>
              <p className="demo-card-desc">
                میز کار کامل مشاور جهت برنامه‌ریزی هفتگی، آزمون‌سازی هوشمند و ارزیابی دانش‌آموزان.
              </p>
              <ul className="demo-perks">
                <li><Icon name="check" size={16} stroke={3} /><span>آزمون‌ساز سه‌مرحله‌ای با پیشنهاد هوش مصنوعی</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>مدیریت برنامه‌ریزی هفتگی و قالب‌های آماده</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>گزارش آماری دقیق از کارنامه‌ها و مباحث ضعیف</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>بررسی و نمره‌دهی به تمرین‌های طراحی و نقاشی</span></li>
              </ul>
              <Button
                size="lg"
                variant="primary"
                className="demo-btn-counselor"
                loading={demoLoading === 'counselor'}
                onClick={() => enterDemo('counselor')}
              >
                ورود به دموی مشاور ←
              </Button>
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="demo-card demo-card-admin">
              <div className="demo-card-top">
                <span className="demo-role-icon admin">
                  <Icon name="chart" size={26} />
                </span>
                <div>
                  <h3>پنل مدیریت سامانه</h3>
                  <small>حساب نمونه: مدیر نقش‌یار</small>
                </div>
              </div>
              <p className="demo-card-desc">
                داشبورد مدیریتی جهت نظارت بر اشتراک‌ها، مشاوران و تنظیمات کلان سیستم.
              </p>
              <ul className="demo-perks">
                <li><Icon name="check" size={16} stroke={3} /><span>نمای کلی سیستم، تعداد آزمون‌ها و درآمد ماهانه</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>مدیریت مشاوران و وضعیت اشتراک‌ها</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>پیکربندی هوش مصنوعی و وب‌سرویس پیامکی</span></li>
                <li><Icon name="check" size={16} stroke={3} /><span>پایش کلیه آزمون‌ها و بانک سؤالات</span></li>
              </ul>
              <Button
                size="lg"
                variant="primary"
                className="demo-btn-admin"
                loading={demoLoading === 'admin'}
                onClick={() => enterDemo('admin')}
              >
                ورود به دموی مدیر ←
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Cycle / Timeline ── */}
      <section className="land-sec" id="features">
        <Reveal>
          <h2 className="sec-heading">چرخه‌ی هفتگی که موفقیت را تضمین می‌کند</h2>
          <p className="sec-sub">هر هفته این ۵ گام تکرار می‌شود تا ضعف‌های شما قبل از کنکور شناسایی و رفع شوند.</p>
        </Reveal>
        <div className="timeline">
          {LOOP.map((s, i) => (
            <Reveal key={s.t} delay={i * 100}>
              <div className="timeline-item">
                <div className="timeline-dot">
                  <span>{faNum(i + 1)}</span>
                </div>
                {i < LOOP.length - 1 && <div className="timeline-line" />}
                <div className="timeline-card">
                  <div className="timeline-icon"><Icon name={s.icon} size={22} /></div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Wave Divider ── */}
      <div className="wave-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,64L80,58.7C160,53,320,43,480,48C640,53,800,75,960,74.7C1120,75,1280,53,1360,42.7L1440,32L1440,80L0,80Z" fill="#faf9f6" />
        </svg>
      </div>

      {/* ── Roles ── */}
      <section className="land-sec alt-bg" id="roles">
        <Reveal>
          <h2 className="sec-heading">برای هر نفر، همان چیزی که لازم دارد</h2>
        </Reveal>
        <div className="roles">
          {ROLES.map((r, i) => (
            <Reveal key={r.name} delay={i * 120}>
              <div className="role-card">
                <div className="role-card-head" style={{ borderColor: r.color }}>
                  <span className="role-card-icon" style={{ background: r.color }}><Icon name={r.icon} size={24} /></span>
                  <h3>{r.name}</h3>
                </div>
                <ul>
                  {r.items.map((item) => (
                    <li key={item}><Icon name="check" size={16} stroke={3} /><span>{item}</span></li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Wave Divider 2 ── */}
      <div className="wave-divider flip" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,64L80,58.7C160,53,320,43,480,48C640,53,800,75,960,74.7C1120,75,1280,53,1360,42.7L1440,32L1440,80L0,80Z" fill="#f6f4ef" />
        </svg>
      </div>

      {/* ── Testimonials ── */}
      <section className="land-sec">
        <Reveal>
          <h2 className="sec-heading">نظرات کاربران نقش‌یار</h2>
        </Reveal>
        <div className="testimonials">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 120}>
              <div className="testimonial-card">
                <div className="testimonial-quote">"</div>
                <p>{t.text}</p>
                <div className="testimonial-author">
                  <span className="testimonial-avatar" style={{ background: t.avatar }}>{t.name[0]}</span>
                  <div>
                    <b>{t.name}</b>
                    <small>{t.role}</small>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="land-sec alt-bg" id="plans">
        <Reveal>
          <h2 className="sec-heading">پلن‌های اشتراک مشاورین</h2>
          <p className="sec-sub">دانش‌آموزها از طریق مشاور خود به صورت رایگان به سامانه دسترسی خواهند داشت.</p>
        </Reveal>
        <div className="plans-landing">
          {(plans || []).map((p, i) => (
            <Reveal key={p.id} delay={i * 100}>
              <div className={`plan-land ${p.id === 'pro' ? 'hot' : ''}`}>
                {p.id === 'pro' && <div className="plan-ribbon">پیشنهاد ویژه</div>}
                <h3>{p.name}</h3>
                <div className="plan-price">
                  <b>{p.priceText || (p.price ? `${faNum(p.price)}` : 'رایگان')}</b>
                  {p.price > 0 && <small>تومان / ماهانه</small>}
                </div>
                {p.desc && <p className="muted sm">{p.desc}</p>}
                <ul>
                  {p.perks.map((x) => (
                    <li key={x}><Icon name="check" size={16} stroke={3} /><span>{x}</span></li>
                  ))}
                </ul>
                <Link to="/login" className={`btn ${p.id === 'pro' ? 'btn-primary' : 'btn-soft'} btn-block`}>
                  {p.id === 'trial' ? 'شروع رایگان' : 'انتخاب و ثبت‌نام'}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="land-sec" id="faq">
        <Reveal>
          <h2 className="sec-heading">سؤالات متداول</h2>
          <p className="sec-sub">پاسخ سؤالاتی که بیشتر پرسیده می‌شوند.</p>
        </Reveal>
        <Reveal delay={100}>
          <div className="faq-list">
            {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </Reveal>
      </section>

      {/* ── CTA Banner ── */}
      <Reveal>
        <section className="cta-banner sheet">
          <div className="hero-particles" aria-hidden="true">
            {[...Array(4)].map((_, i) => <span key={i} className={`particle p${i + 1}`} />)}
          </div>
          <h2 className="display">آماده‌ای شروع کنی؟</h2>
          <p>همین الان ثبت‌نام کن و ۱۴ روز رایگان تمام امکانات سامانه را تجربه کن.</p>
          <Link to="/login" className="btn btn-light btn-lg">شروع رایگان</Link>
        </section>
      </Reveal>

      {/* ── Footer ── */}
      <footer className="land-footer">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <Brand />
            <p className="muted sm">سامانه هوشمند مشاوره و آزمون کنکور هنر، مخصوص داوطلبان و مشاوران سراسر ایران.</p>
          </div>
          <div className="footer-col">
            <h4>دسترسی سریع</h4>
            <ul>
              <li><Link to="/login">ورود / ثبت‌نام</Link></li>
              <li><a href="#features" onClick={scrollTo('features')}>امکانات سامانه</a></li>
              <li><a href="#plans" onClick={scrollTo('plans')}>پلن‌های اشتراک</a></li>
              <li><a href="#faq" onClick={scrollTo('faq')}>سؤالات متداول</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>درباره کنکور هنر</h4>
            <ul>
              <li><a href="#roles" onClick={scrollTo('roles')}>رشته‌ی گرافیک</a></li>
              <li><a href="#roles" onClick={scrollTo('roles')}>رشته‌ی نقاشی</a></li>
              <li><a href="#roles" onClick={scrollTo('roles')}>رشته‌ی سینما</a></li>
              <li><a href="#roles" onClick={scrollTo('roles')}>رشته‌ی صنایع دستی</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>تماس با ما</h4>
            <ul>
              <li className="footer-contact"><Icon name="chat" size={16} /><span>پشتیبانی آنلاین در سامانه</span></li>
              <li className="footer-contact"><Icon name="calendar" size={16} /><span>{faNum(days)} روز تا کنکور هنر ۱۴۰۶</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <Brand small />
          <span className="muted sm">© ۱۴۰۵ {APP_NAME} — تمامی حقوق محفوظ است</span>
        </div>
      </footer>
    </div>
  );
}
