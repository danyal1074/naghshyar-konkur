import express from 'express';
import cors from 'cors';
import { randomBytes } from 'node:crypto';
import { db, initDb } from './db.js';
import { SUBJECTS, PLANS, TEMPLATES, FIELDS } from './seedData.js';
import { askGeminiChat, generateGeminiQuestions } from './gemini.js';

initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ── Auth Middleware ──
function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  const tokRow = db.prepare('SELECT user_id FROM tokens WHERE token = ?').get(token);
  if (!tokRow) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(tokRow.user_id) || null;
}

function authRequired(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: 'لطفاً ابتدا وارد سامانه شوید.' });
  req.user = user;
  next();
}

const uid = (p) => `${p}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

// ── Auth Endpoints ──
app.post('/api/auth/otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'شماره موبایل را وارد کنید.' });
  const cleanPhone = String(phone).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
  if (!/^09\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ message: 'شماره موبایل ۱۱ رقمی معتبر وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹).' });
  }
  const u = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
  // Send OTP (in dev/demo, code is 12345)
  res.json({ ok: true, isNew: !u });
});

app.post('/api/auth/verify', (req, res) => {
  const { phone, code, name, role, field } = req.body;
  const cleanPhone = String(phone).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
  if (code !== '12345') return res.status(400).json({ message: 'کد تأیید نادرست است. (کد نمونه: ۱۲۳۴۵)' });

  let u = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
  if (!u) {
    if (!name?.trim()) {
      return res.status(200).json({ needsProfile: true });
    }
    const userRole = role === 'counselor' ? 'counselor' : 'student';
    const id = uid(userRole === 'counselor' ? 'c' : 's');
    const color = userRole === 'counselor' ? '#e5446d' : '#2b3fd6';
    db.prepare(`
      INSERT INTO users (id, role, name, phone, field, color, counselor_id, plan, status, renew_at, speciality)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', null, ?)
    `).run(
      id,
      userRole,
      name.trim(),
      cleanPhone,
      userRole === 'student' ? (field || 'گرافیک') : null,
      color,
      userRole === 'student' ? 'c1' : null,
      userRole === 'counselor' ? 'trial' : null,
      userRole === 'counselor' ? 'مشاور کنکور هنر' : null
    );
    u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  const token = `tok_${randomBytes(16).toString('hex')}`;
  db.prepare('INSERT INTO tokens (token, user_id, created_at) VALUES (?, ?, ?)').run(token, u.id, new Date().toISOString());
  res.json({ token, user: u });
});

app.post('/api/auth/demo-login', (req, res) => {
  const { role } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get(role || 'student');
  if (!u) return res.status(404).json({ message: 'حساب نمونه یافت نشد.' });
  const token = `tok_${randomBytes(16).toString('hex')}`;
  db.prepare('INSERT INTO tokens (token, user_id, created_at) VALUES (?, ?, ?)').run(token, u.id, new Date().toISOString());
  res.json({ token, user: u });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json(req.user);
});

// ── Basic Lookups ──
app.get('/api/syllabus', (req, res) => res.json(SUBJECTS));
app.get('/api/plan-templates', (req, res) => res.json(TEMPLATES));
app.get('/api/plans', (req, res) => res.json(PLANS));
app.get('/api/fields', (req, res) => res.json(FIELDS));

// ── Counselor: Students ──
app.get('/api/students', authRequired, (req, res) => {
  const counselorId = req.user.role === 'counselor' ? req.user.id : req.query.counselorId || 'c1';
  const students = db.prepare("SELECT * FROM users WHERE role = 'student' AND counselor_id = ?").all(counselorId);

  const now = new Date();
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;

  const items = students.map((s) => {
    const tasks = db.prepare('SELECT * FROM tasks WHERE student_id = ?').all(s.id);
    const pastTasks = tasks.filter((t) => t.date <= today);
    const pastDone = pastTasks.filter((t) => t.done).length;
    const pastRate = pastTasks.length ? pastDone / pastTasks.length : null;

    let status = 'good';
    if (!tasks.length) status = 'noplan';
    else if (pastRate !== null) status = pastRate >= 0.7 ? 'good' : pastRate >= 0.4 ? 'warn' : 'late';

    const results = db.prepare('SELECT percent FROM exam_results WHERE student_id = ?').all(s.id);
    const avgScore = results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null;

    return {
      ...s,
      weekDone: tasks.filter((t) => t.done).length,
      weekTotal: tasks.length,
      pastRate,
      lastActive: today,
      avgScore,
      status,
      pendingExams: 0,
    };
  });

  const plan = PLANS.find((p) => p.id === req.user.plan) || PLANS[1];
  res.json({ items, limit: plan.studentLimit, planId: plan.id });
});

app.get('/api/students/:id', authRequired, (req, res) => {
  const s = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ message: 'دانش‌آموز یافت نشد.' });

  const now = new Date();
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;

  const tasks = db.prepare('SELECT * FROM tasks WHERE student_id = ?').all(s.id);
  const pastTasks = tasks.filter((t) => t.date <= today);
  const pastDone = pastTasks.filter((t) => t.done).length;
  const pastRate = pastTasks.length ? pastDone / pastTasks.length : null;

  let status = 'good';
  if (!tasks.length) status = 'noplan';
  else if (pastRate !== null) status = pastRate >= 0.7 ? 'good' : pastRate >= 0.4 ? 'warn' : 'late';

  const results = db.prepare('SELECT percent FROM exam_results WHERE student_id = ?').all(s.id);
  const avgScore = results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null;

  res.json({
    ...s,
    status,
    avgScore,
    weekDone: tasks.filter((t) => t.done).length,
    weekTotal: tasks.length,
    lastActive: today,
    pastRate,
  });
});

app.post('/api/students', authRequired, (req, res) => {
  const { name, phone, field } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'نام دانش‌آموز الزامی است.' });
  const cleanPhone = String(phone).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
  if (!/^09\d{9}$/.test(cleanPhone)) return res.status(400).json({ message: 'شماره موبایل معتبر نیست.' });

  const exists = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
  if (exists) return res.status(400).json({ message: 'این شماره قبلاً ثبت شده است.' });

  const id = uid('s');
  db.prepare(`
    INSERT INTO users (id, role, name, phone, field, color, counselor_id, plan, status, renew_at)
    VALUES (?, 'student', ?, ?, ?, '#2b3fd6', ?, null, 'active', null)
  `).run(id, name.trim(), cleanPhone, field || 'گرافیک', req.user.id);

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json(newUser);
});

// ── Plans & Tasks ──
app.get('/api/students/:id/tasks', authRequired, (req, res) => {
  const studentId = req.params.id === 'me' ? req.user.id : req.params.id;
  const { from, to } = req.query;
  let q = 'SELECT * FROM tasks WHERE student_id = ?';
  const args = [studentId];
  if (from && to) {
    q += ' AND date >= ? AND date <= ?';
    args.push(from, to);
  }
  q += ' ORDER BY date ASC';
  const tasks = db.prepare(q).all(...args);
  res.json(tasks.map((t) => ({ ...t, done: Boolean(t.done) })));
});

app.post('/api/students/:id/tasks', authRequired, (req, res) => {
  const studentId = req.params.id === 'me' ? req.user.id : req.params.id;
  const { date, subjectId, topicId, type, minutes, note, title } = req.body;
  const id = uid('t');
  db.prepare(`
    INSERT INTO tasks (id, student_id, date, subject_id, topic_id, type, minutes, title, note, done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, studentId, date, subjectId, topicId, type || 'study', Number(minutes) || 60, title || `${type} ${topicId}`, note || '');
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json({ ...task, done: false });
});

