// Demo content: syllabus, question bank, plan templates and sample users.
// NOTE: the syllabus is a SAMPLE shaped after the art-konkur structure (art perception, math & physics
// perception, visual creativity, practical test, plus school general subjects). Edit freely or replace
// with data from your backend (GET /syllabus).

import { toISO, addDays, weekStart } from '../lib/dates';

export const SUBJECTS = [
  {
    id: 'art',
    name: 'درک عمومی هنر',
    weight: 12,
    color: '#2b3fd6',
    topics: [
      { id: 'iran_art', name: 'تاریخ هنر ایران' },
      { id: 'world_art', name: 'تاریخ هنر جهان' },
      { id: 'basics', name: 'مبانی هنرهای تجسمی' },
      { id: 'islamic', name: 'هنر اسلامی و معماری ایرانی' },
      { id: 'crafts', name: 'هنرهای سنتی و صنایع دستی' },
      { id: 'materials', name: 'خواص مواد و شناخت ابزار' },
      { id: 'theatre_cinema', name: 'خلاقیت نمایشی و سینما' },
      { id: 'music', name: 'خلاقیت موسیقی و سازشناسی' },
    ],
  },
  {
    id: 'mathphys',
    name: 'درک عمومی ریاضی و فیزیک',
    weight: 5,
    color: '#1f8a70',
    topics: [
      { id: 'geo', name: 'هندسه و تناسب' },
      { id: 'tech_draw', name: 'ترسیم فنی و مناظر' },
      { id: 'volume', name: 'حجم و مساحت' },
      { id: 'light', name: 'نور، صوت و فیزیک رنگ' },
      { id: 'ratio', name: 'نسبت، درصد و الگو' },
    ],
  },
  {
    id: 'creative',
    name: 'خلاقیت تصویری و تجسمی',
    weight: 3,
    color: '#e5446d',
    topics: [
      { id: 'spatial', name: 'دید فضایی و تجسم حجم' },
      { id: 'comp', name: 'ترکیب‌بندی و تعادل بصری' },
      { id: 'symmetry', name: 'تقارن و الگوها' },
      { id: 'visual', name: 'تفکر تصویری و نمادشناسی' },
    ],
  },
  {
    id: 'practical',
    name: 'آزمون عملی (مرحله دوم)',
    weight: 12,
    color: '#e8742a',
    topics: [
      { id: 'draw', name: 'طراحی فیگور و اشیا' },
      { id: 'paint', name: 'نقاشی و رنگ‌پردازی' },
      { id: 'idea', name: 'ایده‌پردازی و کانسپت' },
      { id: 'speed', name: 'طراحی سریع و اسکیس' },
    ],
  },
  {
    id: 'general',
    name: 'امتحانات نهایی (سوابق ۵۰٪)',
    weight: null,
    color: '#8a5cf5',
    topics: [
      { id: 'lit', name: 'ادبیات فارسی' },
      { id: 'arabic', name: 'عربی' },
      { id: 'religion', name: 'دین و زندگی' },
      { id: 'eng', name: 'زبان انگلیسی' },
    ],
  },
];

export const FIELDS = ['نقاشی', 'گرافیک', 'طراحی صنعتی', 'معماری داخلی', 'سینما', 'عکاسی', 'پویانمایی', 'صنایع دستی'];

export const PLANS = [
  {
    id: 'trial',
    name: 'آزمایشی (تست اولیه)',
    price: 0,
    priceText: 'رایگان (۱۴ روز)',
    studentLimit: 3,
    desc: 'مناسب برای تست و ارزیابی محیط سامانه و آشنایی مشاور با پنل و امکانات برنامه و آزمون.',
    perks: ['ظرفیت تا ۳ دانش‌آموز', 'برنامه‌ساز هفتگی و قالب‌های آماده', 'آزمون‌ساز تستی استاندارد', '۱۴ روز دسترسی به کلیه بخش‌ها'],
  },
  {
    id: 'basic',
    name: 'پایه (مشاوران مستقل)',
    price: null,
    priceText: 'تماس بگیرید',
    studentLimit: 15,
    desc: 'ویژه مشاوران فردی که جمع مشخصی از داوطلبان را به صورت منظم هدایت می‌کنند.',
    perks: ['ظرفیت تا ۱۵ دانش‌آموز فعال', 'برنامه‌ساز هفتگی کامل + کپی هفته‌ها', 'آزمون‌ساز و گزارش کامل کارنامه‌ها', 'بانک سؤال شخصی مشاور', 'چت آنلاین مستقیم با دانش‌آموزان', 'پایش هفتگی درصد انجام کارها'],
  },
  {
    id: 'pro',
    name: 'حرفه‌ای (آموزشگاه‌ها و تیم‌های برتر)',
    price: null,
    priceText: 'تماس بگیرید',
    studentLimit: 50,
    desc: 'کامل‌ترین پلن برای آموزشگاه‌ها و مشاوران پرمخاطب با نیاز به هوش مصنوعی و تصحیح کار عملی.',
    perks: ['ظرفیت تا ۵۰ دانش‌آموز (امکان ارتقا)', 'پیشنهاد هوشمند سؤال با هوش مصنوعی', 'تحلیل عمیق مباحث ضعیف داوطلبان', 'سیستم بازبینی و نمره‌دهی کارهای عملی', 'گفتگو و چت آنلاین نامحدود', 'پشتیبانی فنی اولویت‌دار'],
  },
];

// ── Question bank (sample) ─────────────────────────────────────
const Q = (topicId, text, options, answer, explanation, difficulty = 'medium') => ({
  topicId, text, options, answer, explanation, difficulty,
});

