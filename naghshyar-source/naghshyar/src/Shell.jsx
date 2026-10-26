import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from './api';
import { APP_NAME, USE_MOCK } from './config';
import { ROLE_LABEL, homeFor, useAuth } from './auth';
import { Avatar, Icon, Modal } from './ui';
import { useAsync } from './lib/hooks';
import { faNum, relativeDay } from './lib/dates';

export const NAV = {
  student: [
    { to: '/s', label: 'امروز', icon: 'home', end: true, bar: true },
    { to: '/s/plan', label: 'برنامه', icon: 'calendar', bar: true },
    { to: '/s/chat', label: 'گفتگو', sideLabel: 'گفتگو با مشاور', icon: 'chat', bar: true },
    { to: '/s/exams', label: 'آزمون‌ها', icon: 'exam', bar: true },
    { to: '/s/progress', label: 'پیشرفت', icon: 'chart' },
    { to: '/s/study', label: 'زمان مطالعه', icon: 'timer' },
    { to: '/s/practice', label: 'بخش عملی', icon: 'brush' },
    { to: '/s/assistant', label: 'دستیار', sideLabel: 'دستیار درسی', icon: 'sparkle', bar: true },
  ],
  counselor: [
    { to: '/c', label: 'دانش‌آموزان', icon: 'users', end: true, bar: true },
    { to: '/c/chat', label: 'گفتگوها', icon: 'chat', bar: true },
    { to: '/c/exams', label: 'آزمون‌ها', icon: 'exam', bar: true },
    { to: '/c/questions', label: 'بانک سؤال', icon: 'bank', bar: true },
    { to: '/c/practice', label: 'کار عملی', icon: 'brush', bar: true },
  ],
  admin: [
    { to: '/a', label: 'نمای کلی', icon: 'chart', end: true, bar: true },
    { to: '/a/plans', label: 'پلن‌ها', icon: 'money', bar: true },
  ],
};

export function Brand({ small }) {
  return (
    <span className={`brand ${small ? 'small' : ''}`}>
      <svg width={small ? 28 : 34} height={small ? 28 : 34} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#2b3fd6" />
        <path d="M14 46 L30 14 L38 30 L44 22 L52 46 Z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="46" cy="16" r="5" fill="#e0a526" />
      </svg>
      <b>{APP_NAME}</b>
    </span>
  );
}

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && fn();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, fn]);
}

