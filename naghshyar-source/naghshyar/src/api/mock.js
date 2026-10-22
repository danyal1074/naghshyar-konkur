// ─────────────────────────────────────────────────────────────────────────────
//  MOCK BACKEND (demo mode)
//  Same function names / shapes as src/api/http.js. Data lives in localStorage.
//  When you build the real backend, implement the endpoints in API.md and set USE_MOCK=false.
// ─────────────────────────────────────────────────────────────────────────────
import { buildSeed, SUBJECTS, TEMPLATES, PLANS, AI_POOL, FIELDS, COLORS } from './seed';
import { toISO, addDays, weekStart, fromISO, todayISO, toLatinDigits } from '../lib/dates';
import { DEMO_OTP, NEGATIVE_MARK_EVERY } from '../config';

const KEY = 'naghshyar_db_v1';
const SESSION = 'naghshyar_session';

let db = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.version === 1) return d;
    }
  } catch (e) { /* ignore */ }
  const d = buildSeed();
  persist(d);
  return d;
}
function persist(d = db) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { console.warn('storage full', e); }
}
const nid = (p) => `${p}${db.seq++}`;
const wait = (v, ms = 70) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (msg) => Promise.reject(new Error(msg));

const topicName = Object.fromEntries(SUBJECTS.flatMap((s) => s.topics.map((t) => [t.id, t.name])));
const topicSubject = Object.fromEntries(SUBJECTS.flatMap((s) => s.topics.map((t) => [t.id, s.id])));
const typeLabel = { study: 'مطالعه', test: 'تست', review: 'مرور', practice: 'تمرین' };

const cu = () => db.users.find((u) => u.id === localStorage.getItem(SESSION)) || null;
const userById = (id) => db.users.find((u) => u.id === id);
const pub = (u) => (u ? { id: u.id, role: u.role, name: u.name, phone: u.phone, field: u.field, color: u.color, counselorId: u.counselorId, plan: u.plan, status: u.status, renewAt: u.renewAt, speciality: u.speciality } : null);

function notify(userId, text, link) {
  db.notifications.unshift({ id: nid('n'), userId, text, date: todayISO(), read: false, link });
}

// ── grading ────────────────────────────────────────────────────
export function grade(questions, answers) {
  let correct = 0, wrong = 0, blank = 0;
  const byTopic = {};
  for (const q of questions) {
    const a = answers[q.id];
    const t = (byTopic[q.topicId] ||= { topicId: q.topicId, correct: 0, wrong: 0, total: 0 });
    t.total++;
    if (a === undefined || a === null) blank++;
    else if (a === q.answer) { correct++; t.correct++; }
    else { wrong++; t.wrong++; }
  }
  const raw = correct - wrong / NEGATIVE_MARK_EVERY;
  const percent = questions.length ? Math.max(0, Math.round((raw / questions.length) * 100)) : 0;
  return { correct, wrong, blank, percent, byTopic: Object.values(byTopic) };
}
const examQuestions = (exam) => exam.questionIds.map((id) => db.questions.find((q) => q.id === id)).filter(Boolean);
const gradedResult = (r) => {
  const exam = db.exams.find((e) => e.id === r.examId);
  return { ...r, ...grade(examQuestions(exam), r.answers) };
};

// ── student stats ──────────────────────────────────────────────
function studentStats(st) {
  const today = todayISO();
  const ws = toISO(weekStart());
  const we = toISO(addDays(weekStart(), 6));
  const wk = db.tasks.filter((t) => t.studentId === st.id && t.date >= ws && t.date <= we);
  const past = wk.filter((t) => t.date <= today);
  const pastDone = past.filter((t) => t.done).length;
  const pastRate = past.length ? pastDone / past.length : null;
  const sess = db.sessions.filter((s) => s.studentId === st.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const results = db.results.filter((r) => r.studentId === st.id).map(gradedResult);
  const avgScore = results.length ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length) : null;
  let status = 'good';
  if (!wk.length) status = 'noplan';
  else if (pastRate !== null) status = pastRate >= 0.7 ? 'good' : pastRate >= 0.4 ? 'warn' : 'late';
  const pendingExams = db.exams.filter((e) => e.studentIds.includes(st.id) && !db.results.some((r) => r.examId === e.id && r.studentId === st.id)).length;
  return { weekDone: wk.filter((t) => t.done).length, weekTotal: wk.length, pastRate, lastActive: sess[0]?.date || null, avgScore, status, pendingExams };
}