export const QUESTIONS = [
  Q('iran_art', 'تخت جمشید در کدام استان قرار دارد؟', ['فارس', 'اصفهان', 'خوزستان', 'کرمان'], 0, 'تخت جمشید در منطقه‌ی مرودشت، در استان فارس، قرار دارد.', 'easy'),
  Q('iran_art', 'مسجد شیخ‌لطف‌الله در کدام شهر و مربوط به کدام دوره است؟', ['اصفهان، صفوی', 'شیراز، زندیه', 'تبریز، ایلخانی', 'مشهد، تیموری'], 0, 'مسجد شیخ‌لطف‌الله از آثار شاخص دوره‌ی صفوی در میدان نقش جهان اصفهان است.'),
  Q('iran_art', 'طاق کسری (ایوان مدائن) مربوط به کدام دوره است؟', ['ساسانی', 'هخامنشی', 'اشکانی', 'سلجوقی'], 0, 'طاق کسری از بناهای شاخص دوره‌ی ساسانی است.'),
  Q('iran_art', 'مکتب نگارگری هرات در دوره‌ی کدام سلسله شکوفا شد؟', ['تیموریان', 'قاجار', 'افشار', 'غزنویان'], 0, 'مکتب هرات در دوره‌ی تیموریان و با حمایت شاهزادگان این سلسله اوج گرفت.'),
  Q('world_art', 'تابلوی مونالیزا اثر کدام هنرمند است؟', ['لئوناردو داوینچی', 'میکل‌آنژ', 'رافائل', 'ونگوگ'], 0, 'مونالیزا اثر لئوناردو داوینچی از هنرمندان رنسانس ایتالیاست.', 'easy'),
  Q('world_art', 'نام جنبش امپرسیونیسم از کدام اثر مونه گرفته شده است؟', ['تأثیر، طلوع آفتاب', 'نیلوفرهای آبی', 'شب پرستاره', 'گرنیکا'], 0, 'نام امپرسیونیسم برگرفته از تابلوی «تأثیر، طلوع آفتاب» اثر کلود مونه است.'),
  Q('world_art', 'پابلو پیکاسو و ژرژ براک بنیان‌گذار کدام سبک هستند؟', ['کوبیسم', 'سورئالیسم', 'اکسپرسیونیسم', 'پوپ‌آرت'], 0, 'پیکاسو و براک کوبیسم را در اوایل قرن بیستم پایه‌گذاری کردند.', 'easy'),
  Q('world_art', 'تابلوی «گرنیکا» در واکنش به کدام رویداد خلق شد؟', ['بمباران شهر گرنیکا در جنگ داخلی اسپانیا', 'جنگ جهانی اول در فرانسه', 'انقلاب صنعتی در انگلستان', 'انقلاب فرانسه'], 0, 'پیکاسو این اثر را پس از بمباران شهر گرنیکا در سال ۱۹۳۷ کشید.'),
  Q('basics', 'رنگ مکمل آبی در چرخه‌ی رنگ سنتی (قرمز، زرد، آبی) کدام است؟', ['نارنجی', 'سبز', 'بنفش', 'زرد'], 0, 'در چرخه‌ی رنگ سنتی، مکمل آبی نارنجی است (روبه‌روی هم قرار دارند).', 'easy'),
  Q('basics', 'رنگ‌های سبز، آبی و بنفش جزو کدام دسته‌اند؟', ['رنگ‌های سرد', 'رنگ‌های گرم', 'رنگ‌های خنثی', 'رنگ‌های مکمل'], 0, 'سبز، آبی و بنفش در دسته‌ی رنگ‌های سرد قرار می‌گیرند.', 'easy'),
  Q('basics', 'کدام عنصر بصری یک‌بعدی در نظر گرفته می‌شود؟', ['خط', 'نقطه', 'سطح', 'حجم'], 0, 'خط فقط طول دارد؛ سطح دو‌بعدی و حجم سه‌بعدی است.'),
  Q('basics', 'کوچک‌تر و کم‌رنگ‌تر نشان دادن اشیای دور برای ایجاد عمق چه نام دارد؟', ['پرسپکتیو', 'تقارن', 'کنتراست', 'ریتم'], 0, 'پرسپکتیو (خطی و هوایی) روشی برای نمایش عمق و فاصله است.', 'easy'),
  Q('islamic', 'مقرنس در معماری ایرانی بیشتر برای چه منظوری به کار می‌رود؟', ['گذار و تزیین در سقف و ورودی‌ها', 'ساخت پی بنا', 'ایجاد دودکش', 'تقویت دیوار حائل'], 0, 'مقرنس عنصری تزیینی و سازه‌ای برای گذار از سطح به سقف یا گنبد است.'),
  Q('islamic', 'خط نستعلیق به کدام هنرمند نسبت داده می‌شود؟', ['میرعلی تبریزی', 'ابن مقله', 'میرعماد قزوینی', 'یاقوت مستعصمی'], 0, 'ابداع نستعلیق به میرعلی تبریزی نسبت داده می‌شود.'),
  Q('islamic', 'بادگیر بیشتر در معماری سنتی کدام شهر دیده می‌شود؟', ['یزد', 'رشت', 'تبریز', 'اردبیل'], 0, 'بادگیر مخصوص مناطق گرم و خشک مرکزی ایران مانند یزد است.', 'easy'),
  Q('geo', 'مساحت مثلثی با قاعده‌ی ۸ و ارتفاع ۵ چقدر است؟', ['۲۰', '۴۰', '۱۳', '۳۰'], 0, 'مساحت = ½ × قاعده × ارتفاع = ½ × ۸ × ۵ = ۲۰', 'easy'),
  Q('geo', 'نسبت ارتفاع به عرض یک بوم ۴ به ۳ است. اگر عرض ۶۰ سانتی‌متر باشد، ارتفاع چند سانتی‌متر است؟', ['۸۰', '۴۵', '۷۵', '۹۰'], 0, 'ارتفاع = ۶۰ × ۴/۳ = ۸۰', 'easy'),
  Q('geo', 'هر زاویه‌ی داخلی شش‌ضلعی منتظم چند درجه است؟', ['۱۲۰', '۱۰۸', '۱۳۵', '۱۴۴'], 0, 'مجموع زوایا ۷۲۰ درجه است؛ ۷۲۰ ÷ ۶ = ۱۲۰'),
  Q('volume', 'حجم مکعبی به ضلع ۳ سانتی‌متر چند سانتی‌متر مکعب است؟', ['۲۷', '۹', '۱۸', '۸۱'], 0, 'حجم = ۳ × ۳ × ۳ = ۲۷', 'easy'),
  Q('volume', 'مساحت دایره‌ای به شعاع ۷ (با π ≈ ۳/۱۴) تقریباً چقدر است؟', ['۱۵۳/۸۶', '۴۳/۹۸', '۴۹', '۱۴۶'], 0, 'مساحت = π r² = ۳/۱۴ × ۴۹ = ۱۵۳/۸۶'),
  Q('light', 'در ترکیب نور رنگی (افزایشی)، ترکیب نور قرمز و سبز چه رنگی می‌سازد؟', ['زرد', 'بنفش', 'فیروزه‌ای', 'سفید'], 0, 'در ترکیب افزایشی نور، قرمز + سبز = زرد.'),
  Q('light', 'تجزیه‌ی نور سفید به رنگ‌های طیف توسط منشور چه نام دارد؟', ['پاشندگی', 'بازتاب', 'تداخل', 'پراش'], 0, 'به این پدیده پاشندگی (dispersion) می‌گویند.'),
  Q('light', 'سرعت نور در خلأ تقریباً چند کیلومتر بر ثانیه است؟', ['۳۰۰٬۰۰۰', '۳۰۰', '۳۰٬۰۰۰', '۳٬۰۰۰٬۰۰۰'], 0, 'سرعت نور در خلأ حدود ۳۰۰ هزار کیلومتر بر ثانیه است.', 'easy'),
  Q('spatial', 'یک مکعب چند وجه دارد؟', ['۶', '۸', '۱۲', '۴'], 0, 'مکعب ۶ وجه، ۸ رأس و ۱۲ یال دارد.', 'easy'),
  Q('spatial', 'اگر مکعبی را با برشی موازی یکی از وجه‌هایش ببریم، مقطع چه شکلی است؟', ['مربع', 'مثلث', 'دایره', 'ذوزنقه'], 0, 'برش موازی وجه، مقطعی هم‌اندازه‌ی همان وجه، یعنی مربع، می‌دهد.'),
  Q('comp', '«قانون یک‌سوم‌ها» در ترکیب‌بندی یعنی چه؟', ['قراردادن نقاط مهم روی خطوط و تقاطع‌های شبکه‌ی ۳×۳', 'قراردادن همه‌چیز در مرکز کادر', 'استفاده از فقط سه رنگ', 'تقسیم اثر به سه بخش هم‌رنگ'], 0, 'کادر با دو خط افقی و دو خط عمودی به نه بخش تقسیم می‌شود و عناصر مهم روی خطوط یا تقاطع‌ها قرار می‌گیرند.', 'easy'),
  Q('comp', 'تعادل نامتقارن در یک اثر یعنی:', ['عناصر با وزن بصری متفاوت، اما اثر متعادل', 'تکرار دقیق عناصر در دو سوی محور', 'نبود هر گونه تعادل', 'استفاده از یک رنگ'], 0, 'در تعادل نامتقارن، وزن بصری دو سمت برابر است ولی عناصر یکسان نیستند.'),
  Q('lit', 'سراینده‌ی «گلستان» کیست؟', ['سعدی', 'حافظ', 'مولوی', 'فردوسی'], 0, 'گلستان اثر سعدی شیرازی است (سال ۶۵۶ هجری).', 'easy'),
  Q('eng', 'She ____ to school every day.', ['goes', 'go', 'going', 'gone'], 0, 'With a third-person singular subject, the present simple verb takes -s/-es: goes.', 'easy'),
  Q('eng', 'The opposite of "expensive" is ____.', ['cheap', 'rich', 'heavy', 'slow'], 0, 'Cheap means low in price, the opposite of expensive.', 'easy'),
];

