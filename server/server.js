import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import { randomBytes, randomInt } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDb } from './db.js';
import { SUBJECTS, PLANS, TEMPLATES, FIELDS } from './seedData.js';
import { askGeminiChat, generateGeminiQuestions } from './gemini.js';
import { sendOtpSms } from './sms.js';
import {
  canAccessStudentRecord,
  canChatPair,
  demoAuthEnabled,
  isoDate,
  questionPublic,
  resultPublic,
  safeJson,
  taskPublic,
  tokenFresh,
  topicLookup,
  userPublic,
  weekBounds,
} from './access.js';

initDb();

const app = express();
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = new Set([
  'https://honar.digiral.ir',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
app.use(express.json({ limit: '8mb' }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(__dirname, '../naghshyar-demo-build');
const uploadsDir = resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const TOPICS = topicLookup(SUBJECTS);
const buckets = new Map();

function hitLimit(key, limit, windowMs) {
  const now = Date.now();
  const fresh = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return true;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return false;
}

function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token || token.length > 200) return null;
  const tokRow = db.prepare('SELECT user_id, created_at FROM tokens WHERE token = ?').get(token);
  if (!tokRow) return null;
  if (!tokenFresh(tokRow.created_at)) {
    db.prepare('DELETE FROM tokens WHERE token = ?').run(token);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokRow.user_id);
  if (!user || user.status === 'suspended') return null;
  return user;
}

function authRequired(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: 'لطفاً ابتدا وارد سامانه شوید.' });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
    next();
  };
}

const uid = (p) => `${p}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

function normalizePhone(p) {
  if (!p) return '';
  let clean = String(p)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/\s+/g, '')
    .trim();
  if (clean.startsWith('+98')) clean = '0' + clean.slice(3);
  if (clean.startsWith('98') && clean.length === 12) clean = '0' + clean.slice(2);
  return clean;
}

function normalizeCode(c) {
  if (!c) return '';
  return String(c)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/\s+/g, '')
    .trim();
}

function smsLive() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'sms_live'").get();
  return row?.value === '1';
}

function issueToken(userId) {
  const token = `tok_${randomBytes(16).toString('hex')}`;
  db.prepare('INSERT INTO tokens (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, new Date().toISOString());
  return token;
}

function studentById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(id);
}

function ownsStudent(user, studentId) {
  return canAccessStudentRecord(user, studentById(studentId));
}

function loadStudent(req, res, rawId) {
  const id = rawId === 'me' ? req.user.id : rawId;
  const student = studentById(id);
  if (!student) {
    res.status(404).json({ message: 'دانش‌آموز یافت نشد.' });
    return null;
  }
  if (!canAccessStudentRecord(req.user, student)) {
    res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
    return null;
  }
  return student;
}

function loadTask(req, res, taskId) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    res.status(404).json({ message: 'کار پیدا نشد.' });
    return null;
  }
  if (!ownsStudent(req.user, task.student_id)) {
    res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
    return null;
  }
  return task;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

function audienceOf(exam) {
  return safeJson(exam.student_ids, []);
}

function studentCanTake(user, exam) {
  if (user.role !== 'student') return false;
  const ids = audienceOf(exam);
  return !ids.length || ids.includes('*') || ids.includes('all') || ids.includes(user.id);
}

function counselorOwnsExam(user, exam) {
  return user.role === 'admin' || (user.role === 'counselor' && exam.created_by === user.id);
}

function loadQuestions(ids, hideAnswer) {
  return ids.map((qid) => {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    return q ? questionPublic(q, hideAnswer) : null;
  }).filter(Boolean);
}

function studentStats(s) {
  const today = isoDate();
  const { start, end } = weekBounds();
  const tasks = db.prepare('SELECT done, date FROM tasks WHERE student_id = ? AND date >= ? AND date <= ?').all(s.id, start, end);
  const past = tasks.filter((t) => t.date <= today);
  const pastDone = past.filter((t) => t.done).length;
  const pastRate = past.length ? pastDone / past.length : null;
  let status = 'good';
  if (!tasks.length) status = 'noplan';
  else if (pastRate !== null) status = pastRate >= 0.7 ? 'good' : pastRate >= 0.4 ? 'warn' : 'late';
  const results = db.prepare('SELECT percent FROM exam_results WHERE student_id = ?').all(s.id);
  const avgScore = results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null;
  const last = db.prepare('SELECT date FROM study_sessions WHERE student_id = ? ORDER BY date DESC LIMIT 1').get(s.id);
  const exams = db.prepare('SELECT id, student_ids FROM exams').all();
  let pendingExams = 0;
  for (const exam of exams) {
    const ids = safeJson(exam.student_ids, []);
    const eligible = !ids.length || ids.includes('*') || ids.includes('all') || ids.includes(s.id);
    if (!eligible) continue;
    const done = db.prepare('SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ?').get(exam.id, s.id);
    if (!done) pendingExams++;
  }
  return {
    ...userPublic(s),
    weekDone: tasks.filter((t) => t.done).length,
    weekTotal: tasks.length,
    pastRate,
    lastActive: last?.date || null,
    avgScore,
    status,
    pendingExams,
  };
}

function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function setTaskDone(task, done) {
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(done ? 1 : 0, task.id);
  if (done && task.type !== 'test') {
    const existing = db.prepare('SELECT id FROM study_sessions WHERE task_id = ? AND auto = 1').get(task.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO study_sessions (id, student_id, date, subject_id, minutes, task_id, auto)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(uid('ss'), task.student_id, isoDate(), task.subject_id, Number(task.minutes) || 0, task.id);
    }
  }
  if (!done) db.prepare('DELETE FROM study_sessions WHERE task_id = ? AND auto = 1').run(task.id);
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

function saveBase64Image(dataUri, prefix = 'img') {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
    return { error: 'تصویر کار عملی را انتخاب کنید.' };
  }
  const matches = dataUri.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches) return { error: 'فرمت تصویر پشتیبانی نمی‌شود.' };
  const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
  if (!IMAGE_EXT.has(ext)) return { error: 'فقط تصویر JPG، PNG یا WEBP مجاز است.' };
  const buffer = Buffer.from(matches[2], 'base64');
  if (!buffer.length || buffer.length > 6 * 1024 * 1024) return { error: 'حجم تصویر باید کمتر از ۶ مگابایت باشد.' };
  const filename = `${prefix}_${Date.now()}_${randomInt(10000)}.${ext === 'jpeg' ? 'jpg' : ext}`;
  fs.writeFileSync(resolve(uploadsDir, filename), buffer);
  return { url: `/uploads/${filename}` };
}

// ── Auth ──
app.post('/api/auth/otp', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (hitLimit(`otp-ip:${ip}`, 12, 10 * 60 * 1000)) {
    return res.status(429).json({ message: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.' });
  }
  const cleanPhone = normalizePhone(req.body?.phone);
  if (!/^09\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ message: 'شماره موبایل ۱۱ رقمی معتبر وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹).' });
  }
  const existingOtp = db.prepare('SELECT * FROM otps WHERE phone = ?').get(cleanPhone);
  const now = Date.now();
  if (existingOtp && now - existingOtp.created_at < 60000) {
    const remainSec = Math.ceil((60000 - (now - existingOtp.created_at)) / 1000);
    return res.status(429).json({ message: `لطفاً ${remainSec} ثانیه دیگر جهت درخواست مجدد کد تایید صبر کنید.` });
  }
  const code = String(randomInt(10000, 100000));
  db.prepare(`
    INSERT OR REPLACE INTO otps (phone, code, expires_at, attempts, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(cleanPhone, code, now + 2 * 60 * 1000, now);

  const smsRes = await sendOtpSms(cleanPhone, code);
  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
  if (!smsRes.success) {
    db.prepare('DELETE FROM otps WHERE phone = ?').run(cleanPhone);
    if (user && !smsLive()) {
      return res.json({
        ok: true,
        isNew: false,
        message: 'پیامک هنوز وصل نشده است. اگر این شماره از قبل حساب دارد، کد آزمایشی همان حساب را وارد کنید.',
      });
    }
    return res.status(503).json({ message: smsRes.error || 'ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید.' });
  }
  if (smsRes.method === 'verify') {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('sms_live', '1')").run();
  }
  res.json({ ok: true, isNew: !user, message: 'کد تأیید ارسال شد.' });
});