// ── progress ───────────────────────────────────────────────────
function progressFor(studentId) {
  const now = new Date();
  const days = [...Array(14)].map((_, i) => toISO(addDays(now, i - 13)));
  const sess = db.sessions.filter((s) => s.studentId === studentId);
  const studyByDay = days.map((d) => ({ date: d, minutes: sess.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0) }));
  const last7 = new Set(days.slice(7));
  const bySubject = SUBJECTS.map((s) => ({
    subjectId: s.id,
    minutes: sess.filter((x) => x.subjectId === s.id && last7.has(x.date)).reduce((a, x) => a + x.minutes, 0),
  })).filter((x) => x.minutes > 0);
  const ws = toISO(weekStart());
  const we = toISO(addDays(weekStart(), 6));
  const wk = db.tasks.filter((t) => t.studentId === studentId && t.date >= ws && t.date <= we);
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (studyByDay[i].minutes > 0) streak++;
    else if (i === days.length - 1) continue; // today may still be empty
    else break;
  }
  const results = db.results.filter((r) => r.studentId === studentId).map(gradedResult).sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1));
  const examTrend = results.map((r) => ({ examId: r.examId, title: db.exams.find((e) => e.id === r.examId)?.title, date: r.finishedAt, score: r.percent }));
  const agg = {};
  for (const r of results) for (const t of r.byTopic) {
    const a = (agg[t.topicId] ||= { topicId: t.topicId, correct: 0, total: 0 });
    a.correct += t.correct; a.total += t.total;
  }
  const topics = Object.values(agg).map((a) => ({
    topicId: a.topicId, name: topicName[a.topicId], subjectId: topicSubject[a.topicId], total: a.total, accuracy: Math.round((a.correct / a.total) * 100),
  })).sort((a, b) => a.accuracy - b.accuracy);
  return {
    studyByDay, bySubject, streak,
    weekMinutes: studyByDay.slice(7).reduce((a, d) => a + d.minutes, 0),
    weekDone: wk.filter((t) => t.done).length, weekTotal: wk.length,
    examTrend, topics,
    avgScore: examTrend.length ? Math.round(examTrend.reduce((a, e) => a + e.score, 0) / examTrend.length) : null,
  };
}

// ═════════════════════════ AUTH ═════════════════════════
export const sendOtp = (phone) => {
  const p = toLatinDigits(phone).trim();
  if (!/^09\d{9}$/.test(p)) return fail('شماره موبایل را به‌صورت ۰۹۱۲۳۴۵۶۷۸۹ وارد کن.');
  if (!db.users.some((u) => u.phone === p)) return fail('این شماره ثبت نشده است. از مشاورت بخواه تو را اضافه کند.');
  return wait({ ok: true, demoHint: DEMO_OTP });
};
export const verifyOtp = (phone, code) => {
  const p = toLatinDigits(phone).trim();
  const u = db.users.find((x) => x.phone === p);
  if (!u) return fail('این شماره ثبت نشده است.');
  if (toLatinDigits(code).trim() !== DEMO_OTP) return fail('کد واردشده درست نیست.');
  if (u.role === 'counselor' && u.status === 'suspended') return fail('اشتراک شما غیرفعال است. با پشتیبانی تماس بگیرید.');
  localStorage.setItem(SESSION, u.id);
  return wait({ token: 'demo-token', user: pub(u) });
};
export const demoLogin = (role) => {
  const id = { student: 's1', counselor: 'c1', admin: 'a1' }[role];
  localStorage.setItem(SESSION, id);
  return wait({ token: 'demo-token', user: pub(userById(id)) });
};
export const me = () => wait(pub(cu()));
export const logout = () => { localStorage.removeItem(SESSION); return wait({ ok: true }); };
export const resetDemo = () => { db = buildSeed(); persist(); return wait({ ok: true }); };