app.patch('/api/tasks/:id', authRequired, (req, res) => {
  const { date, subjectId, topicId, type, minutes, note, title, done } = req.body;
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ message: 'تسک پیدا نشد.' });

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
    minutes !== undefined ? Number(minutes) : null,
    note ?? null,
    title ?? null,
    done !== undefined ? (done ? 1 : 0) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ ...updated, done: Boolean(updated.done) });
});

app.delete('/api/tasks/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/tasks/:id/done', authRequired, (req, res) => {
  const doneVal = req.body.done ? 1 : 0;
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(doneVal, req.params.id);
  res.json({ done: Boolean(doneVal) });
});

app.post('/api/students/:id/plan/template', authRequired, (req, res) => {
  const { templateId, weekStart } = req.body;
  const studentId = req.params.id === 'me' ? req.user.id : req.params.id;
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return res.status(404).json({ message: 'قالب پیدا نشد.' });

  const insert = db.prepare(`
    INSERT INTO tasks (id, student_id, date, subject_id, topic_id, type, minutes, title, note, done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const [y, m, d] = weekStart.split('-').map(Number);
  const base = new Date(y, m - 1, d);

  for (const t of tpl.tasks) {
    const taskDate = new Date(base);
    taskDate.setDate(taskDate.getDate() + t.day);
    const iso = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
    insert.run(uid('t'), studentId, iso, t.subjectId, t.topicId, t.type, t.minutes, t.title || `${t.type} ${t.topicId}`, t.note || '');
  }

  res.json({ added: tpl.tasks.length });
});

app.post('/api/students/:id/plan/copy-week', authRequired, (req, res) => {
  const { fromWeekStart, toWeekStart } = req.body;
  const studentId = req.params.id === 'me' ? req.user.id : req.params.id;

  const [fy, fm, fd] = fromWeekStart.split('-').map(Number);
  const fStart = new Date(fy, fm - 1, fd);
  const fEnd = new Date(fStart);
  fEnd.setDate(fEnd.getDate() + 6);
  const fEndISO = `${fEnd.getFullYear()}-${String(fEnd.getMonth() + 1).padStart(2, '0')}-${String(fEnd.getDate()).padStart(2, '0')}`;

  const tasks = db.prepare('SELECT * FROM tasks WHERE student_id = ? AND date >= ? AND date <= ?').all(studentId, fromWeekStart, fEndISO);

  const [ty, tm, td] = toWeekStart.split('-').map(Number);
  const tStart = new Date(ty, tm - 1, td);

  const insert = db.prepare(`
    INSERT INTO tasks (id, student_id, date, subject_id, topic_id, type, minutes, title, note, done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  for (const t of tasks) {
    const dObj = new Date(t.date);
    const diffDays = Math.round((dObj - fStart) / 86400000);
    const newDate = new Date(tStart);
    newDate.setDate(newDate.getDate() + diffDays);
    const newISO = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    insert.run(uid('t'), studentId, newISO, t.subject_id, t.topic_id, t.type, t.minutes, t.title, t.note);
  }

  res.json({ added: tasks.length });
});

app.delete('/api/students/:id/plan/week', authRequired, (req, res) => {
  const { weekStart } = req.query;
  const studentId = req.params.id === 'me' ? req.user.id : req.params.id;
  const [y, m, d] = weekStart.split('-').map(Number);
  const wStart = new Date(y, m - 1, d);
  const wEnd = new Date(wStart);
  wEnd.setDate(wEnd.getDate() + 6);
  const wEndISO = `${wEnd.getFullYear()}-${String(wEnd.getMonth() + 1).padStart(2, '0')}-${String(wEnd.getDate()).padStart(2, '0')}`;

  const info = db.prepare('DELETE FROM tasks WHERE student_id = ? AND date >= ? AND date <= ?').run(studentId, weekStart, wEndISO);
  res.json({ removed: info.changes });
});

app.post('/api/students/:id/plan/publish', authRequired, (req, res) => {
  const studentId = req.params.id;
  db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, 'مشاور برنامه‌ی جدید شما را منتشر کرد.', ?, 0, '/s/plan')
  `).run(uid('n'), studentId, new Date().toISOString().slice(0, 10));
  res.json({ ok: true });
});

// ── Question Bank ──
app.get('/api/questions', authRequired, (req, res) => {
  const { subjectId, topicId, q } = req.query;
  let sql = 'SELECT * FROM questions WHERE 1=1';
  const args = [];
  if (topicId) {
    sql += ' AND topic_id = ?';
    args.push(topicId);
  }
  if (q) {
    sql += ' AND text LIKE ?';
    args.push(`%${q}%`);
  }
  sql += ' ORDER BY id DESC';
  const list = db.prepare(sql).all(...args);
  res.json(list.map((item) => ({ ...item, options: JSON.parse(item.options) })));
});

app.post('/api/questions', authRequired, (req, res) => {
  const { topicId, text, options, answer, explanation, difficulty } = req.body;
  const id = uid('q');
  db.prepare(`
    INSERT INTO questions (id, topic_id, text, options, answer, explanation, difficulty, owner_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'counselor')
  `).run(id, topicId, text, JSON.stringify(options), Number(answer) || 0, explanation || '', difficulty || 'medium', req.user.id);
  res.json({ id, topicId, text, options, answer, explanation, difficulty, source: 'counselor' });
});

app.put('/api/questions/:id', authRequired, (req, res) => {
  const { topicId, text, options, answer, explanation, difficulty } = req.body;
  db.prepare(`
    UPDATE questions SET topic_id = ?, text = ?, options = ?, answer = ?, explanation = ?, difficulty = ?
    WHERE id = ?
  `).run(topicId, text, JSON.stringify(options), Number(answer) || 0, explanation || '', difficulty || 'medium', req.params.id);
  res.json({ id: req.params.id, topicId, text, options, answer, explanation, difficulty });
});

app.delete('/api/questions/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/ai/questions', authRequired, async (req, res) => {
  const { count = 3, topicIds = ['iran_art'], difficulty = 'medium' } = req.body;
  const topicNamesMap = {};
  for (const s of SUBJECTS) {
    for (const t of s.topics) {
      topicNamesMap[t.id] = t.name;
    }
  }
  const questions = await generateGeminiQuestions(topicIds, Number(count) || 3, difficulty, topicNamesMap);
  res.json(questions);
});

// ── Exams ──
app.get('/api/exams', authRequired, (req, res) => {
  const isStudent = req.user.role === 'student';
  const list = db.prepare('SELECT * FROM exams ORDER BY created_at DESC').all();

  const out = list.map((e) => {
    const qIds = JSON.parse(e.question_ids);
    const sIds = JSON.parse(e.student_ids);
    const topicIds = JSON.parse(e.topic_ids);

    if (isStudent) {
      const isEligible = !sIds.length || sIds.includes('*') || sIds.includes('all') || sIds.includes(req.user.id);
      if (!isEligible) return null;

      const resRow = db.prepare('SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?').get(e.id, req.user.id);
      return {
        id: e.id,
        title: e.title,
        topicIds,
        questionCount: qIds.length,
        durationMin: e.duration_min,
        deadline: e.deadline,
        status: resRow ? 'done' : 'new',
        score: resRow ? resRow.percent : null,
        finishedAt: resRow ? resRow.finished_at : null,
      };
    } else {
      const results = db.prepare('SELECT * FROM exam_results WHERE exam_id = ?').all(e.id);
      const avg = results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null;
      return {
        id: e.id,
        title: e.title,
        topicIds,
        questionCount: qIds.length,
        durationMin: e.duration_min,
        deadline: e.deadline,
        createdAt: e.created_at,
        sent: sIds.length,
        submitted: results.length,
        avg,
      };
    }
  });

  res.json(out.filter(Boolean));
});

app.post('/api/exams', authRequired, (req, res) => {
  const { title, topicIds, questionIds = [], newQuestions = [], studentIds = [], durationMin, deadline } = req.body;
  const insertQ = db.prepare(`
    INSERT INTO questions (id, topic_id, text, options, answer, explanation, difficulty, owner_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ai')
  `);

  const allQIds = [...questionIds];
  for (const q of newQuestions) {
    const qid = uid('q');
    insertQ.run(qid, q.topicId, q.text, JSON.stringify(q.options), q.answer, q.explanation, q.difficulty, req.user.id);
    allQIds.push(qid);
  }

  const examId = uid('e');
  db.prepare(`
    INSERT INTO exams (id, title, created_by, topic_ids, question_ids, student_ids, duration_min, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(examId, title, req.user.id, JSON.stringify(topicIds), JSON.stringify(allQIds), JSON.stringify(studentIds), Number(durationMin) || 15, deadline || null, new Date().toISOString().slice(0, 10));

  for (const stId of studentIds) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, text, date, read, link)
      VALUES (?, ?, ?, ?, 0, '/s/exams')
    `).run(uid('n'), stId, `آزمون جدید «${title}» برای شما فعال شد.`, new Date().toISOString().slice(0, 10));
  }

  res.json({ id: examId });
});

app.post('/api/exams/self', authRequired, (req, res) => {
  const { title, topicIds = ['iran_art'], count = 10 } = req.body;
  const allQs = db.prepare('SELECT id, topic_id FROM questions').all();
  let matched = allQs.filter((q) => topicIds.includes(q.topic_id)).map((q) => q.id);

  if (matched.length < count) {
    const insertQ = db.prepare(`
      INSERT INTO questions (id, topic_id, text, options, answer, explanation, difficulty, owner_id, source)
      VALUES (?, ?, ?, ?, 0, 'پاسخ تشریحی خودسنجی کنکور هنر', 'medium', ?, 'ai')
    `);
    while (matched.length < count) {
      const qid = uid('q');
      const tId = topicIds[matched.length % topicIds.length];
      insertQ.run(qid, tId, `سؤال خودسنجی مبحث ${tId} شماره ${matched.length + 1}`, JSON.stringify(['گزینه الف (صحیح)', 'گزینه ب', 'گزینه ج', 'گزینه د']), req.user.id);
      matched.push(qid);
    }
  }

  const selectedIds = matched.slice(0, count);
  const examId = uid('e');
  const examTitle = title || `آزمون خودسنجی (${count} سؤال)`;
  db.prepare(`
    INSERT INTO exams (id, title, created_by, topic_ids, question_ids, student_ids, duration_min, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, null, ?)
  `).run(examId, examTitle, req.user.id, JSON.stringify(topicIds), JSON.stringify(selectedIds), JSON.stringify([req.user.id]), Math.max(5, Math.round(count * 1.2)), new Date().toISOString().slice(0, 10));

  res.json({ id: examId });
});

app.get('/api/exams/:id', authRequired, (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ message: 'آزمون یافت نشد.' });

  const qIds = JSON.parse(exam.question_ids);
  const questions = qIds.map((qid) => {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    if (!q) return null;
    return { ...q, options: JSON.parse(q.options) };
  }).filter(Boolean);

  const resRow = db.prepare('SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?').get(exam.id, req.user.id);
  res.json({
    id: exam.id,
    title: exam.title,
    durationMin: exam.duration_min,
    deadline: exam.deadline,
    topicIds: JSON.parse(exam.topic_ids),
    questions,
    alreadyDone: Boolean(resRow),
  });
});

app.post('/api/exams/:id/submit', authRequired, (req, res) => {
  const { answers = {}, spentSec = 300 } = req.body;
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ message: 'آزمون یافت نشد.' });

  const qIds = JSON.parse(exam.question_ids);
  let correct = 0, wrong = 0, blank = 0;
  const byTopicMap = {};

  for (const qid of qIds) {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    if (!q) continue;
    const t = (byTopicMap[q.topic_id] ||= { topicId: q.topic_id, correct: 0, wrong: 0, total: 0 });
    t.total++;
    const userAns = answers[qid];
    if (userAns === undefined || userAns === null) {
      blank++;
    } else if (Number(userAns) === q.answer) {
      correct++;
      t.correct++;
    } else {
      wrong++;
      t.wrong++;
    }
  }

  const raw = correct - (wrong / 3);
  const percent = qIds.length ? Math.max(0, Math.round((raw / qIds.length) * 100)) : 0;
  const resId = uid('r');

  db.prepare(`
    INSERT INTO exam_results (id, exam_id, student_id, answers, finished_at, spent_sec, correct, wrong, blank, percent, by_topic)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(resId, exam.id, req.user.id, JSON.stringify(answers), new Date().toISOString().slice(0, 10), Math.round(spentSec), correct, wrong, blank, percent, JSON.stringify(Object.values(byTopicMap)));

  res.json({ id: resId, percent, correct, wrong, blank });
});

app.get('/api/exams/:id/result', authRequired, (req, res) => {
  const examId = req.params.id;
  const studentId = req.query.studentId || req.user.id;
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  const resRow = db.prepare('SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?').get(examId, studentId);
  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId);

  if (!exam || !resRow) return res.status(404).json({ message: 'نتیجه آزمون یافت نشد.' });

  const qIds = JSON.parse(exam.question_ids);
  const questions = qIds.map((qid) => {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    return q ? { ...q, options: JSON.parse(q.options) } : null;
  }).filter(Boolean);

  res.json({
    exam: { ...exam, questions, topicIds: JSON.parse(exam.topic_ids) },
    student,
    result: {
      ...resRow,
      answers: JSON.parse(resRow.answers),
      byTopic: JSON.parse(resRow.by_topic),
    },
  });
});

app.get('/api/exams/:id/results', authRequired, (req, res) => {
  const examId = req.params.id;
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ message: 'آزمون یافت نشد.' });

  const studentIds = JSON.parse(exam.student_ids);
  const rows = studentIds.map((stId) => {
    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(stId);
    const result = db.prepare('SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?').get(examId, stId);
    return {
      student,
      result: result ? { ...result, answers: JSON.parse(result.answers), byTopic: JSON.parse(result.by_topic) } : null,
    };
  });

  const qIds = JSON.parse(exam.question_ids);
  const questions = qIds.map((qid) => {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    return q ? { ...q, options: JSON.parse(q.options) } : null;
  }).filter(Boolean);

  const questionStats = questions.map((q) => {
    let answered = 0, rights = 0;
    for (const r of rows) {
      if (!r.result) continue;
      const ans = r.result.answers[q.id];
      if (ans !== undefined) {
        answered++;
        if (ans === q.answer) rights++;
      }
    }
    return {
      questionId: q.id,
      text: q.text,
      topicId: q.topic_id,
      answered,
      correctRate: answered ? Math.round((rights / answered) * 100) : null,
    };
  });

  res.json({
    exam: { ...exam, questions, topicIds: JSON.parse(exam.topic_ids) },
    rows,
    questionStats,
  });
});