app.post('/api/auth/verify', (req, res) => {
  const ip = req.ip || 'unknown';
  if (hitLimit(`verify-ip:${ip}`, 20, 10 * 60 * 1000)) {
    return res.status(429).json({ message: 'تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.' });
  }
  const { name, role, field } = req.body || {};
  const cleanPhone = normalizePhone(req.body?.phone);
  const cleanCode = normalizeCode(req.body?.code);
  if (!/^09\d{9}$/.test(cleanPhone) || !cleanCode) {
    return res.status(400).json({ message: 'شماره موبایل و کد تایید الزامی هستند.' });
  }

  const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
  const allowDemo = cleanCode === '12345' && existingUser && (demoAuthEnabled() || !smsLive());
  if (!allowDemo) {
    const otpRow = db.prepare('SELECT * FROM otps WHERE phone = ?').get(cleanPhone);
    if (!otpRow) return res.status(400).json({ message: 'کد تأیید برای این شماره یافت نشد یا منقضی شده است. لطفاً دوباره درخواست دهید.' });
    if (Date.now() > otpRow.expires_at) {
      db.prepare('DELETE FROM otps WHERE phone = ?').run(cleanPhone);
      return res.status(400).json({ message: 'کد تأیید منقضی شده است (اعتبار ۲ دقیقه). لطفاً کد جدید دریافت کنید.' });
    }
    if (otpRow.attempts >= 5) {
      db.prepare('DELETE FROM otps WHERE phone = ?').run(cleanPhone);
      return res.status(400).json({ message: 'تعداد دفعات ورود اشتباه بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید.' });
    }
    if (otpRow.code !== cleanCode) {
      db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE phone = ?').run(cleanPhone);
      return res.status(400).json({ message: 'کد تأیید واردشده نادرست است.' });
    }
    db.prepare('DELETE FROM otps WHERE phone = ?').run(cleanPhone);
  }

  let user = existingUser;
  if (!user) {
    if (allowDemo) return res.status(400).json({ message: 'کد تأیید واردشده نادرست است.' });
    if (role === 'counselor' || role === 'admin') {
      return res.status(403).json({ message: 'حساب مشاور فقط توسط مدیر سامانه ساخته می‌شود.' });
    }
    if (!name?.trim()) return res.status(200).json({ needsProfile: true });
    const id = uid('s');
    db.prepare(`
      INSERT INTO users (id, role, name, phone, field, color, counselor_id, plan, status, renew_at, speciality)
      VALUES (?, 'student', ?, ?, ?, '#2b3fd6', null, null, 'active', null, null)
    `).run(id, name.trim().slice(0, 80), cleanPhone, field || 'گرافیک');
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ message: 'این حساب غیرفعال است. با پشتیبانی تماس بگیرید.' });
  }
  res.json({ token: issueToken(user.id), user: userPublic(user) });
});

app.post('/api/auth/demo-login', (req, res) => {
  if (!demoAuthEnabled()) return res.status(404).json({ message: 'ورود نمایشی غیرفعال است.' });
  const user = db.prepare('SELECT * FROM users WHERE role = ? AND status = ? LIMIT 1').get(req.body?.role || 'student', 'active');
  if (!user) return res.status(404).json({ message: 'حساب نمونه یافت نشد.' });
  res.json({ token: issueToken(user.id), user: userPublic(user) });
});

app.post('/api/auth/logout', authRequired, (req, res) => {
  const token = req.headers.authorization.slice(7).trim();
  db.prepare('DELETE FROM tokens WHERE token = ?').run(token);
  res.json({ ok: true });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json(userPublic(req.user));
});

app.get('/api/syllabus', (req, res) => res.json(SUBJECTS));
app.get('/api/plan-templates', (req, res) => res.json(TEMPLATES));
app.get('/api/plans', (req, res) => res.json(PLANS));
app.get('/api/fields', (req, res) => res.json(FIELDS));