// Extra pool used by the mock "AI suggestion" button.
export const AI_POOL = [
  Q('iran_art', 'کاشی‌کاری معرق و هفت‌رنگ در کدام دوره بیشترین رونق را در بناهای مذهبی یافت؟', ['صفوی', 'هخامنشی', 'اشکانی', 'غزنوی'], 0, 'کاشی‌کاری معرق و هفت‌رنگ در دوره‌ی صفوی و قاجار در مساجد و بناهای مذهبی رونق فراوان یافت.'),
  Q('iran_art', 'نقش‌برجسته‌ی «طاق بستان» در نزدیکی کدام شهر قرار دارد؟', ['کرمانشاه', 'یزد', 'شیراز', 'رشت'], 0, 'طاق بستان، از آثار ساسانی، در نزدیکی کرمانشاه قرار دارد.'),
  Q('world_art', 'کدام هنرمند سقف کلیسای سیستین را نقاشی کرد؟', ['میکل‌آنژ', 'رامبراند', 'گویا', 'دالی'], 0, 'سقف کلیسای سیستین اثر میکل‌آنژ از هنرمندان رنسانس است.', 'easy'),
  Q('world_art', 'سالوادور دالی به کدام جنبش هنری شناخته می‌شود؟', ['سورئالیسم', 'کوبیسم', 'امپرسیونیسم', 'فوویسم'], 0, 'دالی از چهره‌های شاخص سورئالیسم است.', 'easy'),
  Q('basics', 'ارزش (Value) در هنرهای تجسمی به چه معناست؟', ['میزان روشنی و تیرگی یک رنگ', 'نام رنگ', 'اندازه‌ی شکل', 'نوع بافت'], 0, 'ارزش یا مقدار، درجه‌ی روشنی و تیرگی یک رنگ را نشان می‌دهد.'),
  Q('basics', 'ترکیب دو رنگ اصلی چه رنگی می‌سازد؟', ['رنگ فرعی', 'رنگ خنثی', 'رنگ مکمل', 'رنگ سرد'], 0, 'ترکیب دو رنگ اصلی یک رنگ فرعی (ثانویه) به‌وجود می‌آورد.', 'easy'),
  Q('geo', 'مجموع زوایای داخلی هر مثلث چند درجه است؟', ['۱۸۰', '۹۰', '۳۶۰', '۲۷۰'], 0, 'مجموع زوایای داخلی هر مثلث همیشه ۱۸۰ درجه است.', 'easy'),
  Q('geo', 'محیط مستطیلی با طول ۸ و عرض ۵ چقدر است؟', ['۲۶', '۴۰', '۱۳', '۳۹'], 0, 'محیط = ۲ × (۸ + ۵) = ۲۶', 'easy'),
  Q('volume', 'حجم استوانه‌ای با شعاع قاعده‌ی ۲ و ارتفاع ۵ (با π ≈ ۳) چقدر است؟', ['۶۰', '۳۰', '۲۰', '۱۲۰'], 0, 'حجم = π r² h = ۳ × ۴ × ۵ = ۶۰'),
  Q('light', 'پدیده‌ی بازتاب نور از سطح صیقلی را چه می‌نامند؟', ['بازتاب منظم', 'شکست', 'پراکندگی', 'جذب'], 0, 'بازتاب از سطح صیقلی «بازتاب منظم» است.', 'easy'),
  Q('crafts', 'کدام هنر سنتی ایران با نقش و نگار روی فلز با قلم و چکش سروکار دارد؟', ['قلم‌زنی', 'خاتم‌کاری', 'گلیم‌بافی', 'سفالگری'], 0, 'قلم‌زنی حکاکی و نقش‌اندازی روی فلز با قلم و چکش است.'),
  Q('crafts', 'خاتم‌کاری با کدام شیوه انجام می‌شود؟', ['کنار هم چیدن قطعات کوچک چوب، استخوان و فلز', 'ریخته‌گری برنز', 'بافت الیاف', 'لعاب‌دهی سفال'], 0, 'در خاتم، قطعات مثلثی‌شکل کوچک کنار هم چسبانده و برش داده می‌شوند.'),
  Q('media', 'اصطلاح «کادر بسته» در عکاسی و سینما یعنی:', ['نمایش نزدیک و محدود سوژه', 'نمایش وسیع محیط', 'تصویر از بالا', 'تصویر تیره'], 0, 'در کادر بسته سوژه نزدیک و محدود دیده می‌شود.'),
  Q('media', 'در طراحی صنعتی، «ارگونومی» به چه معناست؟', ['هماهنگی محصول با بدن و نیاز انسان', 'انتخاب رنگ محصول', 'کاهش قیمت تولید', 'تبلیغات محصول'], 0, 'ارگونومی یعنی طراحی محصول متناسب با ابعاد و راحتی کاربر.'),
  Q('ratio', 'اگر قیمت یک بوم ۲۰٪ تخفیف بخورد و قیمت اولیه ۵۰۰ هزار تومان باشد، قیمت جدید چند هزار تومان است؟', ['۴۰۰', '۴۲۰', '۳۵۰', '۴۸۰'], 0, '۵۰۰ − (۲۰٪ × ۵۰۰) = ۴۰۰', 'easy'),
  Q('ratio', 'در الگوی ۲، ۶، ۱۸، ۵۴ جمله‌ی بعدی کدام است؟', ['۱۶۲', '۱۰۸', '۷۲', '۱۴۴'], 0, 'هر جمله ۳ برابر جمله‌ی قبل است: ۵۴ × ۳ = ۱۶۲'),
  Q('symmetry', 'یک مربع چند محور تقارن دارد؟', ['۴', '۲', '۸', '۱'], 0, 'مربع دو محور قطری و دو محور میانی دارد.', 'easy'),
  Q('symmetry', 'کدام شکل بی‌شمار محور تقارن دارد؟', ['دایره', 'مربع', 'مثلث متساوی‌الاضلاع', 'لوزی'], 0, 'هر خطی که از مرکز دایره بگذرد محور تقارن آن است.'),
  Q('visual', 'در تفکر تصویری، «بازسازی ذهنی شکل» یعنی:', ['تصور و ترسیم شکل بدون دیدن آن', 'کپی مستقیم از روی عکس', 'پاک‌کردن اثر', 'رنگ‌آمیزی با ابزار'], 0, 'بازسازی ذهنی یعنی توانایی تصور و بازآفرینی یک شکل از حافظه.'),
  Q('islamic', 'گنبد دوپوش بیشتر برای چه هدفی ساخته می‌شود؟', ['زیبایی بیرونی و ارتفاع بیشتر بدون فشار سازه‌ای', 'نورگیری از کف', 'ایجاد زیرزمین', 'فقط تزیین داخلی'], 0, 'گنبد دوپوش اجازه می‌دهد ارتفاع بیرونی بلند و نمای زیبا با سازه‌ای مقاوم‌تر داشته باشیم.'),
];

