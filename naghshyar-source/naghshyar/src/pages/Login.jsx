import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api';
import { APP_TAGLINE } from '../config';
import { ROLE_LABEL, homeFor, useAuth } from '../auth';
import { Brand } from '../Shell';
import { Button, Field, Icon, Seg } from '../ui';
import { FIELDS } from '../api/seed';

export default function Login() {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  
  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regNationalId, setRegNationalId] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regField, setRegField] = useState('گرافیک');
  
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const cleanDigits = (str) =>
    String(str || '')
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/\s+/g, '');

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) {
      setErr('لطفاً نام کاربری یا شماره موبایل خود را وارد کنید.');
      return;
    }
    if (!loginPassword.trim()) {
      setErr('لطفاً رمز عبور خود را وارد کنید.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const res = await api.login(identifier.trim(), loginPassword.trim());
      if (res?.user) {
        setUser(res.user);
        nav(homeFor(res.user.role));
      }
    } catch (x) {
      setErr(x.message || 'نام کاربری یا رمز عبور نادرست است.');
    }
    setBusy(false);
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!regName.trim()) {
      setErr('لطفاً نام و نام خانوادگی خود را وارد کنید.');
      return;
    }
    const cleanPhone = cleanDigits(regPhone);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setErr('لطفاً شماره موبایل ۱۱ رقمی معتبر وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹).');
      return;
    }
    const cleanNat = cleanDigits(regNationalId);
    if (cleanNat && !/^\d{10}$/.test(cleanNat)) {
      setErr('کد ملی باید ۱۰ رقم باشد.');
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 4) {
      setErr('رمز عبور باید حداقل ۴ نویسه باشد.');
      return;
    }

    setErr('');
    setBusy(true);
    try {
      const res = await api.register({
        name: regName.trim(),
        phone: cleanPhone,
        national_id: cleanNat || null,
        password: regPassword.trim(),
        role: regRole,
        field: regRole === 'student' ? regField : null,
      });
      if (res?.user) {
        setUser(res.user);
        nav(homeFor(res.user.role));
      }
    } catch (x) {
      setErr(x.message || 'خطا در ثبت‌نام. لطفاً اطلاعات را بررسی کنید.');
    }
    setBusy(false);
  };

  const demo = async (role) => {
    setBusy(true);
    setErr('');
    try {
      const r = await api.demoLogin(role);
      if (r?.user) {
        setUser(r.user);
        nav(homeFor(r.user.role));
      }
    } catch (e) {
      setErr(e.message || 'خطا در ورود آزمایشی.');
    }
    setBusy(false);
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

          {/* Tab Selector */}
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setErr(''); }}
            >
              ورود با رمز عبور
            </button>
            <button
              type="button"
              className={`login-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setErr(''); }}
            >
              ثبت‌نام جدید (آنی)
            </button>
          </div>

          {err && <div className="callout warn" style={{ fontSize: '.9rem' }}><Icon name="warning" size={18} /><span>{err}</span></div>}

          {/* ── Login Tab ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="stack">
              <p className="muted sm">
                نام کاربری یا شماره موبایل و رمز عبور خود را وارد کنید:
              </p>

              <Field label="نام کاربری یا شماره موبایل">
                <input
                  name="username"
                  className="input ltr"
                  autoComplete="username"
                  placeholder="مثال: danyal یا ۰۹۱۲۳۴۵۶۷۸۹"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </Field>

              <Field label="رمز عبور">
                <input
                  name="password"
                  type="password"
                  className="input ltr"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </Field>

              <div className="admin-hint-box">
                <Icon name="check" size={16} />
                <span>ورود مدیر سامانه: نام کاربری <b>danyal</b> | رمز عبور <b>danyal1074</b></span>
              </div>

              <Button size="lg" block loading={busy} type="submit" disabled={!identifier.trim() || !loginPassword.trim()}>
                ورود به سامانه
              </Button>
            </form>
          )}

          {/* ── Register Tab ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="stack">
              <p className="muted sm">
                مشخصات خود را وارد کنید تا حساب شما فوراً و بدون نیاز به پیامک ساخته شود:
              </p>

              <Field label="نام و نام خانوادگی">
                <input
                  name="name"
                  className="input"
                  placeholder="مثال: سارا کریمی"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  autoFocus
                  required
                />
              </Field>

              <Field label="کد ملی (۱۰ رقم)">
                <input
                  name="national_id"
                  className="input ltr"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="مثال: ۰۰۱۲۳۴۵۶۷۸"
                  value={regNationalId}
                  onChange={(e) => setRegNationalId(cleanDigits(e.target.value))}
                />
              </Field>

              <Field label="شماره موبایل (جهت نام کاربری)">
                <input
                  name="phone"
                  className="input ltr"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={regPhone}
                  onChange={(e) => setRegPhone(cleanDigits(e.target.value))}
                  required
                />
              </Field>

              <Field label="رمز عبور">
                <input
                  name="password"
                  type="password"
                  className="input ltr"
                  autoComplete="new-password"
                  placeholder="حداقل ۴ نویسه"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </Field>

              <Field label="نوع حساب کاربری">
                <Seg
                  value={regRole}
                  onChange={(r) => setRegRole(r)}
                  options={[
                    { value: 'student', label: 'داوطلب کنکور هنر (مستقل)' },
                    { value: 'counselor', label: 'مشاور کنکور هنر' },
                  ]}
                />
              </Field>

              {regRole === 'student' && (
                <Field label="رشته‌ی هدف در کنکور هنر">
                  <select
                    className="select"
                    value={regField}
                    onChange={(e) => setRegField(e.target.value)}
                  >
                    {FIELDS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </Field>
              )}

              <Button size="lg" block loading={busy} type="submit" disabled={!regName.trim() || regPhone.length < 10 || !regPassword.trim()}>
                ثبت‌نام و ورود آنی به سامانه
              </Button>
            </form>
          )}

          {/* ── Demo Accounts ── */}
          <div className="demo-box">
            <div className="row between" style={{ marginBottom: '6px' }}>
              <h3 style={{ margin: 0 }}>🎮 تست سامانه با حساب‌های نمونه (بدون ثبت‌نام)</h3>
              <span className="badge badge-info">فعال</span>
            </div>
            <p className="muted sm" style={{ margin: '0 0 10px' }}>با یک کلیک وارد هر یک از پنل‌ها شوید و فضای سامانه را بررسی کنید:</p>
            <div className="stack-sm">
              <button type="button" className="demo-btn" onClick={() => demo('student')}>
                <Icon name="home" size={20} />
                <span>دانش‌آموز کنکور هنر</span>
                <small>سارا کریمی (رشته گرافیک)</small>
                <Icon name="next" size={18} />
              </button>

              <button type="button" className="demo-btn" onClick={() => demo('counselor')}>
                <Icon name="users" size={20} />
                <span>مشاور کنکور هنر</span>
                <small>مریم احمدی (مشاور ارشد)</small>
                <Icon name="next" size={18} />
              </button>

              <button type="button" className="demo-btn" onClick={() => demo('admin')}>
                <Icon name="chart" size={20} />
                <span>مدیر سامانه</span>
                <small>دانیال (مدیریت کل سیستم)</small>
                <Icon name="next" size={18} />
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