app.get('/api/public/stats', (req, res) => {
  res.json({
    counselors: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'counselor' AND status = 'active'").get().c,
    students: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get().c,
    exams: db.prepare('SELECT COUNT(*) as c FROM exams').get().c,
    questions: db.prepare('SELECT COUNT(*) as c FROM questions').get().c,
  });
});

// ── Students ──
app.get('/api/students', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const counselorId = req.user.role === 'counselor' ? req.user.id : req.query.counselorId;
  const students = counselorId
    ? db.prepare("SELECT * FROM users WHERE role = 'student' AND counselor_id = ?").all(counselorId)
    : db.prepare("SELECT * FROM users WHERE role = 'student'").all();
  const plan = PLANS.find((p) => p.id === req.user.plan) || null;
  res.json({
    items: students.map(studentStats),
    limit: plan?.studentLimit ?? null,
    planId: req.user.plan || null,
  });
});

app.get('/api/students/:id', authRequired, (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  res.json(studentStats(student));
});

app.post('/api/students', authRequired, requireRole('counselor'), (req, res) => {
  const name = String(req.body?.name || '').trim();
  const cleanPhone = normalizePhone(req.body?.phone);
  if (!name) return res.status(400).json({ message: 'نام دانش‌آموز الزامی است.' });
  if (!/^09\d{9}$/.test(cleanPhone)) return res.status(400).json({ message: 'شماره موبایل معتبر نیست.' });
  if (db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone)) {
    return res.status(400).json({ message: 'این شماره قبلاً ثبت شده است.' });
  }
  const plan = PLANS.find((p) => p.id === req.user.plan);
  const limit = plan?.studentLimit ?? 0;
  const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE counselor_id = ? AND role = 'student'").get(req.user.id).c;
  if (count >= limit) {
    return res.status(400).json({ message: `ظرفیت پلن شما ${limit} دانش‌آموز است. برای افزودن بیشتر پلن را ارتقا دهید.` });
  }
  const id = uid('s');
  db.prepare(`
    INSERT INTO users (id, role, name, phone, field, color, counselor_id, plan, status, renew_at)
    VALUES (?, 'student', ?, ?, ?, '#2b3fd6', ?, null, 'active', null)
  `).run(id, name.slice(0, 80), cleanPhone, req.body?.field || 'گرافیک', req.user.id);
  res.json(userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

// ── Tasks ──
app.get('/api/students/:id/tasks', authRequired, (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  const { from, to } = req.query;
  let sql = 'SELECT * FROM tasks WHERE student_id = ?';
  const args = [student.id];
  if (from && to) {
    if (!validDate(from) || !validDate(to)) return res.status(400).json({ message: 'بازه تاریخ نامعتبر است.' });
    sql += ' AND date >= ? AND date <= ?';
    args.push(from, to);
  }
  sql += ' ORDER BY date ASC';
  res.json(db.prepare(sql).all(...args).map(taskPublic));
});

app.post('/api/students/:id/tasks', authRequired, (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  const { date, subjectId, topicId, type, minutes, note, title } = req.body || {};
  if (!validDate(date) || !subjectId || !topicId) return res.status(400).json({ message: 'تاریخ، درس و مبحث الزامی است.' });
  const id = uid('t');
  const mins = Math.min(600, Math.max(1, Number(minutes) || 45));
  db.prepare(`
    INSERT INTO tasks (id, student_id, date, subject_id, topic_id, type, minutes, title, note, done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, student.id, date, subjectId, topicId, type || 'study', mins, title || `${type || 'study'} ${topicId}`, note || '');
  res.json(taskPublic(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)));
});

app.patch('/api/tasks/:id', authRequired, (req, res) => {
  const task = loadTask(req, res, req.params.id);
  if (!task) return;
  const { date, subjectId, topicId, type, minutes, note, title, done } = req.body || {};
  if (date !== undefined && !validDate(date)) return res.status(400).json({ message: 'تاریخ نامعتبر است.' });
  db.prepare(`
    UPDATE tasks SET
      date = COALESCE(?, date),
      subject_id = COALESCE(?, subject_id),
      topic_id = COALESCE(?, topic_id),
      type = COALESCE(?, type),
      minutes = COALESCE(?, minutes),
      note = COALESCE(?, note),
      title = COALESCE(?, title),
      done = COALESCE(?, done)
    WHERE id = ?
  `).run(
    date ?? null,
    subjectId ?? null,
    topicId ?? null,
    type ?? null,
    minutes !== undefined ? Math.min(600, Math.max(1, Number(minutes) || 1)) : null,
    note ?? null,
    title ?? null,
    done !== undefined ? (done ? 1 : 0) : null,
    task.id,
  );
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id);
  if (done !== undefined) setTaskDone(updated, Boolean(done));
  res.json(taskPublic(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)));
});

app.delete('/api/tasks/:id', authRequired, (req, res) => {
  const task = loadTask(req, res, req.params.id);
  if (!task) return;
  db.prepare('DELETE FROM study_sessions WHERE task_id = ? AND auto = 1').run(task.id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  res.json({ ok: true });
});

app.post('/api/tasks/:id/done', authRequired, (req, res) => {
  const task = loadTask(req, res, req.params.id);
  if (!task) return;
  const done = Boolean(req.body?.done);
  setTaskDone(task, done);
  res.json({ done });
});

app.post('/api/students/:id/plan/template', authRequired, (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  const { templateId, weekStart } = req.body || {};
  if (!validDate(weekStart)) return res.status(400).json({ message: 'تاریخ هفته نامعتبر است.' });
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return res.status(404).json({ message: 'قالب پیدا نشد.' });
  const insert = db.prepare(`
    INSERT INTO tasks (id, student_id, date, subject_id, topic_id, type, minutes, title, note, done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const t of tpl.tasks) {
    insert.run(uid('t'), student.id, shiftDate(weekStart, t.day), t.subjectId, t.topicId, t.type, t.minutes, t.title || `${t.type} ${t.topicId}`, t.note || '');
  }
  res.json({ added: tpl.tasks.length });
});

app.post('/api/students/:id/plan/copy-week', authRequired, (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  const { fromWeekStart, toWeekStart } = req.body || {};
  if (!validDate(fromWeekStart) || !validDate(toWeekStart)) return res.status(400).json({ message: 'تاریخ هفته نامعتبر است.' });
  const fromEnd = shiftDate(fromWeekStart, 6);
  const tasks = db.prepare('SELECT * FROM tasks WHERE student_id = ? AND date >= ? AND date <= ?').all(student.id, fromWeekStart, fromEnd);
  const insert = db.prepare(`
    INSERT INTO tasks (id, student_id, date, subject_id, topic_id, type, minutes, title, note, done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const [fy, fm, fd] = fromWeekStart.split('-').map(Number);
  const fromDate = new Date(fy, fm - 1, fd);
  for (const t of tasks) {
    const [ty, tm, td] = t.date.split('-').map(Number);
    const diffDays = Math.round((new Date(ty, tm - 1, td) - fromDate) / 86400000);
    insert.run(uid('t'), student.id, shiftDate(toWeekStart, diffDays), t.subject_id, t.topic_id, t.type, t.minutes, t.title, t.note);
  }
  res.json({ added: tasks.length });
});

app.delete('/api/students/:id/plan/week', authRequired, (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  const { weekStart } = req.query;
  if (!validDate(weekStart)) return res.status(400).json({ message: 'تاریخ هفته نامعتبر است.' });
  const end = shiftDate(weekStart, 6);
  const doomed = db.prepare('SELECT id FROM tasks WHERE student_id = ? AND date >= ? AND date <= ?').all(student.id, weekStart, end);
  for (const t of doomed) db.prepare('DELETE FROM study_sessions WHERE task_id = ? AND auto = 1').run(t.id);
  const info = db.prepare('DELETE FROM tasks WHERE student_id = ? AND date >= ? AND date <= ?').run(student.id, weekStart, end);
  res.json({ removed: info.changes });
});

app.post('/api/students/:id/plan/publish', authRequired, requireRole('counselor'), (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, 'مشاور برنامه‌ی جدید شما را منتشر کرد.', ?, 0, '/s/plan')
  `).run(uid('n'), student.id, isoDate());
  res.json({ ok: true });
});

// ── Questions ──
app.get('/api/questions', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const { subjectId, topicId, difficulty, q } = req.query;
  let sql = 'SELECT * FROM questions WHERE 1=1';
  const args = [];
  if (req.user.role === 'counselor') {
    sql += ' AND owner_id = ?';
    args.push(req.user.id);
  }
  if (topicId) {
    sql += ' AND topic_id = ?';
    args.push(topicId);
  } else if (subjectId) {
    const subject = SUBJECTS.find((s) => s.id === subjectId);
    const ids = subject?.topics.map((t) => t.id) || [];
    if (!ids.length) return res.json([]);
    sql += ` AND topic_id IN (${ids.map(() => '?').join(',')})`;
    args.push(...ids);
  }
  if (difficulty) {
    sql += ' AND difficulty = ?';
    args.push(difficulty);
  }
  if (q) {
    sql += ' AND text LIKE ?';
    args.push(`%${String(q).slice(0, 80)}%`);
  }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...args).map((item) => questionPublic(item, false)));
});