// ── Progress & Study ──
app.get('/api/students/:id/progress', authRequired, (req, res) => {
  const studentId = req.params.id === 'me' ? req.user.id : req.params.id;
  const now = new Date();
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const sessions = db.prepare('SELECT * FROM study_sessions WHERE student_id = ?').all(studentId);
  const studyByDay = days.map((d) => ({
    date: d,
    minutes: sessions.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0),
  }));

  const bySubject = SUBJECTS.map((s) => ({
    subjectId: s.id,
    minutes: sessions.filter((x) => x.subject_id === s.id).reduce((a, x) => a + x.minutes, 0),
  })).filter((x) => x.minutes > 0);

  const tasks = db.prepare('SELECT * FROM tasks WHERE student_id = ?').all(studentId);
  const results = db.prepare('SELECT * FROM exam_results WHERE student_id = ?').all(studentId);
  const avgScore = results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null;

  const topicsMap = {};
  for (const r of results) {
    const bt = JSON.parse(r.by_topic);
    for (const t of bt) {
      const cur = (topicsMap[t.topicId] ||= { topicId: t.topicId, correct: 0, total: 0 });
      cur.correct += t.correct;
      cur.total += t.total;
    }
  }

  const topicAcc = Object.values(topicsMap).map((t) => ({
    ...t,
    accuracy: t.total ? Math.round((t.correct / t.total) * 100) : 0,
    name: t.topicId,
  }));

  res.json({
    weekMinutes: studyByDay.slice(7).reduce((a, d) => a + d.minutes, 0),
    weekDone: tasks.filter((t) => t.done).length,
    weekTotal: tasks.length,
    streak: 5,
    avgScore,
    studyByDay,
    bySubject,
    examTrend: results.map((r, i) => ({ examId: r.exam_id, title: `آزمون ${i + 1}`, score: r.percent, date: r.finished_at })),
    topics: topicAcc,
  });
});