// ═════════════════════════ SYLLABUS & TEMPLATES ═════════════════════════
export const getSyllabus = () => wait(SUBJECTS);
export const listTemplates = () => wait(TEMPLATES.map((t) => ({ id: t.id, name: t.name, desc: t.desc, taskCount: t.tasks.length, minutes: t.tasks.reduce((a, x) => a + x.minutes, 0) })));
export const listPlans = () => wait(PLANS);
export const listFields = () => wait(FIELDS);

// ═════════════════════════ STUDENTS (counselor) ═════════════════════════
export const listStudents = () => {
  const u = cu();
  const items = db.users.filter((s) => s.role === 'student' && (u.role === 'admin' || s.counselorId === u.id)).map((s) => ({ ...pub(s), ...studentStats(s) }));
  const plan = PLANS.find((p) => p.id === u.plan);
  return wait({ items, limit: plan?.studentLimit ?? null, planId: u.plan ?? null });
};
export const getStudent = (id) => {
  const s = userById(id);
  if (!s) return fail('دانش‌آموز پیدا نشد.');
  return wait({ ...pub(s), ...studentStats(s) });
};
export const inviteStudent = ({ name, phone, field }) => {
  const u = cu();
  const p = toLatinDigits(phone).trim();
  if (!name?.trim()) return fail('نام دانش‌آموز را وارد کن.');
  if (!/^09\d{9}$/.test(p)) return fail('شماره موبایل درست نیست.');
  if (db.users.some((x) => x.phone === p)) return fail('این شماره قبلاً ثبت شده است.');
  const plan = PLANS.find((x) => x.id === u.plan);
  const count = db.users.filter((s) => s.counselorId === u.id).length;
  if (plan && count >= plan.studentLimit) return fail(`ظرفیت پلن شما ${plan.studentLimit} دانش‌آموز است. برای افزودن بیشتر پلن را ارتقا دهید.`);
  const s = { id: nid('s'), role: 'student', name: name.trim(), phone: p, field, counselorId: u.id, color: COLORS[db.seq % COLORS.length] };
  db.users.push(s);
  persist();
  return wait(pub(s));
};

