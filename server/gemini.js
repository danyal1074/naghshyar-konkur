import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let envKey = process.env.GEMINI_API_KEY;
if (!envKey) {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const [k, ...v] = line.trim().split('=');
        if (k === 'GEMINI_API_KEY') envKey = v.join('=').trim();
      }
    }
  } catch {}
}

const GEMINI_API_KEY = envKey || '';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

export async function callGemini(contents, systemInstruction = '', jsonMode = false) {
  let lastErr = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = { contents };
      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }
      if (jsonMode) {
        payload.generationConfig = { responseMimeType: 'application/json' };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) {
        lastErr = new Error(`${model}: ${data.error.message}`);
        console.warn(`[Gemini] Model ${model} error:`, data.error.message);
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (e) {
      lastErr = e;
      console.warn(`[Gemini] Model ${model} fetch failure:`, e.message);
    }
  }
  throw lastErr || new Error('تمام مدل‌های جمنای با خطا مواجه شدند.');
}

/**
 * AI Assistant Chat for Art Entrance Exam students & counselors
 */
export async function askGeminiChat(message, history = [], user = null) {
  const systemInstruction = `تو «دستیار هوشمند و مشاور تخصصی کنکور هنر نقش‌یار» هستی.
وظیفه تو پاسخ‌دهی دقیق، صمیمانه، علمی و کنکوری به داوطلبان و مشاوران کنکور هنر در ایران است.
تسلط کامل بر مباحث:
- درک عمومی هنر (تاریخ هنر ایران از باستان تا معاصر، تاریخ هنر جهان از یونان تا سبک‌های مدرن، مبانی هنرهای تجسمی و رنگ‌شناسی، هنر و معماری اسلامی، صنایع دستی و بافت، خواص مواد)
- درک عمومی ریاضی و فیزیک (هندسه، پرسپکتیو، فیزیک نور و شکست رنگ، تناسب طلایی و محاسبات الگو)
- خلاقیت تصویری و تجسمی (دید فضایی، ترکیب‌بندی، نمادشناسی، تحلیل تصویر)
- خلاقیت نمایشی و سینما (تاریخ سینما، سبک‌های تئاتر، فیلمنامه‌نویسی و کارگردانی)
- خلاقیت موسیقی (سازشناسی ایرانی و جهانی، تئوری موسیقی)
- آزمون‌های عملی مرحله دوم (طراحی فیگور، نقاشی، گرافیک)

پاسخ‌هایت باید:
۱. فارسی، روان، انگیزشی و متمرکز بر نکات تستی و منابع رسمی کنکور هنر سازمان سنجش باشد.
۲. نکات کلیدی را به صورت بولت‌پوینت یا پاراگراف‌های کوتاه ارائه کند.
۳. اگر داوطلب سوال درسی پرسید، با مثال تشریح کن.
۴. کاربر فعلی: ${user?.name ? `${user.name} (${user.role === 'counselor' ? 'مشاور' : 'داوطلب رشته ' + (user.field || 'هنر')})` : 'داوطلب کنکور هنر'}.`;

  const contents = [];
  if (Array.isArray(history)) {
    for (const h of history.slice(-6)) {
      if (h.text || h.message) {
        contents.push({
          role: h.role === 'me' || h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text || h.message }],
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  try {
    const reply = await callGemini(contents, systemInstruction, false);
    return reply.trim();
  } catch (err) {
    console.error('[Gemini Chat Error]:', err);
    return `پاسخ دستیار نقش‌یار به «${message}»:
در کنکور هنر تسلط بر سیر تاریخی و مبانی تجسمی کلید موفقیت است. مرور خلاصه مباحث کتاب و بررسی تست‌های سراسری ۵ سال اخیر به تثبیت این مبحث کمک می‌کند.`;
  }
}

/**
 * Generate 4-choice Iranian Art Entrance Exam questions
 */
export async function generateGeminiQuestions(topicIds = ['iran_art'], count = 3, difficulty = 'medium', topicNamesMap = {}) {
  const topicNames = topicIds.map((id) => topicNamesMap[id] || id).join('، ');

  const prompt = `به عنوان طراح ارشد و باسابقه سؤالات کنکور سراسری هنر سازمان سنجش در ایران، تعداد ${count} سؤال چهارگزینه‌ای تخصصی، دقیق، مفهومی و کاملاً در سطح کنکور هنر برای مباحث زیر طراحی کن:
مباحث درخواستی: ${topicNames}
سطح دشواری: ${difficulty === 'hard' ? 'سخت و چالشی' : difficulty === 'easy' ? 'ساده' : 'متوسط کنکوری'}

قوانین بسیار مهم:
۱. سؤالات باید بر اساس کتب درسی رسمی رشته هنر (مانند تاریخ هنر ایران، آشنایی با مکاتب نقاشی، مبانی هنرهای تجسمی، خواص مواد، هنر و معماری اسلامی و...) باشد.
۲. گزینه‌ها باید ۴ گزینه واقع‌گرایانه و علمی باشند.
۳. ایندکس گزینه صحیح (answer) یک عدد بین ۰ تا ۳ باشد (۰ = اولین گزینه).
۴. پاسخ تشریحی جامع (explanation) شامل ذکر دلیل علمی و رد گزینه‌های دیگر ارائه شود.

خروجی دقیقاً یک آرایه JSON معتبر با ساختار زیر باشد:
[
  {
    "topicId": "${topicIds[0]}",
    "text": "صورت سؤال تخصصی و استاندارد کنکور هنر؟",
    "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    "answer": 0,
    "explanation": "پاسخنامه تشریحی و نکته کلیدی کنکوری",
    "difficulty": "${difficulty}"
  }
]`;

  try {
    const raw = await callGemini(
      [{ parts: [{ text: prompt }] }],
      'تو طراح رسمی سؤالات کنکور سراسری هنر هستی و خروجی را فقط در قالب JSON خالص ارائه می‌دهی.',
      true
    );

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q, idx) => ({
        id: `ai_${Date.now()}_${idx}`,
        topicId: q.topicId || topicIds[idx % topicIds.length],
        text: q.text,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴'],
        answer: typeof q.answer === 'number' && q.answer >= 0 && q.answer < 4 ? q.answer : 0,
        explanation: q.explanation || 'پاسخ تحلیلی هوش مصنوعی کنکور هنر.',
        difficulty: q.difficulty || difficulty,
        source: 'ai',
        needsEdit: false,
      }));
    }
  } catch (err) {
    console.error('[Gemini Questions Error]:', err);
  }

  // Fallback questions if offline
  return topicIds.slice(0, count).map((tId, idx) => {
    const name = topicNamesMap[tId] || tId;
    return {
      id: `ai_fallback_${Date.now()}_${idx}`,
      topicId: tId,
      text: `کدام یک از شاخصه‌های زیر در خصوص مبحث «${name}» در کنکور هنر از اهمیت بیشتری برخوردار است؟`,
      options: [
        `تحلیل تطبیقی ویژگی‌های سبکی و تاریخی در دوره مربوطه`,
        `تمرکز صرف بر حفظ اسامی بدون در نظر گرفتن ساختار اثر`,
        `حذف عوامل اجتماعی و فرهنگی در شکل‌گیری سبک`,
        `یکسان انگاشتن تمام جریان‌های هنری آن عصر`,
      ],
      answer: 0,
      explanation: `در کنکور هنر بررسی تطبیقی و شناخت سیر تحول فرمی و مفهومی آثار کلید پاسخ به سؤالات مبحث ${name} است.`,
      difficulty: 'medium',
      source: 'ai',
      needsEdit: false,
    };
  });
}