app.post('/api/questions', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const { topicId, text, options, answer, explanation, difficulty } = req.body || {};
  if (!topicId || !text || !Array.isArray(options) || options.length !== 4) {
    return res.status(400).json({ message: 'متن سؤال و چهار گزینه الزامی است.' });
  }
  const id = uid('q');
  db.prepare(`
    INSERT INTO questions (id, topic_id, text, options, answer, explanation, difficulty, owner_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'counselor')
  `).run(id, topicId, text, JSON.stringify(options), Number(answer) || 0, explanation || '', difficulty || 'medium', req.user.id);
  res.json(questionPublic(db.prepare('SELECT * FROM questions WHERE id = ?').get(id), false));
});

app.put('/api/questions/:id', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const current = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ message: 'سؤال پیدا نشد.' });
  if (req.user.role === 'counselor' && current.owner_id !== req.user.id) {
    return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  }
  const { topicId, text, options, answer, explanation, difficulty } = req.body || {};
  db.prepare(`
    UPDATE questions SET topic_id = ?, text = ?, options = ?, answer = ?, explanation = ?, difficulty = ?
    WHERE id = ?
  `).run(topicId, text, JSON.stringify(options), Number(answer) || 0, explanation || '', difficulty || 'medium', current.id);
  res.json(questionPublic(db.prepare('SELECT * FROM questions WHERE id = ?').get(current.id), false));
});

app.delete('/api/questions/:id', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const current = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ message: 'سؤال پیدا نشد.' });
  if (req.user.role === 'counselor' && current.owner_id !== req.user.id) {
    return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  }
  db.prepare('DELETE FROM questions WHERE id = ?').run(current.id);
  res.json({ ok: true });
});