function Bell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const { data, reload } = useAsync(() => api.listNotifications(), []);
  const loc = useLocation();
  useEffect(() => { reload(); /* refresh on navigation */ }, [loc.pathname]); // eslint-disable-line
  useOutside(ref, () => setOpen(false));
  const list = data || [];
  const unread = list.filter((n) => !n.read).length;
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread) { await api.markNotificationsRead(); setTimeout(reload, 1200); }
  };
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="btn btn-ghost btn-icon bell" onClick={toggle} aria-label="اعلان‌ها">
        <Icon name="bell" />
        {unread > 0 && <i className="dot">{faNum(unread)}</i>}
      </button>
      {open && (
        <div className="pop notif">
          <h4>اعلان‌ها</h4>
          {list.length === 0 && <p className="muted pad">اعلان تازه‌ای نداری.</p>}
          {list.map((n) => (
            <button key={n.id} className={`notif-row ${n.read ? '' : 'new'}`} onClick={() => { setOpen(false); n.link && nav(n.link); }}>
              <span>{n.text}</span>
              <small>{relativeDay(n.date)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout, setUser } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const switchTo = async (role) => {
    const r = await api.demoLogin(role);
    setUser(r.user);
    setOpen(false);
    nav(homeFor(role));
  };
  const reset = async () => {
    await api.resetDemo();
    await logout();
    window.location.hash = '#/login';
    window.location.reload();
  };
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="user-chip" onClick={() => setOpen(!open)} aria-label="منوی کاربر">
        <Avatar user={user} size={34} />
        <span className="user-chip-name">{user.name}</span>
      </button>
      {open && (
        <div className="pop menu">
          <div className="menu-head">
            <Avatar user={user} size={44} />
            <div>
              <b>{user.name}</b>
              <small>{ROLE_LABEL[user.role]}{user.field ? ` · ${user.field}` : ''}</small>
            </div>
          </div>
          {/* Role switcher for testing & demo */}
          <p className="menu-title">جابجایی بین نقش‌ها برای تست دمو</p>
          {['student', 'counselor', 'admin'].filter((r) => r !== user.role).map((r) => (
            <button key={r} className="menu-item" onClick={() => switchTo(r)}><Icon name="eye" size={18} />ورود به‌عنوان {ROLE_LABEL[r]}</button>
          ))}
          <hr />
          <button className="menu-item" onClick={async () => { await logout(); nav('/'); }}><Icon name="logout" size={18} />خروج</button>
        </div>
      )}
    </div>
  );
}

export default function Shell({ role }) {
  const items = NAV[role];
  const [more, setMore] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const { user, setUser, logout } = useAuth();
  useEffect(() => { setMore(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const barItems = items.filter((i) => i.bar);
  const moreItems = items.filter((i) => !i.bar);

  const isDemo = user && (user.phone?.startsWith('0912000') || ['s1', 'c1', 'a1', 'admin'].includes(user.id));
  const switchTo = async (targetRole) => {
    try {
      const r = await api.demoLogin(targetRole);
      if (r?.user) {
        setUser(r.user);
        nav(homeFor(targetRole));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="shell">
      <aside className="side">
        <NavLink to={homeFor(role)} className="side-brand"><Brand /></NavLink>
        <nav className="side-nav" aria-label="منوی اصلی">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}>
              <Icon name={i.icon} size={21} />
              {i.sideLabel || i.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-col">
        {isDemo && (
          <aside className="demo-top-strip" aria-label="حالت دمو">
            <div className="demo-strip-inner">
              <div className="demo-strip-info">
                <span className="demo-strip-pulse" />
                <b>حالت دموی سامانه:</b>
                <span>در حال مشاهده پنل <b>{ROLE_LABEL[role]}</b></span>
              </div>
              <div className="demo-strip-actions">
                <span className="demo-strip-lbl">سوییچ سریع:</span>
                {['student', 'counselor', 'admin'].filter((r) => r !== role).map((r) => (
                  <button key={r} type="button" className="demo-pill-btn" onClick={() => switchTo(r)}>
                    {ROLE_LABEL[r]}
                  </button>
                ))}
                <button type="button" className="demo-pill-exit" onClick={async () => { await logout(); nav('/login'); }}>
                  ورود اصلی
                </button>
              </div>
            </div>
          </aside>
        )}
        <header className="topbar">
          <NavLink to={homeFor(role)} className="topbar-brand"><Brand small /></NavLink>
          <div className="grow" />
          <Bell />
          <UserMenu />
        </header>
        <main className="content" id="main">
          <Outlet />
        </main>
      </div>
      <nav className="tabbar" aria-label="منوی اصلی">
        {barItems.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `tab-item ${isActive ? 'on' : ''}`}>
            <Icon name={i.icon} size={23} />
            <span>{i.barLabel || i.label}</span>
          </NavLink>
        ))}
        {moreItems.length > 0 && (
          <button className={`tab-item ${more ? 'on' : ''}`} onClick={() => setMore(true)}>
            <Icon name="more" size={23} />
            <span>بیشتر</span>
          </button>
        )}
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="بیشتر">
        <div className="more-grid">
          {moreItems.map((i) => (
            <NavLink key={i.to} to={i.to} className="more-item">
              <Icon name={i.icon} size={26} />
              {i.label}
            </NavLink>
          ))}
        </div>
      </Modal>
    </div>
  );
}