// ── Plan templates ─────────────────────────────────────────────
// day: 0 = Saturday … 6 = Friday
export const TEMPLATES = [
  {
    id: 'balanced',
    name: 'هفته‌ی متعادل کنکور هنر (نظری + عملی + تست)',
    badge: 'جامع و پیشنهادی',
    desc: 'برنامه‌ای کامل و متوازن برای تمامی داوطلبان؛ ترکیبی از مطالعه تاریخ هنر، درک عمومی، هندسه و تمرین طراحی فیگور.',
    taskCount: 14,
    minutes: 990,
    tasks: [
      { day: 0, subjectId: 'art', topicId: 'iran_art', type: 'study', minutes: 90, title: 'مطالعه تاریخ هنر ایران (هخامنشی تا اشکانی)', note: 'بررسی تصاویر کتاب و خلاصه‌نویسی شاخصه‌ها' },
      { day: 0, subjectId: 'creative', topicId: 'spatial', type: 'study', minutes: 60, title: 'مطالعه دید فضایی و تجسم حجم', note: 'بررسی خطوط موازی و برش‌های مکعب' },
      { day: 1, subjectId: 'mathphys', topicId: 'geo', type: 'study', minutes: 75, title: 'مطالعه هندسه، زاویه‌ها و تناسب طلایی', note: 'حل فرمول‌های کلیدی کنکور' },
      { day: 1, subjectId: 'art', topicId: 'basics', type: 'test', minutes: 45, title: 'تست‌زنی مبانی هنرهای تجسمی و کادر', note: '۲۰ تست سراسری با تحلیل پاسخنامه' },
      { day: 2, subjectId: 'practical', topicId: 'draw', type: 'practice', minutes: 90, title: 'تمرین طراحی فیگور و ارزش خطی', note: '۱۰ اسکیس سریع ۵ دقیقه‌ای از مدل زنده یا عکس' },
      { day: 2, subjectId: 'art', topicId: 'world_art', type: 'study', minutes: 75, title: 'مطالعه تاریخ هنر جهان (یونان، روم و رنسانس)', note: 'مقایسه تناسبات پیکرتراشی دوره‌ها' },
      { day: 3, subjectId: 'mathphys', topicId: 'light', type: 'study', minutes: 60, title: 'مطالعه فیزیک نور، صوت و پدیده‌های رنگ', note: 'طیف مریی، شکست نور و زاویه تابش' },
      { day: 3, subjectId: 'creative', topicId: 'comp', type: 'test', minutes: 45, title: 'تست ترکیب‌بندی و تعادل بصری', note: 'حل تست‌های کادر و وزن بصری' },
      { day: 4, subjectId: 'art', topicId: 'islamic', type: 'study', minutes: 90, title: 'مطالعه هنر و معماری اسلامی ایران', note: 'بررسی اجزای مسجد، گنبدها و مقرنس‌ها' },
      { day: 4, subjectId: 'art', topicId: 'materials', type: 'study', minutes: 60, title: 'مطالعه خواص مواد (سفالگری و لعاب)', note: 'شناخت انواع خاک رس و روش‌های پخت' },
      { day: 5, subjectId: 'practical', topicId: 'paint', type: 'practice', minutes: 90, title: 'تمرین نقاشی و ترکیب رنگ‌ها', note: 'اجرای یک اتود رنگی با کنتراست همزمان' },
      { day: 5, subjectId: 'mathphys', topicId: 'tech_draw', type: 'test', minutes: 60, title: 'تست پرسپکتیو و ترسیم فنی', note: 'تست‌های پرسپکتیو یک و دو نقطه‌ای' },
      { day: 6, subjectId: 'art', topicId: 'iran_art', type: 'review', minutes: 60, title: 'مرور هفتگی تاریخ هنر و نکات کلیدی', note: 'مرور یادداشت‌ها و تست‌های نشان‌دار شده' },
      { day: 6, subjectId: 'art', topicId: 'basics', type: 'test', minutes: 45, title: 'آزمونک جامع آخر هفته مبانی هنر', note: 'سنجش تسلط و ثبت کارنامه در سامانه' },
    ],
  },
  {
    id: 'graphic',
    name: 'برنامه تخصصی رشته ارتباط تصویری و گرافیک',
    badge: 'ویژه گرافیک',
    desc: 'تمرکز ویژه بر مبانی تجسمی، ترکیب‌بندی، تاریخ پوستر، عکاسی، تایپوگرافی و طراحی سریع آرم و نشانه.',
    taskCount: 13,
    minutes: 930,
    tasks: [
      { day: 0, subjectId: 'art', topicId: 'basics', type: 'study', minutes: 90, title: 'مطالعه مبانی تجسمی (خط، نقطه و سطح)', note: 'بررسی نیروهای بصری و پویایی در صفحه' },
      { day: 0, subjectId: 'creative', topicId: 'comp', type: 'study', minutes: 60, title: 'مطالعه اصول صفحه‌آرایی و گریدبندی', note: 'تحلیل نمونه‌های برتر پوستر و کتاب' },
      { day: 1, subjectId: 'practical', topicId: 'speed', type: 'practice', minutes: 90, title: 'تمرین طراحی سریع آرم و نشانه‌های نمادین', note: 'اتودهای مونوگرام و پیکتوگرام' },
      { day: 1, subjectId: 'art', topicId: 'world_art', type: 'study', minutes: 75, title: 'مطالعه تاریخ گرافیک، پوستر و عکاسی جهان', note: 'مکتب باهاوس و ساختارگرایی روس' },
      { day: 2, subjectId: 'art', topicId: 'basics', type: 'test', minutes: 60, title: 'تست‌های تخصصی رنگ‌شناسی و هارمونی', note: 'تست‌های چرخه رنگ، مکمل‌ها و کنتراست‌ها' },
      { day: 2, subjectId: 'creative', topicId: 'visual', type: 'study', minutes: 60, title: 'نمادشناسی و تفکر تصویری در گرافیک', note: 'مفاهیم نشانه‌شناسی و دلالت‌های معنایی' },
      { day: 3, subjectId: 'art', topicId: 'crafts', type: 'study', minutes: 60, title: 'مطالعه چاپ دستی (سیلک، لینو و اچینگ)', note: 'تکنیک‌های انتقال رنگ و کلیشه' },
      { day: 3, subjectId: 'mathphys', topicId: 'geo', type: 'study', minutes: 75, title: 'ترسیم شبکه‌های هندسی و گره‌های گرافیستی', note: 'محاسبه تناسبات طلایی در کادر' },
      { day: 4, subjectId: 'practical', topicId: 'draw', type: 'practice', minutes: 90, title: 'تمرین تصویرسازی و کاراکترسازی دستی', note: 'اجرای خطی با راپید و هاشور' },
      { day: 4, subjectId: 'art', topicId: 'iran_art', type: 'study', minutes: 75, title: 'مطالعه خوشنویسی و نگارگری ایرانی', note: 'سیر تحول خطوط کوفی، نسخ، نستعلیق و شکسته' },
      { day: 5, subjectId: 'creative', topicId: 'spatial', type: 'test', minutes: 60, title: 'تست دید فضایی و گسترده احجام', note: 'تست‌های گسترده جعبه و بسته‌بندی' },
      { day: 6, subjectId: 'art', topicId: 'basics', type: 'review', minutes: 60, title: 'مرور جامع تعاریف و اصطلاحات گرافیک', note: 'مرور فلش‌کارت‌ها و واژگان تخصصی' },
      { day: 6, subjectId: 'art', topicId: 'world_art', type: 'test', minutes: 45, title: 'تست تاریخ هنر معاصر و سبک‌های مدرن', note: 'پاپ‌آرت، آپ‌آرت و دادائیسم' },
    ],
  },
  {
    id: 'painting',
    name: 'برنامه تخصصی رشته نقاشی و نگارگری',
    badge: 'ویژه نقاشی',
    desc: 'تمرکز عمیق بر طراحی دستی، اسکیس فیگور، چرخه رنگ، خواص رنگ و ابزار، و شناخت مکاتب نقاشی ایران و جهان.',
    taskCount: 12,
    minutes: 960,
    tasks: [
      { day: 0, subjectId: 'practical', topicId: 'draw', type: 'practice', minutes: 120, title: 'طراحی تخصصی فیگور و دست و پا', note: 'رعایت نسبت ۸ سر در قد انسان و اسکلت‌بندی' },
      { day: 0, subjectId: 'art', topicId: 'iran_art', type: 'study', minutes: 75, title: 'مطالعه مکاتب نگارگری ایران (هرات، تبریز و اصفهان)', note: 'ویژگی‌های آثار کمال‌الدین بهزاد و رضا عباسی' },
      { day: 1, subjectId: 'practical', topicId: 'speed', type: 'practice', minutes: 90, title: 'اسکیس سرعتی از فضا و اشیای پیرامون', note: 'تمرین خط پرانرژی و پرسپکتیو حسی' },
      { day: 1, subjectId: 'art', topicId: 'basics', type: 'study', minutes: 75, title: 'مطالعه رنگ‌شناسی ایتن و روانشناسی رنگ', note: '۷ کنتراست رنگ و دمای رنگ‌ها' },
      { day: 2, subjectId: 'practical', topicId: 'paint', type: 'practice', minutes: 120, title: 'تمرین نقاشی رنگی (آبرنگ یا گواش)', note: 'لایه‌گذاری رنگی و کنترل درخشندگی' },
      { day: 2, subjectId: 'art', topicId: 'materials', type: 'study', minutes: 60, title: 'مطالعه خواص رنگ‌ها، چسب‌ها و بوم‌ها', note: 'تفاوت رنگ‌روغن، اکریلیک، گواش و تمپرا' },
      { day: 3, subjectId: 'art', topicId: 'world_art', type: 'study', minutes: 90, title: 'مطالعه سبک‌های نقاشی قرن ۱۹ و ۲۰ جهان', note: 'امپرسیونیسم، فوویسم، کوبیسم و اکسپرسیونیسم' },
      { day: 3, subjectId: 'art', topicId: 'basics', type: 'test', minutes: 45, title: 'تست‌زنی بافت، پرسپکتیو جوی و تیرگی-روشنی', note: '۲۰ تست کنکور سراسری' },
      { day: 4, subjectId: 'practical', topicId: 'idea', type: 'practice', minutes: 90, title: 'تمرین اتود ایده و ترکیب‌بندی خلاقانه', note: 'چیدمان چند فیگور در کادر داستانی' },
      { day: 5, subjectId: 'art', topicId: 'iran_art', type: 'test', minutes: 60, title: 'تست تخصصی نقاشی و نگارگری ایرانی', note: 'شناخت دیوارنگاره‌ها و نسخه‌های خطی کهن' },
      { day: 5, subjectId: 'mathphys', topicId: 'light', type: 'study', minutes: 60, title: 'مطالعه سایه و روشن و منابع نور', note: 'نور طبیعی، نور موضعی و نیم‌سایه' },
      { day: 6, subjectId: 'practical', topicId: 'draw', type: 'review', minutes: 45, title: 'تحلیل و نقد کارهای طراحی هفته', note: 'بررسی نقاط ضعف در آناتومی و رفع ایراد' },
    ],
  },
  {
    id: 'cinema',
    name: 'برنامه تخصصی رشته سینما و ادبیات نمایشی',
    badge: 'ویژه سینما و تئاتر',
    desc: 'تمرکز بر تاریخ سینما، عناصر فیلمنامه، سبک‌های تئاتر، زاویه‌های دوربین، تدوین و خلاقیت‌های نمایشی.',
    taskCount: 12,
    minutes: 870,
    tasks: [
      { day: 0, subjectId: 'art', topicId: 'theatre_cinema', type: 'study', minutes: 90, title: 'مطالعه تاریخ سینمای جهان (صامت تا کلاسیک)', note: 'برادران لومیر، ژرژ ملی‌یس، گریفیث و مکتب مونتاژ شوروی' },
      { day: 0, subjectId: 'art', topicId: 'theatre_cinema', type: 'study', minutes: 60, title: 'مطالعه ادبیات نمایشی یونان باستان و شکسپیر', note: 'ارسطو، تراژدی، کمدی و بوطیقا' },
      { day: 1, subjectId: 'art', topicId: 'theatre_cinema', type: 'test', minutes: 60, title: 'تست‌های تخصصی عناصر فیلمنامه و نماها', note: 'کلوزآپ، اکستریم لانگ‌شات، زاویه های‌انگل و لو‌انگل' },
      { day: 1, subjectId: 'creative', topicId: 'comp', type: 'study', minutes: 60, title: 'مطالعه میزانسن و ترکیب‌بندی در قاب سینما', note: 'حرکات دوربین، عمق میدان و نورپردازی کلاسیک' },
      { day: 2, subjectId: 'art', topicId: 'theatre_cinema', type: 'study', minutes: 90, title: 'مطالعه تاریخ سینمای ایران (از آغاز تا موج نو)', note: 'فیلم‌های دختر لر، گاو، قیصر و کارگردانان شاخص' },
      { day: 2, subjectId: 'art', topicId: 'world_art', type: 'study', minutes: 60, title: 'مطالعه اکسپرسیونیسم آلمان و نئورئالیسم ایتالیا', note: 'مطب دکتر کالیگاری، دزد دوچرخه و مشخصات بصری' },
      { day: 3, subjectId: 'art', topicId: 'theatre_cinema', type: 'test', minutes: 60, title: 'تست‌های تئاتر سنتی ایران و تعزیه', note: 'نقالی، سیاه‌بازی، پرده‌خوانی و شبیه‌خوانی' },
      { day: 3, subjectId: 'art', topicId: 'music', type: 'study', minutes: 60, title: 'شناخت سازهای سنتی و موسیقی فیلم', note: 'دستگاه‌های موسیقی ایرانی و سازشناسی سمفونیک' },
      { day: 4, subjectId: 'creative', topicId: 'visual', type: 'study', minutes: 60, title: 'تحلیل استوری‌بورد و ریتم تدوین', note: 'تدوین تداومی، تقطیع موازی و برش‌های پرشی' },
      { day: 4, subjectId: 'art', topicId: 'theatre_cinema', type: 'test', minutes: 60, title: 'تست‌های سبک‌های ادبیات نمایشی معاصر', note: 'تئاتر ابزورد، برشت و تئاتر حماسی' },
      { day: 5, subjectId: 'practical', topicId: 'idea', type: 'practice', minutes: 90, title: 'تمرین نگارش ایده و سناریوی یک دقیقه‌ای تصویری', note: 'شخصیت‌پردازی، کشمکش و نقطه اوج' },
      { day: 6, subjectId: 'art', topicId: 'theatre_cinema', type: 'review', minutes: 60, title: 'مرور جامع اصطلاحات سینمایی و تست جمع‌بندی', note: 'مرور نام کارگردانان، فیلم‌ها و جوایز مهم' },
    ],
  },
  {
    id: 'theory',
    name: 'برنامه فشرده نظری و پژوهش هنر',
    badge: 'نظری و رتبه‌ساز',
    desc: 'ویژه داوطلبانی که می‌خواهند درصد درک عمومی هنر را بالای ۷۰٪ برسانند؛ تمرکز عمیق روی تاریخ هنر، صنایع دستی و معماری.',
    taskCount: 14,
    minutes: 1050,
    tasks: [
      { day: 0, subjectId: 'art', topicId: 'iran_art', type: 'study', minutes: 105, title: 'مطالعه تاریخ هنر ایران باستان (سیلک، عیلام، ماد و هخامنشی)', note: 'بررسی سفالینه‌ها، جام‌ها و نقش‌برجسته‌ها' },
      { day: 0, subjectId: 'art', topicId: 'iran_art', type: 'test', minutes: 45, title: 'تست‌های هنر ماد و هخامنشی', note: '۲۰ تست مفهومی با بررسی گزینه‌های انحرافی' },
      { day: 1, subjectId: 'art', topicId: 'world_art', type: 'study', minutes: 90, title: 'مطالعه هنر مصر، بین‌النهرین و هند باستان', note: 'زیگورات‌ها، اهرام و پیکره‌های باستانی' },
      { day: 1, subjectId: 'art', topicId: 'crafts', type: 'study', minutes: 60, title: 'مطالعه صنایع دستی ایران (فرش‌بافی و گلیم)', note: 'طرح‌های شاه‌عباسی، لچک ترنج، گره فارسی و ترکی' },
      { day: 2, subjectId: 'art', topicId: 'islamic', type: 'study', minutes: 90, title: 'مطالعه معماری سلجوقی و ایلخانی ایران', note: 'گنبد سرخ مراغه، مسجد جامع اصفهان، گنبد سلطانیه' },
      { day: 2, subjectId: 'art', topicId: 'materials', type: 'study', minutes: 60, title: 'مطالعه فلزکاری و شیشه‌گری سنتی', note: 'میناکاری، قلم‌زنی و آلیاژهای سنتی مفرغ و برنج' },
      { day: 3, subjectId: 'art', topicId: 'world_art', type: 'study', minutes: 90, title: 'مطالعه سبک‌های هنر گوتیک، رومانسک و باروک', note: 'کلیساهای جامع، نقاشی‌های کاراواجو و رامبرانت' },
      { day: 3, subjectId: 'art', topicId: 'world_art', type: 'test', minutes: 45, title: 'تست تاریخ هنر جهان (قرون وسطی و رنسانس)', note: 'تست‌های تطبیقی آثار و هنرمندان' },
      { day: 4, subjectId: 'mathphys', topicId: 'geo', type: 'study', minutes: 90, title: 'مطالعه هندسه فضایی و گسترده احجام', note: 'برش مخروط، کره و استوانه در پرسپکتیو' },
      { day: 4, subjectId: 'art', topicId: 'iran_art', type: 'study', minutes: 75, title: 'مطالعه هنر قاجار و مکتب پیکره‌نگاری درباری', note: 'نقاشی‌های صنیع‌الملک و کمال‌الملک' },
      { day: 5, subjectId: 'art', topicId: 'crafts', type: 'study', minutes: 75, title: 'مطالعه چاپ کلاقه‌ای (باتیک) و قلمکار', note: 'روش‌های رنگرزی سنتی و دندانه‌ها' },
      { day: 5, subjectId: 'art', topicId: 'theatre_cinema', type: 'study', minutes: 60, title: 'مطالعه تاریخ نمایش و تعزیه در ایران', note: 'تکیه دولت و ادبیات تعزیه‌خوانی' },
      { day: 6, subjectId: 'art', topicId: 'iran_art', type: 'review', minutes: 90, title: 'مرور فشرده خلاصه‌نویسی‌های تاریخ هنر ایران', note: 'مرور جدول تطبیقی ادوار تاریخی' },
      { day: 6, subjectId: 'art', topicId: 'world_art', type: 'test', minutes: 65, title: 'آزمون شبیه‌ساز ۴۰ سؤالی درک عمومی هنر', note: 'آزمون زمان‌دار با محاسبه درصد و نمره منفی' },
    ],
  },
  {
    id: 'quick_test',
    name: 'برنامه تست‌زنی سرعتی و مرور جامع (دوران جمع‌بندی)',
    badge: 'تست و جمع‌بندی',
    desc: 'ویژه ماه‌های پایانی و دوران جمع‌بندی؛ حل تست‌های سراسری سال‌های اخیر، مرور یادداشت‌ها و سنجش سرعت عمل.',
    taskCount: 14,
    minutes: 840,
    tasks: [
      { day: 0, subjectId: 'art', topicId: 'iran_art', type: 'test', minutes: 60, title: 'حل ۵۰ تست کنکور سراسری تاریخ هنر ایران', note: 'محاسبه درصد با احتساب نمره منفی' },
      { day: 0, subjectId: 'art', topicId: 'iran_art', type: 'review', minutes: 45, title: 'تحلیل گزینه‌ها و مرور پاسخنامه تشریحی', note: 'یادداشت‌برداری از نکته‌های تستی جدید' },
      { day: 1, subjectId: 'art', topicId: 'world_art', type: 'test', minutes: 60, title: 'حل ۵۰ تست کنکور سراسری تاریخ هنر جهان', note: 'تمرکز بر دوره‌های باستان و مدرن' },
      { day: 1, subjectId: 'art', topicId: 'world_art', type: 'review', minutes: 45, title: 'تحلیل پاسخنامه و مرور مکاتب اشتباه‌شده', note: 'بررسی تصاویر کتاب‌های مرجع' },
      { day: 2, subjectId: 'art', topicId: 'basics', type: 'test', minutes: 60, title: 'حل ۴۰ تست مبانی هنرهای تجسمی و رنگ', note: 'تست‌های مفهومی کادر و نیروهای بصری' },
      { day: 2, subjectId: 'creative', topicId: 'spatial', type: 'test', minutes: 60, title: 'حل ۳۰ تست دید فضایی و تجسم حجم', note: 'سرعت عمل در حل مسائل سه بعدی' },
      { day: 3, subjectId: 'mathphys', topicId: 'geo', type: 'test', minutes: 60, title: 'حل ۳۰ تست هندسه و ترسیم فنی کنکور هنر', note: 'فرمول‌های مساحت، حجم و تناسبات' },
      { day: 3, subjectId: 'art', topicId: 'crafts', type: 'test', minutes: 45, title: 'حل ۳۰ تست صنایع دستی و خواص مواد', note: 'تست‌های الیاف، سفال و فرش‌بافی' },
      { day: 4, subjectId: 'art', topicId: 'theatre_cinema', type: 'test', minutes: 60, title: 'حل ۴۰ تست خلاقیت نمایشی و سینما', note: 'اصطلاحات، سبک‌ها و تاریخ سینما' },
      { day: 4, subjectId: 'art', topicId: 'music', type: 'test', minutes: 45, title: 'حل ۲۵ تست خلاقیت موسیقی و سازشناسی', note: 'سازهای بادی، زهی، کوبه‌ای و ردیف' },
      { day: 5, subjectId: 'practical', topicId: 'speed', type: 'practice', minutes: 90, title: 'آزمون شبیه‌ساز طراحی عملی در زمان محدود', note: 'اجرای یک موضوع ترکیبی در ۹۰ دقیقه بدون وقفه' },
      { day: 5, subjectId: 'general', topicId: 'lit', type: 'review', minutes: 60, title: 'مرور لغات و تاریخ ادبیات عمومی', note: 'تثبیت سوابق تحصیلی امتحانات نهایی' },
      { day: 6, subjectId: 'art', topicId: 'iran_art', type: 'test', minutes: 90, title: 'شرکت در آزمون جامع شبیه‌ساز کنکور هنر', note: 'اجرای کامل شرایط جلسه آزمون سراسری' },
      { day: 6, subjectId: 'art', topicId: 'basics', type: 'review', minutes: 55, title: 'تحلیل کامل کارنامه و رفع اشکال', note: 'ثبت نکات در دفترچه مرور و برنامه‌ریزی هفته بعد' },
    ],
  },
];

