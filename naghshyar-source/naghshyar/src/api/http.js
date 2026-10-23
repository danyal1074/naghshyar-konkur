// ─────────────────────────────────────────────────────────────────────────────
//  REAL BACKEND CLIENT
//  Active when USE_MOCK=false in src/config.js.
//  Every function here has the same name and return shape as the one in mock.js.
//  Full contract (request / response examples): see API.md at the project root.
//
//  Auth: the token returned by POST /auth/verify is kept in localStorage and sent as
//  "Authorization: Bearer <token>". Errors must be JSON: { "message": "پیام فارسی برای کاربر" }.
// ─────────────────────────────────────────────────────────────────────────────
import { API_BASE } from '../config';

const TOKEN_KEY = 'naghshyar_token';

async function req(method, path, body) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && path !== '/me') {
    localStorage.removeItem(TOKEN_KEY);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'مشکلی پیش آمد. دوباره تلاش کن.');
  return data;
}
const qs = (o = {}) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = p.toString();
  return s ? `?${s}` : '';
};

// ── Auth ──
export const login = async (identifier, password) => {
  const r = await req('POST', '/auth/login', { identifier, password });
  if (r.token) localStorage.setItem(TOKEN_KEY, r.token);
  return r;
};
export const register = async (data) => {
  const r = await req('POST', '/auth/register', data);
  if (r.token) localStorage.setItem(TOKEN_KEY, r.token);
  return r;
};
export const sendOtp = (phone) => req('POST', '/auth/otp', { phone });
export const verifyOtp = async (phone, code, profile = {}) => {
  const r = await req('POST', '/auth/verify', { phone, code, ...profile });
  if (r.token) localStorage.setItem(TOKEN_KEY, r.token);
  return r;
};
export const me = async () => {
  if (!localStorage.getItem(TOKEN_KEY)) return null;
  try { return await req('GET', '/me'); } catch { localStorage.removeItem(TOKEN_KEY); return null; }
};
export const logout = async () => {
  try { await req('POST', '/auth/logout'); } catch { /* token may already be gone */ }
  localStorage.removeItem(TOKEN_KEY);
  return { ok: true };
};
export const demoLogin = async (role) => {
  const r = await req('POST', '/auth/demo-login', { role });
  localStorage.setItem(TOKEN_KEY, r.token);
  return r;
};
export const resetDemo = () => Promise.resolve({ ok: true });

// ── Syllabus / lookups ──
export const getSyllabus = () => req('GET', '/syllabus');
export const listTemplates = () => req('GET', '/plan-templates');
export const listPlans = () => req('GET', '/plans');
export const listFields = () => req('GET', '/fields');

// ── Students (counselor) ──
export const listStudents = () => req('GET', '/students');
export const getStudent = (id) => req('GET', `/students/${id}`);
export const inviteStudent = (data) => req('POST', '/students', data);

// ── Plan / tasks ──
export const listTasks = (studentId, from, to) => req('GET', `/students/${studentId || 'me'}/tasks${qs({ from, to })}`);
export const createTask = (studentId, task) => req('POST', `/students/${studentId}/tasks`, task);
export const updateTask = (taskId, patch) => req('PATCH', `/tasks/${taskId}`, patch);
export const deleteTask = (taskId) => req('DELETE', `/tasks/${taskId}`);
export const toggleTask = (taskId, done) => req('POST', `/tasks/${taskId}/done`, { done });
export const applyTemplate = (studentId, templateId, weekStart) => req('POST', `/students/${studentId}/plan/template`, { templateId, weekStart });
export const copyWeek = (studentId, fromWeekStart, toWeekStart) => req('POST', `/students/${studentId}/plan/copy-week`, { fromWeekStart, toWeekStart });
export const clearWeek = (studentId, weekStart) => req('DELETE', `/students/${studentId}/plan/week${qs({ weekStart })}`);
export const publishPlan = (studentId, weekStart) => req('POST', `/students/${studentId}/plan/publish`, { weekStart });

// ── Question bank ──
export const listQuestions = (filters) => req('GET', `/questions${qs(filters)}`);
export const saveQuestion = (q) => (q.id && !String(q.id).startsWith('draft') ? req('PUT', `/questions/${q.id}`, q) : req('POST', '/questions', q));
export const deleteQuestion = (id) => req('DELETE', `/questions/${id}`);
export const aiGenerateQuestions = (data) => req('POST', '/ai/questions', data);

// ── Exams ──
export const listExams = (studentId) => req('GET', `/exams${qs({ studentId })}`);
export const createExam = (data) => req('POST', '/exams', data);
export const createSelfExam = (data) => req('POST', '/exams/self', data);
export const getExam = (id) => req('GET', `/exams/${id}`);
export const submitExam = (examId, answers, spentSec) => req('POST', `/exams/${examId}/submit`, { answers, spentSec });
export const getResult = (examId, studentId) => req('GET', `/exams/${examId}/result${qs({ studentId })}`);
export const listExamResults = (examId) => req('GET', `/exams/${examId}/results`);

// ── Progress / study ──
export const getProgress = (studentId) => req('GET', `/students/${studentId || 'me'}/progress`);
export const listSessions = (limit) => req('GET', `/study-sessions${qs({ limit })}`);
export const logStudy = (data) => req('POST', '/study-sessions', data);

// ── Practice (drawing / painting) ──
export const listPractice = (studentId) => req('GET', `/practice${qs({ studentId })}`);
export const submitPractice = (data) => req('POST', '/practice', data); // image: data URL or upload via your storage
export const reviewPractice = (id, data) => req('POST', `/practice/${id}/review`, data);

// ── Assistant / notifications ──
export const askAssistant = (message, history) => req('POST', '/ai/chat', { message, history });
export const listNotifications = () => req('GET', '/notifications');
export const markNotificationsRead = () => req('POST', '/notifications/read');

// ── Online Chat ──
export const listChatThreads = () => req('GET', '/chat/threads');
export const getChatMessages = (withUserId) => req('GET', `/chat/messages${qs({ withUserId })}`);
export const sendChatMessage = (toUserId, text) => req('POST', '/chat/messages', { toUserId, text });

// ── Admin ──
export const listCounselors = () => req('GET', '/admin/counselors');
export const updateCounselor = (id, patch) => req('PATCH', `/admin/counselors/${id}`, patch);
export const createCounselor = (data) => req('POST', '/admin/counselors', data);
export const getAdminStats = () => req('GET', '/admin/stats');
export const getPublicStats = () => req('GET', '/public/stats');
export const getSmsSettings = () => req('GET', '/admin/settings/sms');
export const saveSmsSettings = (data) => req('POST', '/admin/settings/sms', data);