// ═════════════════════════ PLAN / TASKS ═════════════════════════
export const listTasks = (studentId, from, to) => {
  const id = studentId || cu().id;
  return wait(db.tasks.filter((t) => t.studentId === id && (!from || t.date >= from) && (!to || t.date <= to)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1)));
};
export const createTask = (studentId, t) => {
  const task = {
    id: nid('t'), studentId, date: t.date, subjectId: t.subjectId, topicId: t.topicId, type: t.type || 'study', minutes: Number(t.minutes) || 45,
    title: t.title || `${typeLabel[t.type || 'study']} ${topicName[t.topicId] || ''}`.trim(), note: t.note || '', done: false,
  };
  db.tasks.push(task);
  persist();
  return wait(task);
};
export const updateTask = (taskId, patch) => {
  const t = db.tasks.find((x) => x.id === taskId);
  if (!t) return fail('کار پیدا نشد.');
  Object.assign(t, patch);
  if (patch.topicId || patch.type) t.title = patch.title || `${typeLabel[t.type]} ${topicName[t.topicId] || ''}`.trim();
  persist();
  return wait(t);
};
export const deleteTask = (taskId) => {
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  db.sessions = db.sessions.filter((s) => !(s.taskId === taskId && s.auto));
  persist();
  return wait({ ok: true });
};
export const toggleTask = (taskId, done) => {
  const t = db.tasks.find((x) => x.id === taskId);
  if (!t) return fail('کار پیدا نشد.');
  t.done = !!done;
  const existing = db.sessions.find((s) => s.taskId === taskId);
  if (t.done && !existing && t.type !== 'test') {
    db.sessions.push({ id: nid('ss'), studentId: t.studentId, date: todayISO(), subjectId: t.subjectId, minutes: t.minutes, taskId, auto: true });
  }
  if (!t.done && existing?.auto) db.sessions = db.sessions.filter((s) => s !== existing && s.id !== existing.id);
  persist();
  return wait(t);
};
export const applyTemplate = (studentId, templateId, weekStartISO) => {
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return fail('قالب پیدا نشد.');
  const ws = fromISO(weekStartISO);
  for (const x of tpl.tasks) {
    db.tasks.push({
      id: nid('t'),
      studentId,
      date: toISO(addDays(ws, x.day)),
      subjectId: x.subjectId,
      topicId: x.topicId,
      type: x.type,
      minutes: x.minutes,
      title: x.title || `${typeLabel[x.type]} ${topicName[x.topicId] || x.topicId}`,
      note: x.note || '',
      done: false,
    });
  }
  persist();
  return wait({ added: tpl.tasks.length });
};
export const copyWeek = (studentId, fromWeekISO, toWeekISO) => {
  const from = fromISO(fromWeekISO);
  const fromEnd = toISO(addDays(from, 6));
  const src = db.tasks.filter((t) => t.studentId === studentId && t.date >= fromWeekISO && t.date <= fromEnd);
  const diff = Math.round((fromISO(toWeekISO) - from) / 86400000);
  for (const t of src) db.tasks.push({ ...t, id: nid('t'), date: toISO(addDays(fromISO(t.date), diff)), done: false });
  persist();
  return wait({ added: src.length });
};
export const clearWeek = (studentId, weekISO) => {
  const end = toISO(addDays(fromISO(weekISO), 6));
  const ids = new Set(db.tasks.filter((t) => t.studentId === studentId && t.date >= weekISO && t.date <= end).map((t) => t.id));
  db.tasks = db.tasks.filter((t) => !ids.has(t.id));
  db.sessions = db.sessions.filter((s) => !(ids.has(s.taskId) && s.auto));
  persist();
  return wait({ removed: ids.size });
};
export const publishPlan = (studentId, weekISO) => {
  const u = cu();
  notify(studentId, `${u.name} برنامه‌ی این هفته‌ات را به‌روزرسانی کرد.`, '/s/plan');
  persist();
  return wait({ ok: true });
};

// ═════════════════════════ QUESTION BANK ═════════════════════════
export const listQuestions = ({ subjectId, topicId, difficulty, q } = {}) => {
  let list = db.questions;
  if (topicId) list = list.filter((x) => x.topicId === topicId);
  else if (subjectId) list = list.filter((x) => topicSubject[x.topicId] === subjectId);
  if (difficulty) list = list.filter((x) => x.difficulty === difficulty);
  if (q) list = list.filter((x) => x.text.includes(q));
  return wait(list);
};
export const saveQuestion = (q) => {
  if (!q.text?.trim()) return fail('متن سؤال را بنویس.');
  if (q.options.some((o) => !o.trim())) return fail('هر چهار گزینه را پر کن.');
  if (q.id && !String(q.id).startsWith('draft')) {
    const ex = db.questions.find((x) => x.id === q.id);
    Object.assign(ex, { ...q });
    persist();
    return wait(ex);
  }
  const n = { ...q, id: nid('q'), ownerId: cu().id, source: q.source || 'counselor' };
  delete n.draft;
  db.questions.push(n);
  persist();
  return wait(n);
};
export const deleteQuestion = (id) => { db.questions = db.questions.filter((q) => q.id !== id); persist(); return wait({ ok: true }); };