app.post('/api/ai/questions', authRequired, requireRole('counselor', 'admin'), async (req, res) => {
  if (hitLimit(`aiq:${req.user.id}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ message: 'تعداد ساخت سؤال زیاد است. کمی بعد دوباره تلاش کنید.' });
  }
  try {
    const topicIds = Array.isArray(req.body?.topicIds) && req.body.topicIds.length ? req.body.topicIds.slice(0, 6) : ['iran_art'];
    const count = Math.min(8, Math.max(1, Number(req.body?.count) || 3));
    const questions = await generateGeminiQuestions(topicIds, count, req.body?.difficulty || 'medium', TOPICS.names);
    res.json(questions);
  } catch {
    res.status(500).json({ message: 'ساخت سؤال الان انجام نشد. دوباره تلاش کنید.' });
  }
});

// ── Exams ──
app.get('/api/exams', authRequired, (req, res) => {
  const isStudent = req.user.role === 'student';
  const list = db.prepare('SELECT * FROM exams ORDER BY created_at DESC').all();
  const out = [];
  for (const exam of list) {
    const qIds = safeJson(exam.question_ids, []);
    const sIds = safeJson(exam.student_ids, []);
    const topicIds = safeJson(exam.topic_ids, []);
    if (isStudent) {
      if (!studentCanTake(req.user, exam)) continue;
      const resRow = db.prepare('SELECT percent, finished_at FROM exam_results WHERE exam_id = ? AND student_id = ?').get(exam.id, req.user.id);
      out.push({
        id: exam.id,
        title: exam.title,
        topicIds,
        questionCount: qIds.length,
        durationMin: exam.duration_min,
        deadline: exam.deadline,
        status: resRow ? 'done' : 'new',
        score: resRow ? resRow.percent : null,
        finishedAt: resRow ? resRow.finished_at : null,
      });
    } else if (counselorOwnsExam(req.user, exam)) {
      const results = db.prepare('SELECT percent FROM exam_results WHERE exam_id = ?').all(exam.id);
      const avg = results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null;
      out.push({
        id: exam.id,
        title: exam.title,
        topicIds,
        questionCount: qIds.length,
        durationMin: exam.duration_min,
        deadline: exam.deadline,
        createdAt: exam.created_at,
        sent: sIds.includes('*') || sIds.includes('all') ? results.length : sIds.length,
        submitted: results.length,
        avg,
      });
    }
  }
  res.json(out);
});

app.post('/api/exams', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const { title, topicIds, questionIds = [], newQuestions = [], studentIds = [], durationMin, deadline } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ message: 'برای آزمون یک عنوان بنویس.' });
  if (!Array.isArray(studentIds) || !studentIds.length) return res.status(400).json({ message: 'حداقل یک دانش‌آموز را انتخاب کن.' });
  for (const sid of studentIds) {
    const student = studentById(sid);
    if (!student) return res.status(400).json({ message: 'یکی از دانش‌آموزهای انتخاب‌شده پیدا نشد.' });
    if (req.user.role === 'counselor' && student.counselor_id !== req.user.id) {
      return res.status(403).json({ message: 'فقط می‌توانید برای دانش‌آموزهای خودتان آزمون بسازید.' });
    }
  }
  const insertQ = db.prepare(`
    INSERT INTO questions (id, topic_id, text, options, answer, explanation, difficulty, owner_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ai')
  `);
  const allQIds = [...questionIds];
  for (const q of newQuestions) {
    if (!q?.text || !Array.isArray(q.options)) continue;
    const qid = uid('q');
    insertQ.run(qid, q.topicId, q.text, JSON.stringify(q.options), Number(q.answer) || 0, q.explanation || '', q.difficulty || 'medium', req.user.id);
    allQIds.push(qid);
  }
  if (!allQIds.length) return res.status(400).json({ message: 'آزمون باید حداقل یک سؤال داشته باشد.' });
  const examId = uid('e');
  db.prepare(`
    INSERT INTO exams (id, title, created_by, topic_ids, question_ids, student_ids, duration_min, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    examId,
    String(title).trim(),
    req.user.id,
    JSON.stringify(topicIds || []),
    JSON.stringify(allQIds),
    JSON.stringify(studentIds),
    Number(durationMin) || 15,
    deadline || null,
    isoDate(),
  );
  const today = isoDate();
  for (const stId of studentIds) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, text, date, read, link)
      VALUES (?, ?, ?, ?, 0, '/s/exams')
    `).run(uid('n'), stId, `آزمون جدید «${String(title).trim()}» برای شما فعال شد.`, today);
  }
  res.json({ id: examId });
});

app.post('/api/exams/self', authRequired, requireRole('student'), (req, res) => {
  const topicIds = Array.isArray(req.body?.topicIds) && req.body.topicIds.length ? req.body.topicIds : ['iran_art'];
  const count = Math.min(30, Math.max(1, Number(req.body?.count) || 10));
  const matched = db.prepare('SELECT id, topic_id FROM questions').all()
    .filter((q) => topicIds.includes(q.topic_id))
    .map((q) => q.id);
  if (!matched.length) return res.status(400).json({ message: 'برای این مبحث هنوز سؤالی در بانک نیست.' });
  for (let i = matched.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [matched[i], matched[j]] = [matched[j], matched[i]];
  }
  const selected = matched.slice(0, Math.min(count, matched.length));
  const examId = uid('e');
  const title = req.body?.title || `آزمون خودسنجی (${selected.length} سؤال)`;
  db.prepare(`
    INSERT INTO exams (id, title, created_by, topic_ids, question_ids, student_ids, duration_min, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, null, ?)
  `).run(examId, title, req.user.id, JSON.stringify(topicIds), JSON.stringify(selected), JSON.stringify([req.user.id]), Math.max(5, Math.round(selected.length * 1.2)), isoDate());
  res.json({ id: examId });
});

app.get('/api/exams/:id', authRequired, (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ message: 'آزمون یافت نشد.' });
  const isStudent = req.user.role === 'student';
  if (isStudent && !studentCanTake(req.user, exam)) return res.status(403).json({ message: 'این آزمون برای شما نیست.' });
  if (!isStudent && !counselorOwnsExam(req.user, exam)) return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  const resRow = isStudent
    ? db.prepare('SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ?').get(exam.id, req.user.id)
    : null;
  if (isStudent && !resRow) {
    db.prepare('INSERT OR IGNORE INTO exam_starts (exam_id, student_id, started_at) VALUES (?, ?, ?)').run(exam.id, req.user.id, Date.now());
  }
  res.json({
    id: exam.id,
    title: exam.title,
    durationMin: exam.duration_min,
    deadline: exam.deadline,
    topicIds: safeJson(exam.topic_ids, []),
    questions: loadQuestions(safeJson(exam.question_ids, []), isStudent && !resRow),
    alreadyDone: Boolean(resRow),
  });
});

app.post('/api/exams/:id/submit', authRequired, requireRole('student'), (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ message: 'آزمون یافت نشد.' });
  if (!studentCanTake(req.user, exam)) return res.status(403).json({ message: 'این آزمون برای شما نیست.' });
  const existing = db.prepare('SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ?').get(exam.id, req.user.id);
  if (existing) return res.status(400).json({ message: 'این آزمون را قبلاً داده‌ای.' });
  const start = db.prepare('SELECT started_at FROM exam_starts WHERE exam_id = ? AND student_id = ?').get(exam.id, req.user.id);
  if (!start) return res.status(400).json({ message: 'زمان آزمون ثبت نشده. صفحه آزمون را باز کنید و دوباره ارسال کنید.' });
  const cap = Math.max(60, (Number(exam.duration_min) || 15) * 60);
  const spent = Math.min(cap, Math.max(0, Math.round((Date.now() - Number(start.started_at)) / 1000)));
  const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const qIds = safeJson(exam.question_ids, []);
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  const byTopicMap = {};
  for (const qid of qIds) {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    if (!q) continue;
    const topic = (byTopicMap[q.topic_id] ||= { topicId: q.topic_id, correct: 0, wrong: 0, total: 0 });
    topic.total++;
    const userAns = answers[qid];
    if (userAns === undefined || userAns === null) blank++;
    else if (Number(userAns) === q.answer) {
      correct++;
      topic.correct++;
    } else {
      wrong++;
      topic.wrong++;
    }
  }
  const raw = correct - wrong / 3;
  const percent = qIds.length ? Math.max(0, Math.round((raw / qIds.length) * 100)) : 0;
  const resId = uid('r');
  db.prepare(`
    INSERT INTO exam_results (id, exam_id, student_id, answers, finished_at, spent_sec, correct, wrong, blank, percent, by_topic)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(resId, exam.id, req.user.id, JSON.stringify(answers), isoDate(), spent, correct, wrong, blank, percent, JSON.stringify(Object.values(byTopicMap)));
  res.json({ id: resId, percent, correct, wrong, blank });
});

app.get('/api/exams/:id/result', authRequired, (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ message: 'آزمون یافت نشد.' });
  const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
  if (!studentId) return res.status(400).json({ message: 'دانش‌آموز مشخص نشده است.' });
  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId);
  if (req.user.role === 'student' && studentId !== req.user.id) return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  if (req.user.role === 'counselor' && student?.counselor_id !== req.user.id && exam.created_by !== req.user.id) {
    return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'counselor' && req.user.role !== 'student') {
    return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  }
  const resRow = db.prepare('SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?').get(exam.id, studentId);
  if (!resRow) return res.status(404).json({ message: 'نتیجه آزمون یافت نشد.' });
  res.json({
    exam: {
      id: exam.id,
      title: exam.title,
      topicIds: safeJson(exam.topic_ids, []),
      durationMin: exam.duration_min,
      deadline: exam.deadline,
      questions: loadQuestions(safeJson(exam.question_ids, []), false),
    },
    student: userPublic(student),
    result: resultPublic(resRow),
  });
});