app.get('/api/study-sessions', authRequired, (req, res) => {
  const sessions = db.prepare('SELECT * FROM study_sessions WHERE student_id = ? ORDER BY date DESC LIMIT 10').all(req.user.id);
  res.json(sessions.map((s) => ({ ...s, subjectId: s.subject_id })));
});

app.post('/api/study-sessions', authRequired, (req, res) => {
  const { subjectId, minutes, taskId } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO study_sessions (id, student_id, date, subject_id, minutes, task_id, auto)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(uid('ss'), req.user.id, today, subjectId, Number(minutes), taskId || null);

  if (taskId) {
    db.prepare('UPDATE tasks SET done = 1 WHERE id = ?').run(taskId);
  }

  res.json({ ok: true });
});

// ── Practice ──
app.get('/api/practice', authRequired, (req, res) => {
  const isCounselor = req.user.role === 'counselor';
  const studentId = req.query.studentId;

  let sql = 'SELECT * FROM practice';
  const args = [];
  if (!isCounselor) {
    sql += ' WHERE student_id = ?';
    args.push(req.user.id);
  } else if (studentId) {
    sql += ' WHERE student_id = ?';
    args.push(studentId);
  }
  sql += ' ORDER BY created_at DESC';

  const list = db.prepare(sql).all(...args);
  const out = list.map((p) => {
    const student = db.prepare('SELECT id, name, field, color FROM users WHERE id = ?').get(p.student_id);
    return {
      id: p.id,
      title: p.title,
      topicId: p.topic_id,
      note: p.note,
      image: p.image,
      createdAt: p.created_at,
      status: p.status,
      feedback: p.feedback,
      score: p.score,
      student,
    };
  });
  res.json(out);
});