let draftSeq = 1;
export const aiGenerateQuestions = ({ topicIds, count, difficulty }) => {
  // DEMO ONLY: picks from a sample pool, then falls back to editable templates.
  // In production call your LLM endpoint here and return the same shape.
  let out = AI_POOL.filter((q) => topicIds.includes(q.topicId) && (!difficulty || difficulty === 'mixed' || q.difficulty === difficulty)).map((q) => ({ ...q }));
  out = out.slice(0, count);
  let i = 0;
  while (out.length < count) {
    const tid = topicIds[i % topicIds.length];
    out.push({
      topicId: tid, difficulty: difficulty && difficulty !== 'mixed' ? difficulty : 'medium',
      text: `کدام گزینه درباره‌ی «${topicName[tid]}» درست‌تر است؟`,
      options: ['گزینه‌ی درست (این را ویرایش کن)', 'گزینه‌ی نادرست ۱', 'گزینه‌ی نادرست ۲', 'گزینه‌ی نادرست ۳'], answer: 0,
      explanation: 'این پیش‌نویس خودکار است؛ قبل از ارسال متن و گزینه‌ها را ویرایش و تأیید کن.', needsEdit: true,
    });
    i++;
  }
  return wait(out.map((q) => ({ ...q, id: `draft_${draftSeq++}`, source: 'ai', draft: true })), 900);
};