app.get('/api/exams/:id/results', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ message: 'آزمون یافت نشد.' });
  if (!counselorOwnsExam(req.user, exam)) return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  const ids = audienceOf(exam);
  const open = !ids.length || ids.includes('*') || ids.includes('all');
  let rows;
  if (open) {
    rows = db.prepare('SELECT * FROM exam_results WHERE exam_id = ?').all(exam.id).map((result) => ({
      student: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(result.student_id)),
      result: resultPublic(result),
    })).filter((row) => row.student);
  } else {
    rows = ids.map((stId) => {
      const student = db.prepare('SELECT * FROM users WHERE id = ?').get(stId);
      if (!student) return null;
      const result = db.prepare('SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?').get(exam.id, stId);
      return { student: userPublic(student), result: result ? resultPublic(result) : null };
    }).filter(Boolean);
  }
  const questions = loadQuestions(safeJson(exam.question_ids, []), false);
  const questionStats = questions.map((q) => {
    let answered = 0;
    let rights = 0;
    for (const row of rows) {
      if (!row.result) continue;
      const ans = row.result.answers[q.id];
      if (ans !== undefined && ans !== null) {
        answered++;
        if (ans === q.answer) rights++;
      }
    }
    return {
      questionId: q.id,
      text: q.text,
      topicId: q.topicId,
      answered,
      correctRate: answered ? Math.round((rights / answered) * 100) : null,
    };
  });
  res.json({
    exam: {
      id: exam.id,
      title: exam.title,
      topicIds: safeJson(exam.topic_ids, []),
      deadline: exam.deadline,
      durationMin: exam.duration_min,
      questions,
    },
    rows,
    questionStats,
  });
});

// ── Progress ──
app.get('/api/students/:id/progress', authRequired, (req, res) => {
  const student = loadStudent(req, res, req.params.id);
  if (!student) return;
  const now = new Date();
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - (13 - i));
    return isoDate(d);
  });
  const sessions = db.prepare('SELECT * FROM study_sessions WHERE student_id = ?').all(student.id);
  const studyByDay = days.map((d) => ({
    date: d,
    minutes: sessions.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0),
  }));
  const last7 = new Set(days.slice(7));
  const bySubject = SUBJECTS.map((s) => ({
    subjectId: s.id,
    minutes: sessions.filter((x) => x.subject_id === s.id && last7.has(x.date)).reduce((a, x) => a + x.minutes, 0),
  })).filter((x) => x.minutes > 0);
  const { start, end } = weekBounds();
  const tasks = db.prepare('SELECT done FROM tasks WHERE student_id = ? AND date >= ? AND date <= ?').all(student.id, start, end);
  const results = db.prepare('SELECT * FROM exam_results WHERE student_id = ? ORDER BY finished_at ASC').all(student.id);
  let streak = 0;
  for (let i = studyByDay.length - 1; i >= 0; i--) {
    if (studyByDay[i].minutes > 0) streak++;
    else if (i === studyByDay.length - 1) continue;
    else break;
  }
  const topicsMap = {};
  for (const r of results) {
    for (const t of safeJson(r.by_topic, [])) {
      const cur = (topicsMap[t.topicId] ||= { topicId: t.topicId, correct: 0, total: 0 });
      cur.correct += t.correct || 0;
      cur.total += t.total || 0;
    }
  }
  const topics = Object.values(topicsMap).map((t) => ({
    topicId: t.topicId,
    name: TOPICS.names[t.topicId] || t.topicId,
    subjectId: TOPICS.subjectOf[t.topicId] || null,
    correct: t.correct,
    total: t.total,
    accuracy: t.total ? Math.round((t.correct / t.total) * 100) : 0,
  })).sort((a, b) => a.accuracy - b.accuracy);
  const examRows = results.map((r) => {
    const exam = db.prepare('SELECT title FROM exams WHERE id = ?').get(r.exam_id);
    return { examId: r.exam_id, title: exam?.title || 'آزمون', score: r.percent, date: r.finished_at };
  });
  res.json({
    weekMinutes: studyByDay.slice(7).reduce((a, d) => a + d.minutes, 0),
    weekDone: tasks.filter((t) => t.done).length,
    weekTotal: tasks.length,
    streak,
    avgScore: results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null,
    studyByDay,
    bySubject,
    examTrend: examRows,
    topics,
  });
});

