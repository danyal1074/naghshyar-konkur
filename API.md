# قرارداد API — نقش‌یار

این فایل همه‌ی endpointهایی را که فرانت‌اند صدا می‌زند توضیح می‌دهد. کد کلاینت: `src/api/http.js`. پیاده‌سازی نمایشی هر تابع: `src/api/mock.js` (از آن به‌عنوان نمونه‌ی دقیق شکل داده‌ها استفاده کن).

## قواعد کلی

- پایه‌ی آدرس: `/api` (در `src/config.js` با `API_BASE`). در حالت dev، Vite درخواست‌های `/api` را به `http://localhost:8000` می‌فرستد (`vite.config.js`).
- بدنه و پاسخ: JSON، UTF-8.
- احراز هویت: `Authorization: Bearer <token>` در همه‌ی endpointها به‌جز `/auth/*`.
- خطا: وضعیت 4xx/5xx با بدنه‌ی `{ "message": "پیام فارسی برای نمایش به کاربر" }`.
- تاریخ‌ها: رشته‌ی میلادی `YYYY-MM-DD` (فرانت خودش شمسی نشان می‌دهد). هفته از **شنبه** شروع می‌شود و `weekStart` همیشه تاریخ شنبه است.
- شناسه‌ها: رشته.
- نقش‌ها: `student` | `counselor` | `admin`. هر مشاور فقط به دانش‌آموزان و آزمون‌های خودش دسترسی دارد؛ دانش‌آموز فقط به داده‌ی خودش.

## برای فعال‌سازی بک‌اند

1. در `src/config.js`: `USE_MOCK = false`
2. بک‌اند را روی `localhost:8000` (یا `target` را در `vite.config.js` عوض کن) اجرا کن.
3. در پروداکشن، `/api` را با reverse proxy به بک‌اند وصل کن (یا `API_BASE` را آدرس کامل بگذار و CORS را باز کن).

---

## احراز هویت (OTP)

| متد | مسیر | بدنه | پاسخ |
|---|---|---|---|
| POST | `/auth/otp` | `{ phone }` | `{ ok: true }` — خطا اگر شماره ثبت نشده: «این شماره ثبت نشده است…» |
| POST | `/auth/verify` | `{ phone, code }` | `{ token, user }` |
| GET | `/me` | — | `User` (یا 401) |

`User`: `{ id, role, name, phone, field?, color?, counselorId?, plan?, status?, renewAt?, speciality? }`
- فقط شماره‌هایی که مشاور/مدیر ثبت کرده‌اند می‌توانند وارد شوند (ثبت‌نام آزاد نداریم).
- مشاور با `status: "suspended"` نباید وارد شود (و دانش‌آموزانش هم، اگر بخواهی).

## داده‌های پایه

| GET | پاسخ |
|---|---|
| `/syllabus` | `Subject[]`: `{ id, name, weight, color, topics: [{ id, name }] }` |
| `/plan-templates` | `[{ id, name, desc, taskCount, minutes }]` |
| `/plans` | `[{ id, name, price, studentLimit, perks: string[] }]` |
| `/fields` | `string[]` (رشته‌های هدف) |

## دانش‌آموزان (مشاور)

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/students` | `{ items: StudentRow[], limit, planId }` |
| GET | `/students/:id` | `StudentRow` |
| POST | `/students` | `{ name, phone, field }` ← `User`. اگر ظرفیت پلن پر است، 4xx با پیام فارسی |

`StudentRow` = `User` + `{ weekDone, weekTotal, pastRate, lastActive, avgScore, status, pendingExams }`
- `status`: `good` | `warn` | `late` | `noplan` — نسبت کارهای گذشته‌ی این هفته که انجام شده: ≥۷۰٪ good، ≥۴۰٪ warn، کمتر late؛ بدون کار noplan.

## برنامه و کارها

`Task`: `{ id, studentId, date, subjectId, topicId, type, minutes, title, note, done }` — `type`: `study | test | review | practice`

| متد | مسیر | بدنه / توضیح |
|---|---|---|
| GET | `/students/:id/tasks?from=&to=` | `:id` می‌تواند `me` باشد. `Task[]` |
| POST | `/students/:id/tasks` | `{ date, subjectId, topicId, type, minutes, note }` ← `Task` |
| PATCH | `/tasks/:id` | هر زیرمجموعه از فیلدها |
| DELETE | `/tasks/:id` | |
| POST | `/tasks/:id/done` | `{ done: boolean }` — با `done=true` (و type غیر از test) یک `StudySession` خودکار بساز؛ با false همان را حذف کن |
| POST | `/students/:id/plan/template` | `{ templateId, weekStart }` ← `{ added }` |
| POST | `/students/:id/plan/copy-week` | `{ fromWeekStart, toWeekStart }` (done=false) ← `{ added }` |
| DELETE | `/students/:id/plan/week?weekStart=` | ← `{ removed }` |
| POST | `/students/:id/plan/publish` | اعلان به دانش‌آموز |

## بانک سؤال

`Question`: `{ id, topicId, text, options: [4 strings], answer: 0..3, explanation, difficulty: easy|medium|hard, source: counselor|ai }`

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/questions?subjectId=&topicId=&difficulty=&q=` | فقط سؤال‌های همین مشاور |
| POST | `/questions` | ایجاد |
| PUT | `/questions/:id` | ویرایش |
| DELETE | `/questions/:id` | |
| POST | `/ai/questions` | `{ topicIds, count, difficulty }` ← `Question[]` (پیش‌نویس، **بدون ذخیره**؛ id موقت `draft_…`). مشاور مرور می‌کند و هنگام ساخت آزمون در `newQuestions` می‌آید |