app.post('/api/practice', authRequired, (req, res) => {
  const { title, topicId, note, image } = req.body;
  const id = uid('p');
  const today = new Date().toISOString().slice(0, 10);
  const savedImage = saveBase64Image(image, 'practice');
  db.prepare(`
    INSERT INTO practice (id, student_id, title, topic_id, note, image, created_at, status, feedback, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', null, null)
  `).run(id, req.user.id, title, topicId, note || '', savedImage, today);

  // Notify counselor
  if (req.user.counselor_id) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, text, date, read, link)
      VALUES (?, ?, ?, ?, 0, '/c/practice')
    `).run(uid('n'), req.user.counselor_id, `${req.user.name} یک کار عملی جدید ارسال کرد.`, today);
  }

  res.json({ id });
});

app.post('/api/practice/:id/review', authRequired, (req, res) => {
  const { feedback, score } = req.body;
  const p = db.prepare('SELECT * FROM practice WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ message: 'کار عملی پیدا نشد.' });

  db.prepare(`
    UPDATE practice SET status = 'reviewed', feedback = ?, score = ? WHERE id = ?
  `).run(feedback, score !== '' ? Number(score) : null, req.params.id);

  // Notify student
  db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, 'مشاور برای کار عملی شما بازخورد ثبت کرد.', ?, 0, '/s/practice')
  `).run(uid('n'), p.student_id, new Date().toISOString().slice(0, 10));

  res.json({ ok: true });
});