app.get('/api/study-sessions', authRequired, (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const sessions = db.prepare('SELECT * FROM study_sessions WHERE student_id = ? ORDER BY date DESC LIMIT ?').all(req.user.id, limit);
  res.json(sessions.map((s) => ({ ...s, subjectId: s.subject_id, studentId: s.student_id, taskId: s.task_id })));
});

app.post('/api/study-sessions', authRequired, requireRole('student'), (req, res) => {
  const minutes = Math.min(600, Math.max(1, Number(req.body?.minutes) || 0));
  const subjectId = req.body?.subjectId;
  if (!subjectId || !minutes) return res.status(400).json({ message: 'درس و مدت مطالعه الزامی است.' });
  const taskId = req.body?.taskId || null;
  if (taskId) {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task || task.student_id !== req.user.id) return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
    db.prepare('UPDATE tasks SET done = 1 WHERE id = ?').run(task.id);
  }
  db.prepare(`
    INSERT INTO study_sessions (id, student_id, date, subject_id, minutes, task_id, auto)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(uid('ss'), req.user.id, isoDate(), subjectId, minutes, taskId);
  res.json({ ok: true });
});

// ── Practice ──
app.get('/api/practice', authRequired, (req, res) => {
  let rows;
  if (req.user.role === 'student') {
    rows = db.prepare('SELECT * FROM practice WHERE student_id = ? ORDER BY created_at DESC').all(req.user.id);
  } else if (req.user.role === 'counselor') {
    if (req.query.studentId) {
      if (!ownsStudent(req.user, req.query.studentId)) return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
      rows = db.prepare('SELECT * FROM practice WHERE student_id = ? ORDER BY created_at DESC').all(req.query.studentId);
    } else {
      rows = db.prepare(`
        SELECT p.* FROM practice p
        JOIN users u ON u.id = p.student_id
        WHERE u.counselor_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user.id);
    }
  } else if (req.user.role === 'admin') {
    rows = db.prepare('SELECT * FROM practice ORDER BY created_at DESC').all();
  } else {
    return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  }
  res.json(rows.map((p) => ({
    id: p.id,
    title: p.title,
    topicId: p.topic_id,
    note: p.note,
    image: p.image,
    createdAt: p.created_at,
    status: p.status,
    feedback: p.feedback,
    score: p.score,
    student: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(p.student_id)),
  })));
});

app.post('/api/practice', authRequired, requireRole('student'), (req, res) => {
  const { title, topicId, note, image } = req.body || {};
  if (!title || !topicId) return res.status(400).json({ message: 'عنوان و مبحث کار عملی الزامی است.' });
  const saved = saveBase64Image(image, 'practice');
  if (saved.error) return res.status(400).json({ message: saved.error });
  const id = uid('p');
  const today = isoDate();
  db.prepare(`
    INSERT INTO practice (id, student_id, title, topic_id, note, image, created_at, status, feedback, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', null, null)
  `).run(id, req.user.id, String(title).slice(0, 120), topicId, note || '', saved.url, today);
  if (req.user.counselor_id) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, text, date, read, link)
      VALUES (?, ?, ?, ?, 0, '/c/practice')
    `).run(uid('n'), req.user.counselor_id, `${req.user.name} یک کار عملی جدید ارسال کرد.`, today);
  }
  res.json({ id });
});

app.post('/api/practice/:id/review', authRequired, requireRole('counselor', 'admin'), (req, res) => {
  const item = db.prepare('SELECT * FROM practice WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ message: 'کار عملی پیدا نشد.' });
  const student = studentById(item.student_id);
  if (req.user.role === 'counselor' && student?.counselor_id !== req.user.id) {
    return res.status(403).json({ message: 'به این بخش دسترسی ندارید.' });
  }
  const score = req.body?.score === '' || req.body?.score == null ? null : Number(req.body.score);
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 20)) {
    return res.status(400).json({ message: 'نمره باید بین ۰ و ۲۰ باشد.' });
  }
  db.prepare(`UPDATE practice SET status = 'reviewed', feedback = ?, score = ? WHERE id = ?`).run(req.body?.feedback || '', score, item.id);
  db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, 'مشاور برای کار عملی شما بازخورد ثبت کرد.', ?, 0, '/s/practice')
  `).run(uid('n'), item.student_id, isoDate());
  res.json({ ok: true });
});

app.get('/api/notifications', authRequired, (req, res) => {
  const list = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY date DESC LIMIT 20').all(req.user.id);
  res.json(list.map((n) => ({ ...n, read: Boolean(n.read) })));
});