// ═════════════════════════ EXAMS ═════════════════════════
export const listExams = (studentId) => {
  const u = cu();
  const today = todayISO();
  if (u.role === 'student') {
    const items = db.exams.filter((e) => e.studentIds.includes(u.id)).map((e) => {
      const r = db.results.find((x) => x.examId === e.id && x.studentId === u.id);
      const g = r ? gradedResult(r) : null;
      return { id: e.id, title: e.title, topicIds: e.topicIds, questionCount: e.questionIds.length, durationMin: e.durationMin, deadline: e.deadline, createdAt: e.createdAt, status: r ? 'done' : 'new', overdue: !r && e.deadline && e.deadline < today, score: g?.percent ?? null, finishedAt: r?.finishedAt ?? null };
    });
    return wait(items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
  }
  const items = db.exams.filter((e) => e.createdBy === u.id && (!studentId || e.studentIds.includes(studentId))).map((e) => {
    const rs = db.results.filter((r) => r.examId === e.id).map(gradedResult);
    const mine = studentId ? rs.find((r) => r.studentId === studentId) : null;
    return {
      id: e.id, title: e.title, topicIds: e.topicIds, questionCount: e.questionIds.length, durationMin: e.durationMin, deadline: e.deadline, createdAt: e.createdAt,
      sent: e.studentIds.length, submitted: rs.length, avg: rs.length ? Math.round(rs.reduce((a, r) => a + r.percent, 0) / rs.length) : null,
      studentScore: mine ? mine.percent : null, studentDone: studentId ? !!mine : undefined,
    };
  });
  return wait(items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
};
export const createExam = ({ title, topicIds, questionIds, newQuestions = [], studentIds, durationMin, deadline }) => {
  const u = cu();
  if (!title?.trim()) return fail('برای آزمون یک عنوان بنویس.');
  if (!studentIds?.length) return fail('حداقل یک دانش‌آموز را انتخاب کن.');
  const ids = [...questionIds];
  for (const q of newQuestions) {
    const n = { ...q, id: nid('q'), ownerId: u.id, source: q.source || 'ai' };
    delete n.draft; delete n.needsEdit;
    db.questions.push(n);
    ids.push(n.id);
  }
  if (ids.length < 1) return fail('آزمون باید حداقل یک سؤال داشته باشد.');
  const exam = { id: nid('e'), title: title.trim(), createdBy: u.id, topicIds, questionIds: ids, studentIds, durationMin: Number(durationMin) || 10, deadline: deadline || null, createdAt: todayISO() };
  db.exams.push(exam);
  for (const sid of studentIds) notify(sid, `آزمون «${exam.title}» برای تو ارسال شد.`, '/s/exams');
  persist();
  return wait(exam);
};
export const getExam = (id) => {
  const u = cu();
  const e = db.exams.find((x) => x.id === id);
  if (!e) return fail('آزمون پیدا نشد.');
  let qs = examQuestions(e).map((q) => ({ ...q }));
  const hasResult = u.role === 'student' && db.results.some((r) => r.examId === id && r.studentId === u.id);
  if (u.role === 'student' && !hasResult) qs = qs.map(({ answer, explanation, ...rest }) => rest);
  return wait({ ...e, questions: qs, alreadyDone: hasResult });
};
export const submitExam = (examId, answers, spentSec) => {
  const u = cu();
  const e = db.exams.find((x) => x.id === examId);
  if (!e) return fail('آزمون پیدا نشد.');
  if (db.results.some((r) => r.examId === examId && r.studentId === u.id)) return fail('این آزمون را قبلاً داده‌ای.');
  const r = { id: nid('r'), examId, studentId: u.id, answers, finishedAt: todayISO(), spentSec: Math.round(spentSec || 0) };
  db.results.push(r);
  const g = gradedResult(r);
  notify(e.createdBy, `${u.name} آزمون «${e.title}» را تمام کرد (${g.percent}٪).`, `/c/exams/${e.id}`);
  persist();
  return wait(g);
};
export const getResult = (examId, studentId) => {
  const u = cu();
  const sid = u.role === 'student' ? u.id : studentId;
  const e = db.exams.find((x) => x.id === examId);
  const r = db.results.find((x) => x.examId === examId && x.studentId === sid);
  if (!e || !r) return fail('نتیجه‌ای پیدا نشد.');
  return wait({ exam: { ...e, questions: examQuestions(e) }, student: pub(userById(sid)), result: gradedResult(r) });
};
export const listExamResults = (examId) => {
  const e = db.exams.find((x) => x.id === examId);
  if (!e) return fail('آزمون پیدا نشد.');
  const qs = examQuestions(e);
  const rows = e.studentIds.map((sid) => {
    const r = db.results.find((x) => x.examId === examId && x.studentId === sid);
    return { student: pub(userById(sid)), result: r ? gradedResult(r) : null };
  });
  const done = db.results.filter((r) => r.examId === examId);
  const questionStats = qs.map((q) => ({
    questionId: q.id, text: q.text, topicId: q.topicId,
    answered: done.filter((r) => r.answers[q.id] !== undefined).length,
    correctRate: done.length ? Math.round((done.filter((r) => r.answers[q.id] === q.answer).length / done.length) * 100) : null,
  }));
  return wait({ exam: { ...e, questions: qs }, rows, questionStats });
};

// ═════════════════════════ PROGRESS & STUDY ═════════════════════════
export const getProgress = (studentId) => wait(progressFor(studentId || cu().id));
export const listSessions = (limit = 8) => wait(db.sessions.filter((s) => s.studentId === cu().id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit));
export const logStudy = ({ subjectId, minutes, taskId }) => {
  const u = cu();
  const m = Math.max(1, Math.round(minutes));
  if (taskId) {
    const t = db.tasks.find((x) => x.id === taskId);
    if (t) t.done = true;
    const ex = db.sessions.find((s) => s.taskId === taskId);
    if (ex) { ex.minutes = m; ex.auto = false; persist(); return wait(ex); }
  }
  const s = { id: nid('ss'), studentId: u.id, date: todayISO(), subjectId, minutes: m, taskId: taskId || null, auto: false };
  db.sessions.push(s);
  persist();
  return wait(s);
};

// ═════════════════════════ PRACTICE (drawing / painting) ═════════════════════════
export const listPractice = (studentId) => {
  const u = cu();
  let list = db.practice;
  if (u.role === 'student') list = list.filter((p) => p.studentId === u.id);
  else {
    const mine = db.users.filter((s) => s.counselorId === u.id).map((s) => s.id);
    list = list.filter((p) => mine.includes(p.studentId) && (!studentId || p.studentId === studentId));
  }
  return wait(list.map((p) => ({ ...p, student: pub(userById(p.studentId)) })).sort((a, b) => (a.status === b.status ? (a.createdAt < b.createdAt ? 1 : -1) : a.status === 'pending' ? -1 : 1)));
};
export const submitPractice = ({ title, topicId, note, image }) => {
  const u = cu();
  if (!image) return fail('اول تصویر کارت را انتخاب کن.');
  const p = { id: nid('p'), studentId: u.id, title: title?.trim() || 'کار عملی', topicId, note: note || '', image, createdAt: todayISO(), status: 'pending', feedback: '', score: null };
  db.practice.unshift(p);
  if (u.counselorId) notify(u.counselorId, `${u.name} یک کار عملی جدید فرستاد.`, '/c/practice');
  persist();
  return wait(p);
};
export const reviewPractice = (id, { feedback, score }) => {
  const p = db.practice.find((x) => x.id === id);
  if (!p) return fail('کار پیدا نشد.');
  if (!feedback?.trim()) return fail('یک بازخورد برای دانش‌آموز بنویس.');
  Object.assign(p, { feedback: feedback.trim(), score: score === '' || score == null ? null : Number(score), status: 'reviewed' });
  notify(p.studentId, `مشاورت کار عملی «${p.title}» را بازبینی کرد.`, '/s/practice');
  persist();
  return wait(p);
};

// ═════════════════════════ ASSISTANT ═════════════════════════
const KB = [
  [/مکمل|چرخه.?ی? رنگ|رنگ/, 'رنگ‌های مکمل در چرخه‌ی رنگ روبه‌روی هم‌اند: آبی و نارنجی، قرمز و سبز، زرد و بنفش. کنار هم قرار گرفتن مکمل‌ها بیشترین کنتراست را می‌سازد و مخلوط‌شدنشان رنگ را خنثی (خاکستری مایل به قهوه‌ای) می‌کند. نکته‌ی تست: «رنگ‌های گرم» قرمز، نارنجی و زردند و «سرد» آبی، سبز و بنفش.'],
  [/پرسپکتیو|عمق/, 'پرسپکتیو راهی برای نمایش عمق روی سطح دوبعدی است. در پرسپکتیو خطی، خطوط موازی به «نقطه‌ی گریز» می‌رسند؛ در پرسپکتیو هوایی، اشیای دور کوچک‌تر، کم‌رنگ‌تر و مبهم‌تر دیده می‌شوند. معمولاً در آزمون، تشخیص نوع پرسپکتیو یا تعداد نقطه‌های گریز می‌آید.'],
  [/مقرنس|گنبد|معماری/, 'مقرنس عنصری تزیینی و سازه‌ای در معماری ایرانی است که برای گذار از دیوار به سقف یا گنبد، در ورودی‌ها و محراب‌ها به کار می‌رود. گنبدها هم یک‌پوش، دوپوش یا چندپوش‌اند؛ دوپوش‌ها در دوره‌ی صفوی و تیموری رایج شدند.'],
  [/تاریخ هنر|صفوی|ساسانی|هخامنشی/, 'برای تاریخ هنر ایران، دوره‌ها را روی یک خط زمانی بچین: هخامنشی ← اشکانی ← ساسانی ← اسلامی (سلجوقی، ایلخانی، تیموری، صفوی) ← قاجار. برای هر دوره فقط ۳ چیز یاد بگیر: یک بنای شاخص، یک هنر شاخص و یک ویژگی بصری.'],
  [/برنامه|مطالعه|برنامه‌ریزی/, 'یک قاعده‌ی ساده: هر روز یک درس نظری سنگین، یک درس سبک و یک تمرین عملی کوتاه. هفته‌ای یک بار هم مرور و آزمون بگذار. برنامه‌ات را از مشاورت بگیر و از بخش «امروز» کارها را تیک بزن.'],
  [/هندسه|مساحت|حجم|زاویه/, 'در سؤال‌های هندسه‌ی کنکور هنر معمولاً فرمول‌های پایه کافی است: مساحت مثلث ½ قاعده × ارتفاع، دایره πr²، حجم مکعب a³، مجموع زوایای n‌ضلعی (n−۲)×۱۸۰. اول شکل را بکش و اندازه‌ها را رویش بنویس.'],
];
export const askAssistant = (message) => {
  const hit = KB.find(([re]) => re.test(message));
  const reply = hit ? hit[1] : 'سؤال خوبی است. در نسخه‌ی نمایشی من فقط چند موضوع نمونه (رنگ، پرسپکتیو، مقرنس، تاریخ هنر ایران، هندسه، برنامه‌ریزی) را پاسخ می‌دهم. در نسخه‌ی اصلی این بخش به مدل هوش مصنوعی وصل می‌شود و روی سرفصل‌های کنکور هنر جواب می‌دهد.';
  return wait({ reply }, 800);
};

// ═════════════════════════ NOTIFICATIONS ═════════════════════════
export const listNotifications = () => wait(db.notifications.filter((n) => n.userId === cu().id).slice(0, 20));
export const markNotificationsRead = () => { db.notifications.filter((n) => n.userId === cu().id).forEach((n) => (n.read = true)); persist(); return wait({ ok: true }); };

// ═════════════════════════ ADMIN ═════════════════════════
export const listCounselors = () => {
  const items = db.users.filter((u) => u.role === 'counselor').map((c) => ({ ...pub(c), studentCount: db.users.filter((s) => s.counselorId === c.id).length, examCount: db.exams.filter((e) => e.createdBy === c.id).length }));
  return wait(items);
};
export const updateCounselor = (id, patch) => {
  const c = userById(id);
  if (!c) return fail('مشاور پیدا نشد.');
  Object.assign(c, patch);
  persist();
  return wait(pub(c));
};
export const createCounselor = ({ name, phone, plan }) => {
  const p = toLatinDigits(phone).trim();
  if (!name?.trim()) return fail('نام مشاور را وارد کن.');
  if (!/^09\d{9}$/.test(p)) return fail('شماره موبایل درست نیست.');
  if (db.users.some((x) => x.phone === p)) return fail('این شماره قبلاً ثبت شده است.');
  const c = { id: nid('c'), role: 'counselor', name: name.trim(), phone: p, plan: plan || 'trial', status: 'active', renewAt: toISO(addDays(new Date(), plan === 'trial' ? 14 : 30)), color: COLORS[db.seq % COLORS.length], speciality: 'مشاور کنکور هنر' };
  db.users.push(c);
  persist();
  return wait(pub(c));
};
export const getAdminStats = () => {
  const counselors = db.users.filter((u) => u.role === 'counselor');
  const active = counselors.filter((c) => c.status === 'active');
  const price = Object.fromEntries(PLANS.map((p) => [p.id, p.price]));
  return wait({
    counselors: counselors.length,
    activeCounselors: active.length,
    students: db.users.filter((u) => u.role === 'student').length,
    exams: db.exams.length,
    monthlyRevenue: active.reduce((a, c) => a + (price[c.plan] || 0), 0),
    questions: db.questions.length,
  });
};

// ── Online Chat ──
export const listChatThreads = () => {
  const me = cu();
  if (!me) return fail('ابتدا وارد شو.');
  const students = db.users.filter((u) => u.role === 'student' && u.counselorId === me.id);
  const msgs = db.messages || [];
  const threads = students.map((s) => {
    const threadMsgs = msgs.filter((m) => (m.senderId === s.id && m.receiverId === me.id) || (m.senderId === me.id && m.receiverId === s.id));
    const lastMessage = threadMsgs[threadMsgs.length - 1] || null;
    const unreadCount = threadMsgs.filter((m) => m.senderId === s.id && !m.read).length;
    return { student: pub(s), lastMessage, unreadCount };
  });
  return wait(threads);
};

export const getChatMessages = (withUserId) => {
  const me = cu();
  if (!me) return fail('ابتدا وارد شو.');
  const msgs = db.messages || [];
  const list = msgs.filter((m) => (m.senderId === me.id && m.receiverId === withUserId) || (m.senderId === withUserId && m.receiverId === me.id));
  for (const m of list) {
    if (m.receiverId === me.id && !m.read) m.read = true;
  }
  persist();
  return wait(list);
};

export const sendChatMessage = (toUserId, text) => {
  const me = cu();
  if (!me) return fail('ابتدا وارد شو.');
  if (!text?.trim()) return fail('متن پیام را وارد کن.');
  const msg = {
    id: nid('m'),
    senderId: me.id,
    receiverId: toUserId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  (db.messages ||= []).push(msg);
  persist();
  return wait(msg);
};