// ── Notifications ──
app.get('/api/notifications', authRequired, (req, res) => {
  const list = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY date DESC LIMIT 20').all(req.user.id);
  res.json(list.map((n) => ({ ...n, read: Boolean(n.read) })));
});

app.post('/api/notifications/read', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ── AI Assistant ──
app.post('/api/ai/chat', authRequired, async (req, res) => {
  const { message, history } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ message: 'پیام خالی ارسال شده است.' });
  }
  const reply = await askGeminiChat(message.trim(), history || [], req.user);
  res.json({ text: reply, reply: reply });
});

// ── Online Chat ──
app.get('/api/chat/threads', authRequired, (req, res) => {
  const counselorId = req.user.id;
  const students = db.prepare("SELECT id, name, field, color FROM users WHERE role = 'student' AND counselor_id = ?").all(counselorId);

  const threads = students.map((s) => {
    const lastMsg = db.prepare(`
      SELECT * FROM chat_messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `).get(counselorId, s.id, s.id, counselorId);

    const unreadRow = db.prepare(`
      SELECT COUNT(*) as c FROM chat_messages
      WHERE sender_id = ? AND receiver_id = ? AND read = 0
    `).get(s.id, counselorId);

    return {
      student: s,
      lastMessage: lastMsg ? { id: lastMsg.id, text: lastMsg.text, createdAt: lastMsg.created_at } : null,
      unreadCount: unreadRow?.c || 0,
    };
  });

  res.json(threads);
});