app.post('/api/notifications/read', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

app.post('/api/ai/chat', authRequired, async (req, res) => {
  if (hitLimit(`aichat:${req.user.id}`, 30, 60 * 60 * 1000)) {
    return res.status(429).json({ message: 'تعداد پرسش از دستیار زیاد است. کمی بعد دوباره تلاش کنید.' });
  }
  const message = String(req.body?.message || '').trim().slice(0, 2000);
  if (!message) return res.status(400).json({ message: 'پیام خالی ارسال شده است.' });
  try {
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
    const reply = await askGeminiChat(message, history, { name: req.user.name });
    res.json({ text: reply, reply });
  } catch {
    res.status(500).json({ message: 'دستیار الان پاسخ نداد. دوباره تلاش کنید.' });
  }
});

// ── Chat ──
app.get('/api/chat/threads', authRequired, requireRole('counselor'), (req, res) => {
  const students = db.prepare("SELECT * FROM users WHERE role = 'student' AND counselor_id = ?").all(req.user.id);
  const threads = students.map((s) => {
    const lastMsg = db.prepare(`
      SELECT * FROM chat_messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `).get(req.user.id, s.id, s.id, req.user.id);
    const unreadRow = db.prepare(`
      SELECT COUNT(*) as c FROM chat_messages WHERE sender_id = ? AND receiver_id = ? AND read = 0
    `).get(s.id, req.user.id);
    return {
      student: userPublic(s),
      lastMessage: lastMsg ? { id: lastMsg.id, text: lastMsg.text, createdAt: lastMsg.created_at } : null,
      unreadCount: unreadRow?.c || 0,
    };
  });
  res.json(threads);
});

app.get('/api/chat/messages', authRequired, (req, res) => {
  const other = db.prepare('SELECT * FROM users WHERE id = ?').get(req.query.withUserId);
  if (!other) return res.json([]);
  if (!canChatPair(req.user, other)) return res.status(403).json({ message: 'به این گفتگو دسترسی ندارید.' });
  const messages = db.prepare(`
    SELECT * FROM chat_messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(req.user.id, other.id, other.id, req.user.id);
  db.prepare('UPDATE chat_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?').run(other.id, req.user.id);
  res.json(messages.map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    text: m.text,
    createdAt: m.created_at,
    read: Boolean(m.read),
  })));
});

app.post('/api/chat/messages', authRequired, (req, res) => {
  const text = String(req.body?.text || '').trim().slice(0, 2000);
  if (!text) return res.status(400).json({ message: 'متن پیام خالی است.' });
  const other = db.prepare('SELECT * FROM users WHERE id = ?').get(req.body?.toUserId);
  if (!other || !canChatPair(req.user, other)) return res.status(403).json({ message: 'به این گفتگو دسترسی ندارید.' });
  const id = uid('m');
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO chat_messages (id, sender_id, receiver_id, text, created_at, read)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(id, req.user.id, other.id, text, createdAt);
  db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(
    uid('n'),
    other.id,
    `پیام جدید از طرف ${req.user.name}`,
    createdAt.slice(0, 10),
    req.user.role === 'counselor' ? '/s/chat' : `/c/chat?student=${req.user.id}`,
  );
  res.json({ id, senderId: req.user.id, receiverId: other.id, text, createdAt, read: false });
});

// ── Admin ──
app.get('/api/admin/stats', authRequired, requireRole('admin'), (req, res) => {
  const counselors = db.prepare("SELECT * FROM users WHERE role = 'counselor'").all();
  let monthlyRevenue = 0;
  for (const c of counselors) {
    if (c.status !== 'active') continue;
    const plan = PLANS.find((x) => x.id === c.plan);
    if (plan?.price) monthlyRevenue += plan.price;
  }
  res.json({
    counselors: counselors.length,
    activeCounselors: counselors.filter((c) => c.status === 'active').length,
    students: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get().c,
    exams: db.prepare('SELECT COUNT(*) as c FROM exams').get().c,
    monthlyRevenue,
    questions: db.prepare('SELECT COUNT(*) as c FROM questions').get().c,
  });
});

app.get('/api/admin/settings/sms', authRequired, requireRole('admin'), (req, res) => {
  const rowKey = db.prepare("SELECT value FROM settings WHERE key = 'sms_api_key'").get();
  const rowTpl = db.prepare("SELECT value FROM settings WHERE key = 'sms_template_id'").get();
  const apiKey = rowKey?.value || process.env.SMS_IR_API_KEY || '';
  res.json({
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : '',
    hasApiKey: Boolean(apiKey),
    templateId: rowTpl?.value || process.env.SMS_IR_TEMPLATE_ID || '',
  });
});

app.post('/api/admin/settings/sms', authRequired, requireRole('admin'), (req, res) => {
  const { apiKey, templateId } = req.body || {};
  if (apiKey) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('sms_api_key', ?)").run(String(apiKey).trim());
  if (templateId !== undefined) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('sms_template_id', ?)").run(String(templateId).trim());
  }
  res.json({ ok: true, message: 'تنظیمات پیامک با موفقیت ذخیره شد.' });
});

app.get('/api/admin/counselors', authRequired, requireRole('admin'), (req, res) => {
  const list = db.prepare("SELECT * FROM users WHERE role = 'counselor'").all();
  res.json(list.map((c) => ({
    ...userPublic(c),
    studentCount: db.prepare("SELECT COUNT(*) as c FROM users WHERE counselor_id = ? AND role = 'student'").get(c.id).c,
    examCount: db.prepare('SELECT COUNT(*) as c FROM exams WHERE created_by = ?').get(c.id).c,
  })));
});

app.post('/api/admin/counselors', authRequired, requireRole('admin'), (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = normalizePhone(req.body?.phone);
  if (!name || !/^09\d{9}$/.test(phone)) return res.status(400).json({ message: 'نام و شماره موبایل معتبر الزامی است.' });
  if (db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)) return res.status(400).json({ message: 'این شماره قبلاً ثبت شده است.' });
  const plan = PLANS.some((p) => p.id === req.body?.plan) ? req.body.plan : 'trial';
  const id = uid('c');
  db.prepare(`
    INSERT INTO users (id, role, name, phone, field, color, counselor_id, plan, status, renew_at, speciality)
    VALUES (?, 'counselor', ?, ?, null, '#e5446d', null, ?, 'active', ?, 'مشاور کنکور هنر')
  `).run(id, name.slice(0, 80), phone, plan, isoDate(new Date(Date.now() + 30 * 86400000)));
  res.json(userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

app.patch('/api/admin/counselors/:id', authRequired, requireRole('admin'), (req, res) => {
  const counselor = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'counselor'").get(req.params.id);
  if (!counselor) return res.status(404).json({ message: 'مشاور پیدا نشد.' });
  const { status, plan } = req.body || {};
  if (status && !['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'وضعیت نامعتبر است.' });
  if (plan && !PLANS.some((p) => p.id === plan)) return res.status(400).json({ message: 'پلن نامعتبر است.' });
  if (status) db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, counselor.id);
  if (plan) db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, counselor.id);
  if (status === 'suspended') db.prepare('DELETE FROM tokens WHERE user_id = ?').run(counselor.id);
  res.json(userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(counselor.id)));
});

app.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }));
app.use(express.static(staticDir, {
  setHeaders: (res, filePath) => {
    if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(resolve(staticDir, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'خطای داخلی سرور.' });
});

const PORT = process.env.PORT || 8000;
if (!process.env.NAGHSHYAR_NO_LISTEN) {
  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

export { app };
