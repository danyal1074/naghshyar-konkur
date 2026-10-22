// Date + number helpers. Dates are stored as ISO strings (YYYY-MM-DD, Gregorian) and shown in the Jalali calendar.
// The Iranian week starts on Saturday.

export const faNum = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? '' : Number(n).toLocaleString('fa-IR'));

// Converts Persian / Arabic digits to Latin (for phone inputs, etc.)
export const toLatinDigits = (s = '') =>
  String(s)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

export const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
};
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const todayISO = () => toISO(new Date());

// Saturday of the week containing d
export const weekStart = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 1) % 7));
  return x;
};

export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const f = (opts) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', opts);
export const fmtShort = (d) => f({ day: 'numeric', month: 'long' }).format(d);
export const fmtFull = (d) => f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const fmtDateISO = (iso) => (iso ? fmtShort(fromISO(iso)) : '');
export const fmtDayNum = (iso) => f({ day: 'numeric' }).format(fromISO(iso));
export const fmtMonthDay =(iso) => f({ month: 'long', day: 'numeric' }).format(fromISO(iso));

export const weekRangeLabel = (startISO) => {
  const s = fromISO(startISO);
  const e = addDays(s, 6);
  return `${fmtShort(s)} تا ${fmtShort(e)}`;
};

export const daysBetween = (aISO, bISO) => Math.round((fromISO(bISO) - fromISO(aISO)) / 86400000);
export const daysUntil = (iso) => daysBetween(todayISO(), iso);

export const fmtMinutes = (m) => {
  m = Math.round(m || 0);
  if (m < 60) return `${faNum(m)} دقیقه`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${faNum(h)} ساعت و ${faNum(r)} دقیقه` : `${faNum(h)} ساعت`;
};

export const faDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export const fmtClock = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return faDigits(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
};

export const relativeDay = (iso) => {
  const d = daysBetween(todayISO(), iso);
  if (d === 0) return 'امروز';
  if (d === -1) return 'دیروز';
  if (d === 1) return 'فردا';
  if (d < 0) return `${faNum(-d)} روز پیش`;
  return `${faNum(d)} روز دیگر`;
};
