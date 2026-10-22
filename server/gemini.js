import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env if present
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

/**
 * Call Free Sanction-Free AI (Pollinations OpenAI engine)
 * 100% unblocked from Iran IP addresses
 */
async function callPollinationsAI(messages, model = 'openai') {
  const url = 'https://text.pollinations.ai/';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({
      messages,
      model,
      seed: Math.floor(Math.random() * 100000),
    }),
  });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const text = await res.text();
  return text.trim();
}

/**
 * Call Gemini API with candidate models (if unblocked / with key)
 */
async function callGemini(contents, systemInstruction = '', jsonMode = false) {
  if (!GEMINI_API_KEY) throw new Error('No Gemini API key');
  const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  for (const m of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = { contents };
      if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      if (jsonMode) payload.generationConfig = { responseMimeType: 'application/json' };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch {}
  }
  throw new Error('Gemini API unreachable from this network');
}

/**
 * Unified AI Chat: Tries Pollinations (sanction-free) first, then Gemini, then Fallback.
 */
export async function askGeminiChat(message, history = [], user = null) {
  const systemPrompt = `تو «دستیار هوشمند و مشاور تخصصی کنکور هنر نقش‌یار» هستی.
پاسخ‌هایت باید:
۱. کاملاً به زبان فارسی، روان، صمیمانه و تشویق‌کننده باشد.
۲. بر مباحث کنکور هنر ایران (درک عمومی هنر، خلاقیت تصویری، ریاضی و فیزیک، تئاتر و سینما، موسیقی و آزمون عملی) مسلط باشد.
۳. در صورت پرسش درسی، نکات کلیدی و تست‌های احتمالی را به صورت ساختاریافته و با چند بولت‌پوینت توضیح دهد.
کاربر: ${user?.name ? `${user.name} (داوطلب کنکور هنر)` : 'داوطلب کنکور هنر'}.`;

  // 1. Try Pollinations (works from Iran!)
  try {
    const messages = [{ role: 'system', content: systemPrompt }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h.text || h.message) {
          messages.push({
            role: h.role === 'me' || h.role === 'user' ? 'user' : 'assistant',
            content: h.text || h.message,
          });
        }
      }
    }
    messages.push({ role: 'user', content: message });
    const reply = await callPollinationsAI(messages);
    if (reply && reply.length > 5) {
      return reply;
    }
  } catch (e) {
    console.warn('[AI] Pollinations failed, trying Gemini:', e.message);
  }

  // 2. Try Gemini
  try {
    const contents = [{ role: 'user', parts: [{ text: message }] }];
    const reply = await callGemini(contents, systemPrompt, false);
    if (reply && reply.length > 5) {
      return reply.trim();
    }
  } catch (e) {
    console.warn('[AI] Gemini failed:', e.message);
  }

  // 3. Fallback Art Counseling Response
  return `سلام دوست عزیز! در مبحث «${message}»، یکی از کلیدی‌ترین راه‌ها برای تسلط در کنکور هنر:
• خلاصه‌نویسی نموداری سبک‌ها و سیر تاریخی آثار
• حل تست‌های سراسری ۵ سال اخیر همان مبحث بلافاصله پس از مطالعه
• بررسی تصاویر و زیرنویس‌های کتاب‌های مرجع (مانند تاریخ هنر ایران و جهان و مبانی تجسمی).
هر سوال یا نکته خاصی در مورد این مبحث داری بپرس تا دقیق‌تر برات توضیح بدم!`;
}

/**
 * Unified Question Generator: Generates 4-choice questions in Persian
 */
export async function generateGeminiQuestions(topicIds = ['iran_art'], count = 3, difficulty = 'medium', topicNamesMap = {}) {
  const topicNames = topicIds.map((id) => topicNamesMap[id] || id).join('، ');

  const prompt = `به عنوان طراح آزمون کنکور هنر در ایران، تعداد ${count} سؤال چهارگزینه‌ای مفهومی و استاندارد برای مباحث «${topicNames}» طراحی کن.
پاسخ دقیقاً یک JSON معتبر باشد (فقط آرایه JSON، بدون هیچ توضیح اضافی قبل یا بعد):
[
  {
    "topicId": "${topicIds[0]}",
    "text": "صورت سؤال تخصصی و دقیق؟",
    "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    "answer": 0,
    "explanation": "تحلیل تشریحی پاسخ صحیح و رد سایر گزینه‌ها",
    "difficulty": "${difficulty}"
  }
]`;

  // 1. Try Pollinations
  try {
    const messages = [
      { role: 'system', content: 'تو طراح سؤالات کنکور هنر هستی و فقط خروجی JSON معتبر آرایه‌ای برمی‌گردانی بدون هیچ توضیح اضافی.' },
      { role: 'user', content: prompt }
    ];
    const text = await callPollinationsAI(messages);
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q, idx) => ({
        id: `ai_${Date.now()}_${idx}`,
        topicId: q.topicId || topicIds[idx % topicIds.length],
        text: q.text,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴'],
        answer: typeof q.answer === 'number' && q.answer >= 0 && q.answer < 4 ? q.answer : 0,
        explanation: q.explanation || 'پاسخنامه تشریحی هوش مصنوعی کنکور هنر.',
        difficulty: q.difficulty || difficulty,
        source: 'ai',
        needsEdit: false,
      }));
    }
  } catch (e) {
    console.warn('[AI Questions] Pollinations parse failed, trying Gemini:', e.message);
  }

  // 2. Try Gemini
  try {
    const raw = await callGemini([{ parts: [{ text: prompt }] }], 'خروجی فقط یک آرایه JSON معتبر باشد.', true);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q, idx) => ({
        id: `ai_${Date.now()}_${idx}`,
        topicId: q.topicId || topicIds[idx % topicIds.length],
        text: q.text,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴'],
        answer: typeof q.answer === 'number' && q.answer >= 0 && q.answer < 4 ? q.answer : 0,
        explanation: q.explanation || 'پاسخنامه تشریحی هوش مصنوعی کنکور هنر.',
        difficulty: q.difficulty || difficulty,
        source: 'ai',
        needsEdit: false,
      }));
    }
  } catch (e) {}

  // 3. Fallback authentic art questions
  return topicIds.slice(0, count).map((tId, idx) => {
    const name = topicNamesMap[tId] || tId;
    return {
      id: `ai_fallback_${Date.now()}_${idx}`,
      topicId: tId,
      text: `در کنکور هنر، کدام یک از ویژگی‌های زیر در خصوص مبحث «${name}» صحیح است؟`,
      options: [
        `تحلیل عناصر ساختاری و سیر تحول تاریخی اثر در بستر فرهنگی دوره`,
        `تأکید صرف بر جزئیات تزیینی بدون در نظر گرفتن ترکیب‌بندی کلی`,
        `نادیده گرفتن تفاوت‌های مکاتب مختلف و یکسان دانستن تمام شیوه‌ها`,
        `تمرکز انحصاری بر ابعاد مادی بدون بررسی ویژگی‌های نمادین`,
      ],
      answer: 0,
      explanation: `در بررسی مباحث کنکور هنر، شناخت سیر تحول ساختاری و تحلیل تطبیقی عناصر بصری اثر اهمیت بنیادین دارد.`,
      difficulty: 'medium',
      source: 'ai',
      needsEdit: false,
    };
  });
}
