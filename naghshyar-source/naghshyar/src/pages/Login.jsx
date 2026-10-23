import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api';
import { USE_MOCK, DEMO_OTP, APP_TAGLINE } from '../config';
import { ROLE_LABEL, homeFor, useAuth } from '../auth';
import { Brand } from '../Shell';
import { Button, Field, Icon, Seg } from '../ui';
import { FIELDS } from '../api/seed';

export default function Login() {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'code' | 'profile'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [profile, setProfile] = useState({ name: '', role: 'student', field: 'گرافیک' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const cleanNum = (str) =>
    String(str || '')
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/\s+/g, '');

  const send = async (e) => {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await api.sendOtp(cleanNum(phone));
      setIsNew(Boolean(res?.isNew));
      setStep('code');
      setLeft(120);
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };

  const verify = async (e) => {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api.verifyOtp(cleanNum(phone), cleanNum(code));
      if (r?.needsProfile || isNew) {
        setStep('profile');
      } else if (r?.user) {
        setUser(r.user);
        nav(homeFor(r.user.role));
      }
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };

  const completeSignup = async (e) => {
    e?.preventDefault();
    if (!profile.name.trim()) {
      setErr('لطفاً نام و نام خانوادگی خود را وارد کنید.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const r = await api.verifyOtp(phone, code, profile);
      if (r?.user) {
        setUser(r.user);
        nav(homeFor(r.user.role));
      }
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };

  const demo = async (role) => {
    const r = await api.demoLogin(role);
    setUser(r.user);
    nav(homeFor(role));
  };

  return (
    <div className="login">
      <aside className="login-art sheet">
        <Link to="/"><Brand /></Link>
        <p className="display">{APP_TAGLINE}</p>
        <p className="sm" style={{ opacity: 0.85, maxWidth: 360 }}>
          ویژه داوطلبان کنکور هنر (مطالعه مستقل یا با مشاور) و مشاورین آموزشی سراسر کشور.
        </p>
      </aside>
      <main className="login-form">
        <div className="login-box">
          <Link to="/" className="login-mobile-brand"><Brand /></Link>
          <h1>{step === 'profile' ? 'تکمیل مشخصات کاربری' : 'ورود / ثبت‌نام در سامانه'}</h1>

          {step === 'phone' && (
            <form onSubmit={send} className="stack">
              <p className="muted">
                شماره موبایل خود را وارد کنید. کد تأیید ورود برای شما ارسال می‌شود. اگر حساب نداشته باشید، عضویت شما به‌صورت خودکار ایجاد می‌شود.
              </p>
              <Field label="شماره موبایل" error={err}>
                <input
                  className="input ltr"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={phone}
                  onChange={(e) => setPhone(cleanNum(e.target.value))}
                  autoFocus
                />
              </Field>
              <Button size="lg" block loading={busy} type="submit" disabled={cleanNum(phone).length < 10}>
                دریافت کد تأیید
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verify} className="stack">
              <p className="muted">
                کد ۵ رقمی ارسال‌شده به شماره‌ی <b className="ltr-inline">{phone}</b> را وارد کنید.
              </p>
              <Field label="کد تأیید" error={err} hint="کد ۵ رقمی پیامک‌شده را وارد کنید (کد تستی سریع: ۱۲۳۴۵)">
                <input
                  className="input ltr otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={5}
                  placeholder="•••••"
                  value={code}
                  onChange={(e) => setCode(cleanNum(e.target.value))}
                  autoFocus
                />
              </Field>
              <Button size="lg" block loading={busy} type="submit" disabled={cleanNum(code).length < 5}>
                تأیید و ادامه
              </Button>
              <div className="row between">
                <button type="button" className="link" onClick={() => { setStep('phone'); setCode(''); setErr(''); }}>
                  اصلاح شماره
                </button>
                <button type="button" className="link" disabled={left > 0} onClick={send}>
                  {left > 0 ? `ارسال دوباره (${left})` : 'ارسال دوباره'}
                </button>
              </div>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={completeSignup} className="stack">
              <p className="muted">لطفاً مشخصات اولیه خود را وارد کنید تا پنل کاربری شما متناسب با هدفتان آماده شود.</p>
              <Field label="نام و نام خانوادگی" error={err}>
                <input
                  className="input"
                  placeholder="مثال: مریم کریمی"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  autoFocus
                />
              </Field>

              <Field label="نوع حساب کاربری">
                <Seg
                  value={profile.role}
                  onChange={(r) => setProfile({ ...profile, role: r })}
                  options={[
                    { value: 'student', label: 'داوطلب کنکور هنر (مستقل / آزاد)' },
                    { value: 'counselor', label: 'مشاور کنکور هنر' },
                  ]}
                />
              </Field>

              {profile.role === 'student' && (
                <Field label="رشته‌ی هدف در کنکور هنر">
                  <select
                    className="select"
                    value={profile.field}
                    onChange={(e) => setProfile({ ...profile, field: e.target.value })}
                  >
                    {FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Button size="lg" block loading={busy} type="submit" disabled={!profile.name.trim()}>
                ورود به سامانه
              </Button>
            </form>
          )}

          <div className="demo-box">
            <h3>ورود سریع با حساب‌های نمونه</h3>
            <div className="stack-sm">
              {['student', 'counselor', 'admin'].map((r) => (
                <button key={r} className="demo-btn" onClick={() => demo(r)}>
                  <Icon name={{ student: 'home', counselor: 'users', admin: 'chart' }[r]} size={20} />
                  <span>{ROLE_LABEL[r]}</span>
                  <small>{{ student: 'سارا کریمی (دانش‌آموز)', counselor: 'مریم احمدی (مشاور)', admin: 'مدیر سامانه' }[r]}</small>
                  <Icon name="next" size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}