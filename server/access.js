// Shared auth and response shaping. Kept free of the live database so tests can import it.

export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function demoAuthEnabled() {
  return process.env.ALLOW_DEMO_AUTH === '1';
}

export function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Iranian week: Saturday through Friday. */
export function weekBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 1) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: isoDate(start), end: isoDate(end) };
}

export function tokenFresh(createdAt, now = Date.now()) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return now - created <= TOKEN_TTL_MS;
}

export function safeJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function userPublic(u) {
  if (!u) return null;
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    phone: u.phone,
    field: u.field ?? null,
    color: u.color ?? null,
    counselorId: u.counselor_id ?? u.counselorId ?? null,
    plan: u.plan ?? null,
    status: u.status ?? 'active',
    renewAt: u.renew_at ?? u.renewAt ?? null,
    speciality: u.speciality ?? null,
  };
}

export function taskPublic(t) {
  return {
    id: t.id,
    studentId: t.student_id,
    date: t.date,
    subjectId: t.subject_id,
    topicId: t.topic_id,
    type: t.type,
    minutes: t.minutes,
    title: t.title,
    note: t.note || '',
    done: Boolean(t.done),
  };
}

export function questionPublic(q, hideAnswer = false) {
  const out = {
    id: q.id,
    topicId: q.topic_id ?? q.topicId,
    text: q.text,
    options: safeJson(q.options, []),
    difficulty: q.difficulty || 'medium',
    source: q.source || 'counselor',
  };
  if (!hideAnswer) {
    out.answer = q.answer;
    out.explanation = q.explanation || '';
  }
  return out;
}

export function resultPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    answers: safeJson(row.answers, {}),
    finishedAt: row.finished_at,
    spentSec: row.spent_sec,
    correct: row.correct,
    wrong: row.wrong,
    blank: row.blank,
    percent: row.percent,
    byTopic: safeJson(row.by_topic, []),
  };
}

export function canAccessStudentRecord(user, student) {
  if (!user || !student || student.role !== 'student') return false;
  if (user.role === 'admin') return true;
  if (user.role === 'student') return user.id === student.id;
  if (user.role === 'counselor') return student.counselor_id === user.id;
  return false;
}

export function canChatPair(user, other) {
  if (!user || !other || user.id === other.id) return false;
  if (user.role === 'student' && other.role === 'counselor') return user.counselor_id === other.id;
  if (user.role === 'counselor' && other.role === 'student') return other.counselor_id === user.id;
  return false;
}

export function topicLookup(subjects) {
  const names = {};
  const subjectOf = {};
  for (const s of subjects) {
    for (const t of s.topics || []) {
      names[t.id] = t.name;
      subjectOf[t.id] = s.id;
    }
  }
  return { names, subjectOf };
}