// ── Sample SVG artwork for demo practice submissions ───────────
export function demoArt(seed) {
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

// ── Deterministic pseudo-random helper ─────────────────────────
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const COLORS = ['#2b3fd6', '#e5446d', '#1f8a70', '#e8742a', '#8a5cf5', '#c98a00'];

// ── Seed builder ───────────────────────────────────────────────
export function buildSeed() {
  const now = new Date();
  const today = toISO(now);
  const wk = weekStart(now);
  const tplMap = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
  const topicName = Object.fromEntries(SUBJECTS.flatMap((s) => s.topics.map((t) => [t.id, t.name])));
  const typeLabel = { study: 'مطالعه', test: 'تست', review: 'مرور', practice: 'تمرین' };

  const users = [
    { id: 'a1', role: 'admin', name: 'مدیر سامانه', phone: '09120000000', color: COLORS[0] },
    { id: 'c1', role: 'counselor', name: 'مریم احمدی', phone: '09121111111', color: COLORS[1], plan: 'pro', status: 'active', renewAt: toISO(addDays(now, 19)), speciality: 'مشاور کنکور هنر' },
    { id: 'c2', role: 'counselor', name: 'علی رضایی', phone: '09122222222', color: COLORS[2], plan: 'basic', status: 'active', renewAt: toISO(addDays(now, 6)), speciality: 'مشاور کنکور هنر' },
    { id: 'c3', role: 'counselor', name: 'نگار صالحی', phone: '09123333333', color: COLORS[4], plan: 'trial', status: 'active', renewAt: toISO(addDays(now, 9)), speciality: 'مشاور کنکور هنر' },
    { id: 's1', role: 'student', name: 'سارا کریمی', phone: '09124444441', field: 'گرافیک', counselorId: 'c1', color: COLORS[3], diligence: 0.85 },
    { id: 's2', role: 'student', name: 'پارسا محمدی', phone: '09124444442', field: 'نقاشی', counselorId: 'c1', color: COLORS[0], diligence: 0.7 },
    { id: 's3', role: 'student', name: 'الهه نظری', phone: '09124444443', field: 'معماری داخلی', counselorId: 'c1', color: COLORS[2], diligence: 0.5 },
    { id: 's4', role: 'student', name: 'آرمین حسینی', phone: '09124444444', field: 'طراحی صنعتی', counselorId: 'c1', color: COLORS[5], diligence: 0.35 },
    { id: 's5', role: 'student', name: 'مهسا کاظمی', phone: '09124444445', field: 'سینما', counselorId: 'c1', color: COLORS[1], diligence: 0.9 },
    { id: 's6', role: 'student', name: 'کیان فرهادی', phone: '09124444446', field: 'عکاسی', counselorId: 'c2', color: COLORS[4], diligence: 0.6 },
  ];
  const students = users.filter((u) => u.role === 'student');

  let seq = 1;
  const id = (p) => `${p}${seq++}`;
  const tasks = [];
  const sessions = [];
  const rand = rng(42);

  // Tasks: last week, this week, (next week for s1 only)
  for (const st of students) {
    const weeks = st.id === 's1' ? [-1, 0, 1] : st.id === 's6' ? [0] : [-1, 0];
    for (const w of weeks) {
      const tpl = st.id === 's4' || st.id === 's3' ? (tplMap.theory_heavy || tplMap.balanced) : st.id === 's2' ? (tplMap.painting || tplMap.balanced) : tplMap.balanced;
      for (const t of (tpl?.tasks || [])) {
        const date = toISO(addDays(wk, w * 7 + t.day));
        let done = false;
        if (date < today) done = rand() < st.diligence;
        else if (date === today) done = rand() < st.diligence * 0.4;
        const task = {
          id: id('t'), studentId: st.id, date, subjectId: t.subjectId, topicId: t.topicId, type: t.type,
          minutes: t.minutes, title: `${typeLabel[t.type]} ${topicName[t.topicId]}`, note: '', done,
        };
        tasks.push(task);
        if (done && t.type !== 'test') sessions.push({ id: id('ss'), studentId: st.id, date, subjectId: t.subjectId, minutes: Math.round(t.minutes * (0.8 + rand() * 0.4)), taskId: task.id, auto: true });
      }
    }
  }

  // Questions
  const questions = QUESTIONS.map((q, i) => ({ ...q, id: `q${i + 1}`, ownerId: 'c1', source: 'counselor' }));
  const byTopic = (ids) => questions.filter((q) => ids.includes(q.topicId)).map((q) => q.id);

  // Exams
  const exams = [
    { id: 'e1', title: 'آزمون مبانی و هنر اسلامی', createdBy: 'c1', topicIds: ['basics', 'islamic'], questionIds: byTopic(['basics', 'islamic']), studentIds: ['s1', 's2', 's3', 's4', 's5'], durationMin: 10, deadline: toISO(addDays(now, -14)), createdAt: toISO(addDays(now, -21)) },
    { id: 'e2', title: 'آزمون تاریخ هنر', createdBy: 'c1', topicIds: ['iran_art', 'world_art'], questionIds: byTopic(['iran_art', 'world_art']), studentIds: ['s1', 's2', 's3', 's4', 's5'], durationMin: 12, deadline: toISO(addDays(now, -5)), createdAt: toISO(addDays(now, -9)) },
    { id: 'e3', title: 'آزمون هندسه، حجم و نور', createdBy: 'c1', topicIds: ['geo', 'volume', 'light'], questionIds: byTopic(['geo', 'volume', 'light']), studentIds: ['s1', 's2', 's5'], durationMin: 12, deadline: toISO(addDays(now, 3)), createdAt: toISO(addDays(now, -1)) },
  ];

  const results = [];
  const mk = (exam, studentId, accuracy, date, r) => {
    const answers = {};
    const qs = exam.questionIds.map((qid) => questions.find((q) => q.id === qid));
    for (const q of qs) {
      const x = r();
      if (x < 0.06) continue; // blank
      answers[q.id] = x < accuracy ? q.answer : (q.answer + 1 + Math.floor(r() * 3)) % 4;
    }
    results.push({ id: id('r'), examId: exam.id, studentId, answers, finishedAt: date, spentSec: Math.round(exam.durationMin * 60 * (0.5 + r() * 0.4)) });
  };
  const r2 = rng(7);
  mk(exams[0], 's1', 0.55, toISO(addDays(now, -17)), r2);
  mk(exams[0], 's2', 0.6, toISO(addDays(now, -16)), r2);
  mk(exams[0], 's3', 0.45, toISO(addDays(now, -15)), r2);
  mk(exams[0], 's4', 0.35, toISO(addDays(now, -15)), r2);
  mk(exams[0], 's5', 0.8, toISO(addDays(now, -16)), r2);
  mk(exams[1], 's1', 0.75, toISO(addDays(now, -7)), r2);
  mk(exams[1], 's2', 0.65, toISO(addDays(now, -6)), r2);
  mk(exams[1], 's3', 0.4, toISO(addDays(now, -6)), r2);
  mk(exams[1], 's5', 0.85, toISO(addDays(now, -7)), r2);
  mk(exams[2], 's5', 0.8, toISO(addDays(now, -0)), r2);

  // Practice work
  const practice = [
    { id: 'p1', studentId: 's1', title: 'طراحی طبیعت بی‌جان', topicId: 'draw', note: 'مدادهای HB و 4B', image: demoArt(0), createdAt: toISO(addDays(now, -6)), status: 'reviewed', feedback: 'نسبت‌ها خوب است؛ روی سایه‌روشن زیر شیشه بیشتر کار کن و خطوط را سبک‌تر شروع کن.', score: 15 },
    { id: 'p2', studentId: 's1', title: 'نقاشی رنگ‌های مکمل', topicId: 'paint', note: 'گواش', image: demoArt(1), createdAt: toISO(addDays(now, -1)), status: 'pending', feedback: '', score: null },
    { id: 'p3', studentId: 's2', title: 'ایده‌پردازی: شهر در آینده', topicId: 'idea', note: '', image: demoArt(2), createdAt: toISO(addDays(now, -2)), status: 'pending', feedback: '', score: null },
  ];

  const notifications = [
    { id: 'n1', userId: 's1', text: 'آزمون «هندسه، حجم و نور» برای تو ارسال شد.', date: toISO(addDays(now, -1)), read: false, link: '/s/exams' },
    { id: 'n2', userId: 's1', text: 'مشاورت برنامه‌ی این هفته را به‌روزرسانی کرد.', date: toISO(addDays(now, -2)), read: false, link: '/s/plan' },
    { id: 'n3', userId: 'c1', text: 'پارسا محمدی یک کار عملی جدید فرستاد.', date: toISO(addDays(now, -2)), read: false, link: '/c/practice' },
    { id: 'n4', userId: 'c1', text: 'مهسا کاظمی آزمون «هندسه، حجم و نور» را تمام کرد.', date: toISO(now), read: false, link: '/c/exams/e3' },
  ];

  const messages = [
    { id: 'm1', senderId: 'c1', receiverId: 's1', text: 'سلام سارا جان، برنامه‌ی مطالعاتی این هفته بارگذاری شد. بخش تاریخ هنر ایران رو با دقت بیشتری مطالعه کن.', createdAt: toISO(addDays(now, -1)), read: true },
    { id: 'm2', senderId: 's1', receiverId: 'c1', text: 'سلام استاد احمدی، ممنون. برای تمرین طراحی طبیعت بی‌جان عکسی که فرستادم سایه‌روشن‌هاش مناسبه؟', createdAt: toISO(addDays(now, -1)), read: true },
    { id: 'm3', senderId: 'c1', receiverId: 's1', text: 'کارت رو دیدم، نسبت‌ها دقیق بود. فقط تیرگی‌های زیر کاسه رو پررنگ‌تر کن تا عمق بهتری بگیره.', createdAt: toISO(now), read: true },
    { id: 'm4', senderId: 's2', receiverId: 'c1', text: 'سلام استاد، برای درک عمومی ریاضی از چه کتاب تستی استفاده کنم؟', createdAt: toISO(now), read: false },
  ];

  return { version: 1, users, tasks, sessions, questions, exams, results, practice, notifications, messages, seq };
}
