import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS, PLANS, TEMPLATES, FIELDS } from './seedData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, 'naghshyar.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode & performance tuning
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA cache_size = -64000;');

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

    CREATE INDEX IF NOT EXISTS idx_tasks_student_date ON tasks(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_chat_users ON chat_messages(sender_id, receiver_id);
    CREATE INDEX IF NOT EXISTS idx_practice_student ON practice(student_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  `);

  // Check if seed is needed
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    seedInitialData();
  } else {
    // Ensure all public entrance exams have student_ids containing '*' so new students see them
    db.prepare("UPDATE exams SET student_ids = '[\"*\"]' WHERE id IN ('e1', 'e2', 'e3')").run();
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
    ['a1', 'admin', 'مدیر سامانه نقش‌یار', '09120000000', null, '#2b3fd6', null, null, 'active', null, null],
    ['c1', 'counselor', 'استاد سارا احمدی', '09121111111', null, '#e5446d', null, 'pro', 'active', toISO(addDays(now, 30)), 'مشاور ارشد کنکور هنر'],
    ['c2', 'counselor', 'علی رضایی', '09122222222', null, '#1f8a70', null, 'basic', 'active', toISO(addDays(now, 14)), 'مشاور کنکور هنر'],
    ['c3', 'counselor', 'نگار صالحی', '09123333333', null, '#8a5cf5', null, 'trial', 'active', toISO(addDays(now, 7)), 'مشاور کنکور هنر'],
    ['s1', 'student', 'سارا کریمی', '09124444441', 'گرافیک و ارتباط تصویری', '#e8742a', 'c1', null, 'active', null, null],
    ['s2', 'student', 'پارسا محمدی', '09124444442', 'نقاشی و نگارگری', '#2b3fd6', 'c1', null, 'active', null, null],
    ['s3', 'student', 'الهه نظری', '09124444443', 'معماری داخلی', '#1f8a70', 'c1', null, 'active', null, null],
    ['s4', 'student', 'آرمین حسینی', '09124444444', 'طراحی صنعتی', '#c98a00', 'c1', null, 'active', null, null],
    ['s5', 'student', 'مهسا کاظمی', '09124444445', 'سینما و نمایش', '#e5446d', 'c1', null, 'active', null, null],
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

  // Seed comprehensive question bank for Art Entrance Exam
  const insertQ = db.prepare(`
    INSERT INTO questions (id, topic_id, text, options, answer, explanation, difficulty, owner_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const qs = [
    // تاریخ هنر ایران
    ['q1', 'iran_art', 'تخت جمشید (پارسه) در کدام استان قرار دارد و ساخت آن به دستور کدام پادشاه آغاز شد؟', JSON.stringify(['فارس، داریوش بزرگ', 'اصفهان، کوروش بزرگ', 'خوزستان، خشایارشا', 'کرمانشاه، اردشیر اول']), 0, 'ساخت صفه و کاخ‌های اولیه تخت جمشید در استان فارس در زمان داریوش اول هخامنشی آغاز شد.', 'easy', 'c1', 'counselor'],
    ['q2', 'iran_art', 'مسجد شیخ‌لطف‌الله در کدام شهر و مربوط به کدام دوره است و فاقد کدام عنصر شاخص معماری اسلامی است؟', JSON.stringify(['اصفهان، صفوی، فاقد مناره و صحن مرکزی', 'شیراز، زندیه، فاقد ایوان', 'تبریز، ایلخانی، فاقد گنبد', 'مشهد، تیموری، فاقد محراب']), 0, 'مسجد شیخ‌لطف‌الله اصفهان دوره صفوی به عنوان مسجد اختصاصی درباری بدون مناره و صحن ساخته شد.', 'medium', 'c1', 'counselor'],
    ['q3', 'iran_art', 'کمال‌الدین بهزاد از سرآمدان کدام مکتب نگارگری ایران است؟', JSON.stringify(['مکتب هرات (دوره تیموری)', 'مکتب تبریز اول (ایلخانی)', 'مکتب شیراز اول (آل اینجو)', 'مکتب قزوین (صفوی)']), 0, 'بهزاد بزرگ‌ترین نگارگر مکتب هرات در اواخر عصر تیموری و دربار سلطان حسین بایقرا بود.', 'easy', 'c1', 'counselor'],
    ['q4', 'iran_art', 'نقش‌برجسته‌های طاق بستان در کرمانشاه مربوط به کدام دوره تاریخی است؟', JSON.stringify(['ساسانی', 'اشکانی', 'هخامنشی', 'سلجوقی']), 0, 'طاق بستان شامل طاق بزرگ و طاق کوچک از یادگارهای ارزشمند دوره ساسانی است.', 'easy', 'c1', 'counselor'],
    ['q5', 'iran_art', 'کدام بنا به عنوان بلندترین برج آجری جهان و شاهکار معماری دوره آل زیار شناخته می‌شود؟', JSON.stringify(['گنبد قابوس (گرگان)', 'برج طغرل (ری)', 'گنبد سرخ (مراغه)', 'برج رادکان']), 0, 'گنبد قابوس در شهر گنبد کاووس به دستور قابوس بن وشمگیر ساخته شده و بلندترین برج آجری دنیاست.', 'medium', 'c1', 'counselor'],

    // تاریخ هنر جهان
    ['q6', 'world_art', 'تابلوی مشهور «لبخند ژوکوند» (مونالیزا) اثر کدام نابغه رنسانس است؟', JSON.stringify(['لئوناردو داوینچی', 'میکل‌آنژ', 'رافائل سانتی', 'ساندرو بوتیچلی']), 0, 'مونالیزا از شاهکارهای بی‌بدیل لئوناردو داوینچی در عصر رنسانس اوج ایتالیاست.', 'easy', 'c1', 'counselor'],
    ['q7', 'world_art', 'پابلو پیکاسو و ژرژ براک بنیان‌گذاران اصلی کدام مکتب پیشروی نقاشی قرن بیستم بودند؟', JSON.stringify(['کوبیسم (حجم‌گری)', 'سورئالیسم (فراواقع‌گرایی)', 'امپرسیونیسم (دریافت‌گری)', 'فوویسم (ددگری)']), 0, 'پیکاسو و براک با تجزیه احجام و ترکیب نماهای همزمان، سبک کوبیسم را در پاریس پایه‌گذاری کردند.', 'easy', 'c1', 'counselor'],
    ['q8', 'world_art', 'تابلوی «گرنیکا» شاهکار ضدجنگ پیکاسو در واکنش به بمباران کدام کشور خلق شد؟', JSON.stringify(['اسپانیا (جنگ داخلی)', 'فرانسه (جنگ جهانی اول)', 'ایتالیا (فاشیسم)', 'انگلستان']), 0, 'گرنیکا در سال ۱۹۳۷ در اعتراض به بمباران وحشیانه دهکده گرنیکا در شمال اسپانیا کشیده شد.', 'easy', 'c1', 'counselor'],
    ['q9', 'world_art', 'کدام هنرمند نقاش جنبش امپرسیونیسم نقاشی‌های متعددی از «نیلوفرهای آبی» و «کلیسای روئن» خلق کرد؟', JSON.stringify(['کلود مونه', 'ادوارد مانه', 'پیر اگوست رنوار', 'پل سزان']), 0, 'کلود مونه پرچم‌دار امپرسیونیسم و نقاش اثر طلوع آفتاب و نیلوفرهای آبی است.', 'medium', 'c1', 'counselor'],
    ['q10', 'world_art', 'سالوادور دالی و رنه ماگریت از چهره‌های شاخص کدام جنبش هنری هستند؟', JSON.stringify(['سورئالیسم', 'دادائیسم', 'اکسپرسیونیسم', 'پاپ‌آرت']), 0, 'سورئالیسم بر تداعی آزاد خواب و رویا و ناخودآگاه فرویدی تکیه دارد.', 'easy', 'c1', 'counselor'],

    // مبانی هنرهای تجسمی و رنگ
    ['q11', 'basics', 'در چرخه‌ی دوازده‌تایی رنگ یوهانس ایتن، رنگ مکمل رنگ زرد کدام است؟', JSON.stringify(['بنفش', 'آبی', 'سبز', 'قرمز']), 0, 'در دایره رنگ، رنگ‌های مکمل روبه‌روی هم قرار دارند: زرد مکمل بنفش است.', 'easy', 'c1', 'counselor'],
    ['q12', 'basics', 'کدام دسته از رنگ‌های زیر همگی جزو رنگ‌های سرد محسوب می‌شوند؟', JSON.stringify(['سبز، آبی، فیروزه‌ای، بنفش مایل به آبی', 'قرمز، زرد، نارنجی', 'قهوه‌ای، خردلی، آجری', 'زرد، ارغوانی، شرابی']), 0, 'طیف آبی، سبز و بنفش‌های سرد احساس سکون و خنکی القا می‌کنند.', 'easy', 'c1', 'counselor'],
    ['q13', 'basics', 'تیره‌تر و با جزئیات کشیدن پیش‌زمینه و کم‌رنگ و محو کشیدن دوردست در نقاشی چه نام دارد؟', JSON.stringify(['پرسپکتیو جوی (اتمسفریک)', 'پرسپکتیو خطی دو نقطه‌ای', 'کنتراست وسعت', 'تقارن محوری']), 0, 'پرسپکتیو جوی بر اثر غبار و رطوبت هوا در مناظر ایجاد می‌شود و به تصویر عمق می‌بخشد.', 'medium', 'c1', 'counselor'],
    ['q14', 'basics', 'اصطلاح «والور» (Value) در هنرهای تجسمی بیانگر کدام ویژگی عنصر بصری است؟', JSON.stringify(['درجه تیرگی و روشنی (ارزش خاکستری)', 'میزان اشباع و خلوص رنگ', 'دمای رنگ', 'بافت فیزیکی سطح']), 0, 'والور یا درجه تیرگی-روشنی به میزان نور منعکس شده از یک سطح یا رنگ اشاره دارد.', 'medium', 'c1', 'counselor'],
    ['q15', 'basics', 'پایدارترین و آرام‌ترین کادر در میان اشکال پایه هندسی کدام کادر است؟', JSON.stringify(['مربع و مستطیل افقی', 'مثلث با راس رو به پایین', 'دایره معلق', 'بیضی مایل']), 0, 'کادرهای دارای خطوط افقی و قائده تراز، بیشترین حس ایستایی و سکون را دارند.', 'easy', 'c1', 'counselor'],

    // هنر اسلامی و معماری ایرانی
    ['q16', 'islamic', 'عنصر «مقرنس» در معماری ایرانی بیشترین کاربرد سازه‌ای-تزیینی را در کدام بخش دارد؟', JSON.stringify(['گوشه‌سازی زیر گنبد، زیر طاق ایوان‌ها و سردرها', 'پی‌سازی و کرسی‌چینی', 'ازاره و سنگفرش کف', 'بادگیرهای دوشانه‌ای']), 0, 'مقرنس انتقال هندسی سطوح چهارگوشه به دایره گنبد و تزیین زیر طاق را ممکن می‌سازد.', 'medium', 'c1', 'counselor'],
    ['q17', 'islamic', 'ابداع و وضع اصول خط شش‌گانه (اقلام سته) در تاریخ خوشنویسی اسلامی به چه کسی منسوب است؟', JSON.stringify(['ابن مقله بیضاوی شیرازی', 'میرعماد قزوینی', 'میرعلی تبریزی', 'درویش عبدالمجید طالقانی']), 0, 'ابن مقله وزیر و خوشنویس دوره عباسی قواعد اقلام سته را بر پایه نقطه هندسی تدوین کرد.', 'hard', 'c1', 'counselor'],
    ['q18', 'islamic', 'گنبد سلطانیه زنجان با کدام ویژگی مهندسی شاخص در جهان شناخته می‌شود؟', JSON.stringify(['بزرگ‌ترین گنبد آجری دوپوش جهان', 'تنها گنبد چوبی دوره ایلخانی', 'استفاده از ستون‌های مرمری یکپارچه', 'قدیمی‌ترین گنبد مخروطی رک']), 0, 'گنبد سلطانیه یادگار سلطان محمد خدابنده الجایتو بزرگ‌ترین گنبد آجری تاریخی دنیاست.', 'easy', 'c1', 'counselor'],

    // خواص مواد و صنایع دستی
    ['q19', 'materials', 'کدام ماده در نقاشی رنگ روغن به عنوان حلال اصلی جهت رقیق کردن رنگ و شستشوی قلمو به کار می‌رود؟', JSON.stringify(['ترپنتین (روغن تربانتین / وایت اسپریت)', 'آب مقطر', 'تینر فوری ۲۵۰۰۰', 'استون صنعتی']), 0, 'ترپنتین حلال طبیعی بر پایه صمغ کاج است که اختصاصاً برای رنگ روغن استفاده می‌شود.', 'easy', 'c1', 'counselor'],
    ['q20', 'crafts', 'هنر «چاپ کلاقه‌ای» یا باتیک در کدام استان و شهر ایران به عنوان قطب اصلی تولید سنتی شناخته می‌شود؟', JSON.stringify(['آذربایجان شرقی (اسکو)', 'اصفهان', 'کاشان', 'یزد']), 0, 'شهر اسکو در آذربایجان شرقی مرکز ثبت ملی هنر چاپ باتیک با صمغ پارافین و رنگرزی گیاهی است.', 'medium', 'c1', 'counselor'],
    ['q21', 'crafts', 'گره ترکی (متقارن) و گره فارسی (نامتقارن) اصطلاحات تخصصی کدام هنر دستی اصیل ایران است؟', JSON.stringify(['قالی‌بافی و فرش دستباف', 'گلیم‌بافی شیریکی پیچ', 'جاجیم‌بافی عشایری', 'ترمه‌بافی یزد']), 0, 'گره ترکی با قلاب و گره فارسی با دست در بافت فرش‌های دستباف سراسر ایران به کار می‌روند.', 'easy', 'c1', 'counselor'],

    // درک عمومی ریاضی و فیزیک
    ['q22', 'geo', 'در یک مثلث قائم‌الزاویه، اضلاع زاویه قائمه ۶ و ۸ سانتی‌متر هستند. وتر مثلث چند سانتی‌متر است؟', JSON.stringify(['۱۰', '۱۴', '۱۲', '۹']), 0, 'طبق قضیه فیثاغورس: وتر به توان دو = ۳۶ + ۶۴ = ۱۰۰، بنابراین وتر برابر ۱۰ است.', 'easy', 'c1', 'counselor'],
    ['q23', 'geo', 'نسبت طلایی (فای - Phi) که در یونان باستان و معماری سنتی ایران به کار رفته است تقریباً چه مقداری دارد؟', JSON.stringify(['۱/۶۱۸', '۳/۱۴', '۲/۷۱۸', '۱/۴۱۴']), 0, 'نسبت طلایی حاصل تقسیم طول پاره‌خط به بخش بزرگ‌تر برابر تقریباً ۱/۶۱۸ است.', 'easy', 'c1', 'counselor'],
    ['q24', 'light', 'هنگام برخورد نور سفید خورشید با قطرات باران یا منشور شیشه‌ای، کدام نور بیشترین زاویه انحراف را دارد؟', JSON.stringify(['بنفش', 'قرمز', 'زرد', 'سبز']), 0, 'نور بنفش به دلیل کمترین طول موج، بیشترین شکست و انحراف را در محیط شفاف تجربه می‌کند.', 'medium', 'c1', 'counselor'],
    ['q25', 'volume', 'حجم یک کره به شعاع ۳ سانتی‌متر چقدر است؟ (فرمول حجم کره V = 4/3 * π * r³ و π ≈ ۳)', JSON.stringify(['۱۰۸ سانتی‌متر مکعب', '۳۶ سانتی‌متر مکعب', '۵۴ سانتی‌متر مکعب', '۸۱ سانتی‌متر مکعب']), 0, 'V = 4/3 * 3 * 27 = 108 سانتی‌متر مکعب.', 'easy', 'c1', 'counselor'],

    // خلاقیت تصویری و تجسمی
    ['q26', 'spatial', 'یک مکعب مستطیل چند وجه، چند رأس و چند یال دارد؟', JSON.stringify(['۶ وجه، ۸ رأس، ۱۲ یال', '۸ وجه، ۶ رأس، ۱۲ یال', '۶ وجه، ۱۲ رأس، ۸ یال', '۱۲ وجه، ۸ رأس، ۶ یال']), 0, 'احجام مکعبی همگی دارای ۶ وجه، ۸ راس و ۱۲ یال هستند.', 'easy', 'c1', 'counselor'],
    ['q27', 'comp', 'در ترکیب‌بندی بصری، «قانون یک‌سوم‌ها» چگونه اجرا می‌شود؟', JSON.stringify(['تقسیم کادر به ۹ بخش با دو خط موازی عمودی و دو خط افقی و قرار دادن سوژه در نقاط تلاقی', 'قرار دادن سوژه دقیقا در مرکز هندسی کادر', 'تقسیم کادر به سه رنگ مساوی', 'استفاده از سه شی مشابه در خط افق']), 0, 'چهار نقطه تلاقی خطوط یک‌سوم نقاط طلایی کادر نامیده می‌شوند و چشم را سریع جذب می‌کنند.', 'easy', 'c1', 'counselor'],
    ['q28', 'symmetry', 'یک دایره دارای چند محور تقارن است؟', JSON.stringify(['بی‌شمار محور تقارن (هر قطری که از مرکز بگذرد)', 'فقط ۲ محور افقی و عمودی', '۴ محور تقارن', 'محور تقارن ندارد']), 0, 'هر خط راستی که از مرکز دایره عبور کند آن را به دو نیمه قرینه تقسیم می‌کند.', 'easy', 'c1', 'counselor'],

    // خلاقیت نمایشی و سینما
    ['q29', 'theatre_cinema', 'کدام اصطلاح فرانسوی در سینما و تئاتر به مفهوم چیدمان عناصر صحنه، نور، بازیگران و زاویه دوربین اطلاق می‌شود؟', JSON.stringify(['میزانسن (Mise-en-scène)', 'مونتاژ (Montage)', 'دکوپاژ (Découpage)', 'سوپرایمپوز']), 0, 'میزانسن یعنی هر آنچه در قاب تصویر جلوی دوربین چیده و طراحی شده است.', 'easy', 'c1', 'counselor'],
    ['q30', 'theatre_cinema', 'نخستین فیلم ناطق تاریخ سینمای ایران چه نام دارد و توسط چه کسی ساخته شد؟', JSON.stringify(['دختر لر (عبدالحسین سپنتا و اردشیر ایرانی)', 'آبی و رابی (اوانس اوگانیانس)', 'قیصر (مسعود کیمیایی)', 'حاجی آقا آکتور سینما']), 0, 'دختر لر در سال ۱۳۱۲ خورشیدی در هندوستان توسط سپنتا تولید و در ایران اکران شد.', 'easy', 'c1', 'counselor'],
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
      insertTask.run(`t_${tSeq++}`, stId, date, t.subjectId, t.topicId, t.type, t.minutes, t.title || `مطالعه ${t.topicId}`, t.note || '', done);
    }
  }

  // Seed 3 Comprehensive Exams open to ALL students
  const insertExam = db.prepare(`
    INSERT INTO exams (id, title, created_by, topic_ids, question_ids, student_ids, duration_min, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertExam.run(
    'e1',
    'آزمون شبیه‌ساز درک عمومی هنر (کنکور سراسری)',
    'c1',
    JSON.stringify(['iran_art', 'world_art', 'basics', 'islamic', 'crafts']),
    JSON.stringify(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15']),
    JSON.stringify(['*']),
    20,
    toISO(addDays(now, 10)),
    toISO(addDays(now, -2))
  );

  insertExam.run(
    'e2',
    'آزمون تخصصی مبانی هنرهای تجسمی و رنگ‌شناسی',
    'c1',
    JSON.stringify(['basics', 'comp', 'spatial']),
    JSON.stringify(['q11', 'q12', 'q13', 'q14', 'q15', 'q26', 'q27', 'q28']),
    JSON.stringify(['*']),
    15,
    toISO(addDays(now, 7)),
    toISO(addDays(now, -1))
  );

  insertExam.run(
    'e3',
    'آزمون جامع تاریخ هنر، سینما و معماری',
    'c1',
    JSON.stringify(['iran_art', 'world_art', 'islamic', 'theatre_cinema']),
    JSON.stringify(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q16', 'q17', 'q18', 'q29', 'q30']),
    JSON.stringify(['*']),
    18,
    toISO(addDays(now, 14)),
    toISO(now)
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
    JSON.stringify({ q1: 0, q2: 0, q3: 0, q4: 1, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q10: 0 }),
    toISO(addDays(now, -1)),
    480,
    9,
    1,
    0,
    87,
    JSON.stringify([
      { topicId: 'iran_art', correct: 4, wrong: 1, total: 5 },
      { topicId: 'world_art', correct: 5, wrong: 0, total: 5 },
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
    'طراحی فیگور نشسته با مداد B2 و B6',
    'draw',
    'مدت اجرا: ۴۵ دقیقه از مدل زنده',
    demoArt(0),
    toISO(addDays(now, -2)),
    'reviewed',
    'نسبت‌ها و پرسپکتیو بسیار عالی است. تیرگی‌های سایه زیر زانوها را تقویت کن تا حجم پررنگ‌تر شود.',
    17.5
  );
  insertPractice.run(
    'p2',
    's1',
    'ترکیب رنگ‌های مکمل با گواش',
    'paint',
    'کنتراست همزمان رنگ‌های زرد و بنفش',
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
  insertMsg.run('m2', 's1', 'c1', 'سلام استاد احمدی، ممنون. کار عملی جدیدم رو در بخش کار عملی ارسال کردم، ممنون میشم چک کنید.', toISO(addDays(now, -1)) + ' 11:20:00', 1);
  insertMsg.run('m3', 'c1', 's1', 'کارت رو دیدم، نسبت‌ها دقیق بود. بازخوردش رو با نمره ۱۷.۵ ثبت کردم.', toISO(now) + ' 09:30:00', 1);
  insertMsg.run('m4', 's2', 'c1', 'سلام استاد، برای تست درک عمومی ریاضی از چه کتابی شروع کنم؟', toISO(now) + ' 10:00:00', 0);

  // Seed Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, text, date, read, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertNotif.run('n1', 's1', 'آزمون «شبیه‌ساز درک عمومی هنر» برای شما فعال شد.', today, 0, '/s/exams');
  insertNotif.run('n2', 'c1', 'سارا کریمی کار عملی جدید فرستاد.', today, 0, '/c/practice');
  insertNotif.run('n3', 'c1', 'پیام جدید از طرف پارسا محمدی در چت آنلاین.', today, 0, '/c/chat');
}
