import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { faNum } from './lib/dates';

/* ───────────────────────── Icons ───────────────────────── */
const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  exam: 'M8 4h8v3H8zM6 5H5v16h14V5h-1M9 14l2 2 4-4',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8',
  timer: 'M12 8v5l3 2M9 2h6M12 5a8 8 0 100 16 8 8 0 000-16z',
  brush: 'M18 3l3 3-8 9-3-3zM10 13c-3 0-4 2-4 4 0 2-1 3-3 4 4 1 9 0 9-4 0-1-.5-2-2-4z',
  chat: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 4a3.5 3.5 0 010 7M19 15c2 .7 3 2.5 3 5',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  bell: 'M6 17V11a6 6 0 1112 0v6l2 2H4zM10 21h4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7',
  next: 'M19 12H5M11 6l-6 6 6 6',
  prev: 'M5 12h14M13 6l6 6-6 6',
  chevL: 'M15 5l-7 7 7 7',
  chevR: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  send: 'M4 12l16-8-6 16-3-7z',
  warning: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  bank: 'M4 6c0-1.5 3.5-3 8-3s8 1.5 8 3-3.5 3-8 3-8-1.5-8-3zM4 6v6c0 1.5 3.5 3 8 3s8-1.5 8-3V6M4 12v6c0 1.5 3.5 3 8 3s8-1.5 8-3v-6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z',
  money: 'M3 6h18v12H3zM3 10h18M7 15h3',
  play: 'M7 4l13 8-13 8z',
  pause: 'M8 4v16M16 4v16',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  refresh: 'M20 11a8 8 0 10-2 6M20 4v7h-7',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
};
export function Icon({ name, size = 20, className = '', stroke = 1.8 }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.more} />
    </svg>
  );
}

/* ───────────────────────── Basics ───────────────────────── */
export function Button({ variant = 'primary', size, icon, iconEnd, block, loading, children, className = '', ...rest }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', !children && 'btn-icon', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner sm" /> : icon ? <Icon name={icon} size={size === 'lg' ? 22 : 18} /> : null}
      {children}
      {iconEnd && !loading ? <Icon name={iconEnd} size={18} /> : null}
    </button>
  );
}

export function Badge({ tone = 'neutral', children, icon }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <Icon name={icon} size={13} stroke={2.2} />}
      {children}
    </span>
  );
}

export function Avatar({ user, size = 40 }) {
  const name = user?.name || '؟';
  return (
    <span className="avatar" style={{ width: size, height: size, background: user?.color || '#2b3fd6', fontSize: size * 0.42 }} aria-hidden="true">
      {name.trim()[0]}
    </span>
  );
}

export function Spinner({ size }) {
  return <span className={`spinner ${size || ''}`} role="status" aria-label="در حال بارگذاری" />;
}

export function Loading({ label = 'در حال بارگذاری…' }) {
  return (
    <div className="loading">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="empty">
      <Icon name="warning" size={28} />
      <h3>اتصال برقرار نشد</h3>
      <p>{error?.message || 'مشکلی پیش آمد.'}</p>
      {onRetry && <Button variant="soft" onClick={onRetry}>تلاش دوباره</Button>}
    </div>
  );
}

export function Empty({ icon = 'sparkle', title, text, action }) {
  return (
    <div className="empty">
      <Icon name={icon} size={30} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function PageHead({ title, sub, actions, back }) {
  return (
    <header className="page-head">
      <div className="grow">
        {back}
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SubjectDot({ subject, label = true }) {
  if (!subject) return null;
  return (
    <span className="subject-tag">
      <i style={{ background: subject.color }} />
      {label && subject.name}
    </span>
  );
}

/* ───────────────────────── Forms ───────────────────────── */
export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Seg({ options, value, onChange, size }) {
  return (
    <div className={`seg ${size || ''}`} role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={`seg-btn ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipToggle({ on, onClick, children, color }) {
  return (
    <button type="button" className={`chip-toggle ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} style={on && color ? { background: color, borderColor: color } : undefined}>
      {on && <Icon name="check" size={14} stroke={2.6} />}
      {children}
    </button>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? 'on' : ''}`} onClick={() => onChange(t.value)}>
          {t.icon && <Icon name={t.icon} size={17} />}
          {t.label}
          {t.count ? <span className="tab-count">{faNum(t.count)}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Modal ───────────────────────── */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="بستن"><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ───────────────────────── Toast + confirm ───────────────────────── */
const FeedbackCtx = createContext(null);
export const useToast = () => useContext(FeedbackCtx).toast;
export const useConfirm = () => useContext(FeedbackCtx).confirm;

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const seq = useRef(1);
  const toast = useCallback((text, tone = 'ok') => {
    const id = seq.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (v) => { dialog?.resolve(v); setDialog(null); };
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={t.tone === 'err' ? 'warning' : 'check'} size={18} />
            {t.text}
          </div>
        ))}
      </div>
      <Modal open={!!dialog} onClose={() => close(false)} title={dialog?.title || 'مطمئنی؟'}
        footer={<>
          <Button variant="ghost" onClick={() => close(false)}>انصراف</Button>
          <Button variant={dialog?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{dialog?.confirmLabel || 'تأیید'}</Button>
        </>}>
        <p>{dialog?.text}</p>
      </Modal>
    </FeedbackCtx.Provider>
  );
}

/* ───────────────────────── Charts ───────────────────────── */
export function Ring({ value = 0, size = 96, stroke = 9, color = '#fff', track = 'rgba(255,255,255,.22)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function BarChart({ data, height = 140, color = 'var(--lapis)', format = faNum, unit = '' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars" style={{ height: height + 28 }} role="img" aria-label="نمودار ستونی">
      {data.map((d, i) => (
        <div className="bar-col" key={i} title={`${d.label}: ${format(d.value)}${unit}`}>
          <span className="bar-val">{d.value ? format(d.value) : ''}</span>
          <div className="bar-track" style={{ height }}>
            <div className={`bar ${d.today ? 'today' : ''}`} style={{ height: `${(d.value / max) * 100}%`, background: d.today ? 'var(--ochre)' : color }} />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ points, height = 140 }) {
  if (!points.length) return null;
  const W = 320, H = height, pad = 22;
  const xs = points.map((_, i) => (points.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1)));
  const ys = points.map((p) => H - pad - (p.value / 100) * (H - pad * 2));
  // RTL: first point on the right
  const rx = xs.map((x) => W - x);
  const d = rx.map((x, i) => `${i ? 'L' : 'M'}${x},${ys[i]}`).join(' ');
  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="روند نمره‌ها">
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={pad} x2={W - pad} y1={H - pad - (g / 100) * (H - pad * 2)} y2={H - pad - (g / 100) * (H - pad * 2)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={W - 2} y={H - pad - (g / 100) * (H - pad * 2) + 4} fontSize="10" fill="var(--ink-3)" textAnchor="end">{faNum(g)}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--lapis)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {rx.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r="5" fill="#fff" stroke="var(--lapis)" strokeWidth="2.5" />
            <text x={x} y={ys[i] - 11} fontSize="11" fontWeight="700" fill="var(--ink)" textAnchor="middle">{faNum(points[i].value)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function HBar({ value, color = 'var(--lapis)', warn = false }) {
  return (
    <div className="hbar"><div style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: warn ? 'var(--madder)' : color }} /></div>
  );
}
