import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS, PLANS, TEMPLATES, FIELDS } from './seedData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, 'naghshyar.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      field TEXT,
      color TEXT,
      counselor_id TEXT,
      plan TEXT,
      status TEXT DEFAULT 'active',
      renew_at TEXT,
      speciality TEXT
    );

    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      type TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      title TEXT NOT NULL,
      note TEXT,
      done INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      task_id TEXT,
      auto INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      text TEXT NOT NULL,
      options TEXT NOT NULL,
      answer INTEGER NOT NULL,
      explanation TEXT,
      difficulty TEXT DEFAULT 'medium',
      owner_id TEXT,
      source TEXT DEFAULT 'counselor'
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_by TEXT NOT NULL,
      topic_ids TEXT NOT NULL,
      question_ids TEXT NOT NULL,
      student_ids TEXT NOT NULL,
      duration_min INTEGER NOT NULL,
      deadline TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_results (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      answers TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      spent_sec INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      wrong INTEGER NOT NULL,
      blank INTEGER NOT NULL,
      percent INTEGER NOT NULL,
      by_topic TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS practice (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      title TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      note TEXT,
      image TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      feedback TEXT,
      score REAL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      date TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      link TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read INTEGER DEFAULT 0
    );
  `);

  // Check if seed is needed
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    seedInitialData();
  }
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 1) % 7));
  return x;
}

function demoArt(seed) {
  const palettes = [
    ['#2b3fd6', '#e0a526', '#e5446d'],
    ['#1f8a70', '#f2e9d8', '#15171e'],
    ['#e8742a', '#2b3fd6', '#f6d36b'],
  ];
  const p = palettes[seed % palettes.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
  <rect width='400' height='300' fill='#f4f1ea'/>
  <circle cx='${120 + seed * 30}' cy='120' r='70' fill='${p[0]}'/>
  <rect x='${190 - seed * 10}' y='90' width='150' height='150' fill='${p[1]}' transform='rotate(${8 + seed * 6} 260 165)'/>
  <path d='M30 250 Q 200 ${130 + seed * 20} 380 250' stroke='${p[2]}' stroke-width='10' fill='none'/>
  <circle cx='330' cy='60' r='22' fill='${p[2]}'/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function seedInitialData() {
  const now = new Date();
  const today = toISO(now);
  const wk = weekStart(now);

  const insertUser = db.prepare(`
    INSERT INTO users (id, role, name, phone, field, color, counselor_id, plan, status, renew_at, speciality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    ['a1', 'admin', 'مدیر سامانه', '09120000000', null, '#2b3fd6', null, null, 'active', null, null],
    ['c1', 'counselor', 'مریم احمدی', '09121111111', null, '#e5446d', null, 'pro', 'active', toISO(addDays(now, 19)), 'مشاور کنکور هنر'],
    ['c2', 'counselor', 'علی رضایی', '09122222222', null, '#1f8a70', null, 'basic', 'active', toISO(addDays(now, 6)), 'مشاور کنکور هنر'],
    ['c3', 'counselor', 'نگار صالحی', '09123333333', null, '#8a5cf5', null, 'trial', 'active', toISO(addDays(now, 9)), 'مشاور کنکور هنر'],
    ['s1', 'student', 'سارا کریمی', '09124444441', 'گرافیک', '#e8742a', 'c1', null, 'active', null, null],
    ['s2', 'student', 'پارسا محمدی', '09124444442', 'نقاشی', '#2b3fd6', 'c1', null, 'active', null, null],
    ['s3', 'student', 'الهه نظری', '09124444443', 'معماری داخلی', '#1f8a70', 'c1', null, 'active', null, null],
    ['s4', 'student', 'آرمین حسینی', '09124444444', 'طراحی صنعتی', '#c98a00', 'c1', null, 'active', null, null],
    ['s5', 'student', 'مهسا کاظمی', '09124444445', 'سینما', '#e5446d', 'c1', null, 'active', null, null],
    ['s6', 'student', 'کیان فرهادی', '09124444446', 'عکاسی', '#8a5cf5', 'c2', null, 'active', null, null],
  ];

  for (const u of users) {
    insertUser.run(...u);
  }

  // Pre-seed persistent demo auth tokens
  const insertToken = db.prepare('INSERT INTO tokens (token, user_id, created_at) VALUES (?, ?, ?)');
  insertToken.run('token_admin', 'a1', toISO(now));
  insertToken.run('token_counselor', 'c1', toISO(now));
  insertToken.run('token_student', 's1', toISO(now));

  // Seed sample questions
  const insertQ = db.prepare(`
    INSERT INTO questions (id, topic_id, text, options, answer, explanation, difficulty, owner_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const qs = [
    ['q1', 'iran_art', 'تخت جمشید در کدام استان قرار دارد؟', JSON.stringify(['فارس', 'اصفهان', 'خوزستان', 'کرمان']), 0, 'تخت جمشید در منطقه‌ی مرودشت، در استان فارس، قرار دارد.', 'easy', 'c1', 'counselor'],
    ['q2', 'iran_art', 'مسجد شیخ‌لطف‌الله در کدام شهر و مربوط به کدام دوره است؟', JSON.stringify(['اصفهان، صفوی', 'شیراز، زندیه', 'تبریز، ایلخانی', 'مشهد، تیموری']), 0, 'مسجد شیخ‌لطف‌الله از آثار شاخص دوره‌ی صفوی در میدان نقش جهان اصفهان است.', 'medium', 'c1', 'counselor'],
    ['q3', 'world_art', 'تابلوی مونالیزا اثر کدام هنرمند است؟', JSON.stringify(['لئوناردو داوینچی', 'میکل‌آنژ', 'رافائل', 'ونگوگ']), 0, 'مونالیزا اثر لئوناردو داوینچی از هنرمندان رنسانس ایتالیاست.', 'easy', 'c1', 'counselor'],
    ['q4', 'world_art', 'پابلو پیکاسو و ژرژ براک بنیان‌گذار کدام سبک هستند؟', JSON.stringify(['کوبیسم', 'سورئالیسم', 'اکسپرسیونیسم', 'پوپ‌آرت']), 0, 'پیکاسو و براک کوبیسم را پایه‌گذاری کردند.', 'easy', 'c1', 'counselor'],
    ['q5', 'basics', 'رنگ مکمل آبی در چرخه‌ی رنگ سنتی کدام است؟', JSON.stringify(['نارنجی', 'سبز', 'بنفش', 'زرد']), 0, 'در چرخه‌ی رنگ سنتی، مکمل آبی نارنجی است.', 'easy', 'c1', 'counselor'],
    ['q6', 'islamic', 'مقرنس در معماری ایرانی بیشتر برای چه منظوری به کار می‌رود؟', JSON.stringify(['گذار و تزیین در سقف و ورودی‌ها', 'ساخت پی بنا', 'ایجاد دودکش', 'تقویت دیوار حائل']), 0, 'مقرنس عنصری سازه‌ای و تزیینی برای گذار است.', 'medium', 'c1', 'counselor'],
    ['q7', 'materials', 'کدام ماده در رنگ روغن به عنوان حلال و رقیق‌کننده اصلی کاربرد دارد؟', JSON.stringify(['ترپنتین (ترپنتین/وایت اسپریت)', 'آب مقطر', 'الکل صنعتی', 'استون']), 0, 'ترپنتین حلال متداول رنگ روغن است.', 'medium', 'c1', 'counselor'],
    ['q8', 'geo', 'مساحت مثلثی با قاعده‌ی ۸ و ارتفاع ۵ چقدر است؟', JSON.stringify(['۲۰', '۴۰', '۱۳', '۳۰']), 0, 'مساحت = ½ × قاعده × ارتفاع = ۲۰', 'easy', 'c1', 'counselor'],
    ['q9', 'spatial', 'یک مکعب چند وجه و چند یال دارد؟', JSON.stringify(['۶ وجه و ۱۲ یال', '۸ وجه و ۱۲ یال', '۶ وجه و ۸ یال', '۴ وجه و ۸ یال']), 0, 'مکعب ۶ وجه، ۸ رأس و ۱۲ یال دارد.', 'easy', 'c1', 'counselor'],
    ['q10', 'comp', '«قانون یک‌سوم‌ها» در ترکیب‌بندی یعنی چه؟', JSON.stringify(['قراردادن عناصر مهم روی خطوط و تقاطع‌های شبکه‌ی ۳×۳', 'قراردادن همه‌چیز در مرکز کادر', 'استفاده از فقط ۳ رنگ', 'تقسیم اثر به ۳ بخش']), 0, 'کادر به ۹ قسمت تقسیم شده و عناصر مهم در نقاط طلایی قرار می‌گیرند.', 'easy', 'c1', 'counselor'],
  ];

  for (const q of qs) {
    insertQ.run(...q);
  }

  // Seed tasks for students
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, student_id, date, subject_id, topic_id, type, minutes, title, note, done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tpl = TEMPLATES[0]; // balanced
  let tSeq = 1;
  for (const stId of ['s1', 's2', 's3', 's4', 's5']) {
    for (const t of tpl.tasks) {
      const date = toISO(addDays(wk, t.day));
      const done = date < today ? 1 : 0;
      insertTask.run(`t_${tSeq++}`, stId, date, t.subjectId, t.topicId, t.type, t.minutes, `مطالعه و تمرین ${t.topicId}`, '', done);
    }
  }

  // Seed Exams
  const insertExam = db.prepare(`
    INSERT INTO exams (id, title, created_by, topic_ids, question_ids, student_ids, duration_min, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertExam.run(
    'e1',
    'آزمون جامع تاریخ هنر و مبانی',
    'c1',
    JSON.stringify(['iran_art', 'world_art', 'basics']),
    JSON.stringify(['q1', 'q2', 'q3', 'q4', 'q5']),
    JSON.stringify(['s1', 's2', 's3', 's4', 's5']),
    15,
    toISO(addDays(now, 5)),
    toISO(addDays(now, -3))
  );

  // Seed Exam Result for s1
  const insertResult = db.prepare(`
    INSERT INTO exam_results (id, exam_id, student_id, answers, finished_at, spent_sec, correct, wrong, blank, percent, by_topic)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertResult.run(
    'r1',
    'e1',
    's1',
    JSON.stringify({ q1: 0, q2: 0, q3: 0, q4: 1, q5: 0 }),
    toISO(addDays(now, -1)),
    480,
    4,
    1,
    0,
    73,
    JSON.stringify([
      { topicId: 'iran_art', correct: 2, wrong: 0, total: 2 },
      { topicId: 'world_art', correct: 1, wrong: 1, total: 2 },
      { topicId: 'basics', correct: 1, wrong: 0, total: 1 },
    ])
  );

  // Seed Practice
  const insertPractice = db.prepare(`
    INSERT INTO practice (id, student_id, title, topic_id, note, image, created_at, status, feedback, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPractice.run(
    'p1',
    's1',
    'طراحی طبیعت بی‌جان با مداد',
    'draw',
    'مدادهای B2 و B6',
    demoArt(0),
    toISO(addDays(now, -2)),
    'reviewed',
    'نسبت‌ها و پرسپکتیو بسیار عالی است. سایه‌روشن‌های زیر کاسه را تقویت کن.',
    16.5
  );
  insertPractice.run(
    'p2',
    's1',
    'ترکیب رنگ‌های مکمل',
    'paint',
    'گواش روی مقوا',
    demoArt(1),
    toISO(addDays(now, -1)),
    'pending',
    null,
    null
  );

  // Seed Chat Messages
  const insertMsg = db.prepare(`
    INSERT INTO chat_messages (id, sender_id, receiver_id, text, created_at, read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertMsg.run('m1', 'c1', 's1', 'سلام سارا جان، برنامه‌ی این هفته در سامانه بارگذاری شد. لطفاً بخش تاریخ هنر رو اولویت بذار.', toISO(addDays(now, -1)) + ' 10:15:00', 1);
  insertMsg.run('m2', 's1', 'c1', 'سلام استاد، ممنون. کار عملی جدیدم رو در بخش کار عملی ارسال کردم، ممنون میشم چک کنید.', toISO(addDays(now, -1)) + ' 11:20:00', 1);
  insertMsg.run('m3', 'c1', 's1', 'کارت رو دیدم، نسبت‌ها دقیق بود. بازخوردش رو ثبت کردم.', toISO(now) + ' 09:30:00', 1);
  insertMsg.run('m4', 's2', 'c1', 'سلام استاد رضایی، برای تست درک عمومی ریاضی از چه کتابی شروع کنم؟', toISO(now) + ' 10:00:00', 0);

  // Seed Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertNotif.run('n1', 's1', 'آزمون «تاریخ هنر و مبانی» برای شما ارسال شد.', today, 0, '/s/exams');
  insertNotif.run('n2', 'c1', 'سارا کریمی کار عملی جدید فرستاد.', today, 0, '/c/practice');
  insertNotif.run('n3', 'c1', 'پیام جدید از طرف پارسا محمدی در چت آنلاین.', today, 0, '/c/chat');
}
