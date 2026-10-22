// ───────────────────────────────────────────────────────────────
//  Central settings. Change these first.
// ───────────────────────────────────────────────────────────────

// Product name (placeholder: change to your own brand)
export const APP_NAME = 'نقش‌یار';
export const APP_TAGLINE = 'برنامه، مطالعه و آزمون کنکور هنر؛ در یک سامانه';

// true  → the app runs fully on built-in demo data (saved in the browser). Good for presentations.
// false → the app calls your real backend through src/api/http.js (see API.md).
export const USE_MOCK = false;
export const API_BASE = '/api';

// Approximate exam date used by the countdown (ISO, Gregorian). Update when the official date is announced.
export const KONKUR_DATE = '2027-06-24';

// Negative marking: every N wrong answers cancels 1 correct answer (konkur style).
export const NEGATIVE_MARK_EVERY = 3;

// OTP code accepted in demo mode
export const DEMO_OTP = '12345';