## آزمون

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/exams?studentId=` | مشاور: آزمون‌های ساخته‌شده `{ id, title, topicIds, questionCount, durationMin, deadline, createdAt, sent, submitted, avg, studentScore?, studentDone? }`. دانش‌آموز: آزمون‌های خودش `{ …, status: new|done, overdue, score, finishedAt }` |
| POST | `/exams` | `{ title, topicIds, questionIds, newQuestions: Question[], studentIds, durationMin, deadline|null }` — `newQuestions` را ذخیره کن و شناسه‌شان را به آزمون اضافه کن. به هر دانش‌آموز اعلان بده |
| GET | `/exams/:id` | `{ …exam, questions, alreadyDone }`. **برای دانش‌آموزی که هنوز نداده، `answer` و `explanation` را حذف کن** |
| POST | `/exams/:id/submit` | `{ answers: { [questionId]: 0..3 }, spentSec }` ← نتیجه‌ی نمره‌دهی‌شده. فقط یک‌بار؛ بار دوم 4xx |
| GET | `/exams/:id/result?studentId=` | `{ exam: {…, questions}, student, result }` |
| GET | `/exams/:id/results` | مشاور: `{ exam, rows: [{ student, result|null }], questionStats: [{ questionId, text, topicId, answered, correctRate }] }` |

نمره‌دهی (سمت سرور هم همین را پیاده کن): `raw = درست − غلط/3` ، `percent = max(0, round(raw / تعداد سؤال × 100))`، بی‌پاسخ نمره‌ی منفی ندارد.
`result`: `{ id, examId, studentId, answers, finishedAt, spentSec, correct, wrong, blank, percent, byTopic: [{ topicId, correct, wrong, total }] }`

## پیشرفت و مطالعه

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/students/:id/progress` | `{ studyByDay:[{date,minutes}] (۱۴ روز), bySubject:[{subjectId,minutes}] (۷ روز), streak, weekMinutes, weekDone, weekTotal, examTrend:[{examId,title,date,score}], topics:[{topicId,name,subjectId,total,accuracy}] (به ترتیب ضعیف‌ترین), avgScore }` |
| GET | `/study-sessions?limit=` | جلسه‌های خود دانش‌آموز |
| POST | `/study-sessions` | `{ subjectId, minutes, taskId? }` — اگر `taskId` بود، کار را done کن |

## بخش عملی (طراحی و نقاشی)

`PracticeWork`: `{ id, studentId, title, topicId, note, image, createdAt, status: pending|reviewed, feedback, score|null, student? }`

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/practice?studentId=` | دانش‌آموز: مال خودش؛ مشاور: دانش‌آموزان خودش |
| POST | `/practice` | `{ title, topicId, note, image }` — فرانت الان `image` را **data URL (JPEG کوچک‌شده)** می‌فرستد. در پروداکشن بهتر است آپلود فایل (multipart یا لینک امضاشده) باشد؛ در آن صورت `submitPractice` را در `http.js` تغییر بده |
| POST | `/practice/:id/review` | `{ feedback, score }` ← `PracticeWork` + اعلان به دانش‌آموز |

## دستیار و اعلان‌ها

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/ai/chat` | `{ message, history }` ← `{ reply }` — پرامپت سیستمی پیشنهادی: «دستیار درسی کنکور هنر؛ فقط روی سرفصل‌ها پاسخ بده؛ کوتاه و ساده» |
| GET | `/notifications` | `[{ id, text, date, read, link }]` (۲۰ تای آخر کاربر فعلی) |
| POST | `/notifications/read` | همه را خوانده کن |

اعلان‌هایی که باید بک‌اند بسازد: آزمون جدید برای دانش‌آموز، تغییر برنامه، تمام‌شدن آزمون توسط دانش‌آموز (برای مشاور)، کار عملی جدید (برای مشاور)، بازبینی کار عملی (برای دانش‌آموز).

## مدیر

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/admin/counselors` | `User + { studentCount, examCount }` |
| POST | `/admin/counselors` | `{ name, phone, plan }` |
| PATCH | `/admin/counselors/:id` | `{ status?, plan? }` |
| GET | `/admin/stats` | `{ counselors, activeCounselors, students, exams, monthlyRevenue, questions }` |

## نکته‌های پیاده‌سازی

- محدودیت ظرفیت پلن را سمت سرور هم اعمال کن (فرانت فقط پیام را نشان می‌دهد).
- سرفصل‌ها (`/syllabus`) نمونه است؛ با سرفصل رسمی و ضرایب سال جاری جایگزین کن. فرانت هیچ‌چیز را هاردکد نمی‌کند و همه‌چیز را از همین endpoint می‌خواند.
- برای Antigravity می‌توانی همین فایل را مستقیم به‌عنوان prompt بدهی: «بک‌اند را مطابق `API.md` بساز؛ پایگاه‌داده‌ی پیشنهادی: PostgreSQL».