app.get('/api/chat/messages', authRequired, (req, res) => {
  const currentUserId = req.user.id;
  const withUserId = req.query.withUserId;
  if (!withUserId) return res.json([]);

  const messages = db.prepare(`
    SELECT * FROM chat_messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(currentUserId, withUserId, withUserId, currentUserId);

  // Mark messages from other user as read
  db.prepare('UPDATE chat_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?').run(withUserId, currentUserId);

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
  const { toUserId, text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'متن پیام خالی است.' });

  const id = uid('m');
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO chat_messages (id, sender_id, receiver_id, text, created_at, read)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(id, req.user.id, toUserId, text.trim(), createdAt);

  // Send notification to receiver
  db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(
    uid('n'),
    toUserId,
    `پیام جدید از طرف ${req.user.name}`,
    createdAt.slice(0, 10),
    req.user.role === 'counselor' ? '/s/chat' : `/c/chat?student=${req.user.id}`
  );

  res.json({ id, senderId: req.user.id, receiverId: toUserId, text: text.trim(), createdAt, read: false });
});

// ── Admin ──
app.get('/api/admin/stats', authRequired, (req, res) => {
  const counselors = db.prepare("SELECT * FROM users WHERE role = 'counselor'").all();
  const students = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get().c;
  const exams = db.prepare('SELECT COUNT(*) as c FROM exams').get().c;
  const activeCounselors = counselors.filter((c) => c.status === 'active').length;

  let monthlyRevenue = 0;
  for (const c of counselors) {
    const p = PLANS.find((x) => x.id === c.plan);
    if (p && p.price) monthlyRevenue += p.price;
  }

  res.json({
    counselors: counselors.length,
    activeCounselors,
    students,
    exams,
    monthlyRevenue,
    questions: db.prepare('SELECT COUNT(*) as c FROM questions').get().c,
  });
});

app.get('/api/admin/counselors', authRequired, (req, res) => {
  const list = db.prepare("SELECT * FROM users WHERE role = 'counselor'").all();
  const out = list.map((c) => {
    const studentCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE counselor_id = ?').get(c.id).c;
    const examCount = db.prepare('SELECT COUNT(*) as c FROM exams WHERE created_by = ?').get(c.id).c;
    return {
      ...c,
      renewAt: c.renew_at,
      studentCount,
      examCount,
    };
  });
  res.json(out);
});

app.post('/api/admin/counselors', authRequired, (req, res) => {
  const { name, phone, plan } = req.body;
  const id = uid('c');
  db.prepare(`
    INSERT INTO users (id, role, name, phone, field, color, counselor_id, plan, status, renew_at, speciality)
    VALUES (?, 'counselor', ?, ?, null, '#e5446d', null, ?, 'active', ?, 'مشاور کنکور هنر')
  `).run(id, name, phone, plan || 'trial', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
});

app.patch('/api/admin/counselors/:id', authRequired, (req, res) => {
  const { status, plan } = req.body;
  if (status) db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  if (plan) db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, req.params.id);
  res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id));
});

// Serve frontend build directly on port 8000
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(__dirname, '../naghshyar-demo-build');
const uploadsDir = resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function saveBase64Image(dataUri, prefix = 'img') {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) return dataUri;
  try {
    const matches = dataUri.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) return dataUri;
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const filePath = resolve(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving image to disk:', err);
    return dataUri;
  }
}

app.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }));
app.use(express.static(staticDir, {
  setHeaders: (res, path) => {
    if (path.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));
app.use((req, res, next) => {
  if (req.path.includes('/assets/')) {
    const assetSub = req.path.substring(req.path.indexOf('/assets/'));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(resolve(staticDir, '.' + assetSub));
  }
  next();
});
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(resolve(staticDir, 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
