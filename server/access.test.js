import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_TTL_MS,
  canAccessStudentRecord,
  canChatPair,
  demoAuthEnabled,
  questionPublic,
  tokenFresh,
  userPublic,
  weekBounds,
} from './access.js';

test('a student can only open their own record', () => {
  const me = { id: 's1', role: 'student' };
  assert.equal(canAccessStudentRecord(me, { id: 's1', role: 'student', counselor_id: 'c1' }), true);
  assert.equal(canAccessStudentRecord(me, { id: 's2', role: 'student', counselor_id: 'c1' }), false);
  assert.equal(canAccessStudentRecord(me, { id: 'c1', role: 'counselor' }), false);
});

test('a counselor can only open their own students', () => {
  const counselor = { id: 'c1', role: 'counselor' };
  assert.equal(canAccessStudentRecord(counselor, { id: 's1', role: 'student', counselor_id: 'c1' }), true);
  assert.equal(canAccessStudentRecord(counselor, { id: 's6', role: 'student', counselor_id: 'c2' }), false);
});

test('chat is only between a student and their counselor', () => {
  const student = { id: 's1', role: 'student', counselor_id: 'c1' };
  const own = { id: 'c1', role: 'counselor' };
  const other = { id: 'c2', role: 'counselor' };
  assert.equal(canChatPair(student, own), true);
  assert.equal(canChatPair(student, other), false);
  assert.equal(canChatPair(own, { id: 's1', role: 'student', counselor_id: 'c1' }), true);
  assert.equal(canChatPair(own, { id: 's6', role: 'student', counselor_id: 'c2' }), false);
  assert.equal(canChatPair(student, { id: 's2', role: 'student', counselor_id: 'c1' }), false);
});

test('exam questions can be returned without the answer key', () => {
  const hidden = questionPublic({
    id: 'q1',
    topic_id: 'iran_art',
    text: 'سوال',
    options: '["الف","ب","ج","د"]',
    answer: 0,
    explanation: 'چون الف',
    difficulty: 'easy',
    source: 'counselor',
  }, true);
  assert.equal(hidden.topicId, 'iran_art');
  assert.deepEqual(hidden.options, ['الف', 'ب', 'ج', 'د']);
  assert.equal(Object.hasOwn(hidden, 'answer'), false);
  assert.equal(Object.hasOwn(hidden, 'explanation'), false);
});

test('user rows are exposed as camelCase', () => {
  const user = userPublic({
    id: 's1', role: 'student', name: 'سارا', phone: '09120000000', field: 'گرافیک',
    color: '#fff', counselor_id: 'c1', plan: null, status: 'active', renew_at: null, speciality: null,
  });
  assert.equal(user.counselorId, 'c1');
  assert.equal(Object.hasOwn(user, 'counselor_id'), false);
});

test('tokens expire after 30 days', () => {
  assert.equal(tokenFresh(new Date().toISOString()), true);
  assert.equal(tokenFresh(new Date(Date.now() - TOKEN_TTL_MS - 1000).toISOString()), false);
  assert.equal(tokenFresh('not-a-date'), false);
});

test('the study week starts on Saturday', () => {
  const { start, end } = weekBounds(new Date(2026, 9, 23));
  assert.equal(start, '2026-10-17');
  assert.equal(end, '2026-10-23');
});

test('demo login stays off unless ALLOW_DEMO_AUTH=1', () => {
  const prev = process.env.ALLOW_DEMO_AUTH;
  delete process.env.ALLOW_DEMO_AUTH;
  assert.equal(demoAuthEnabled(), false);
  process.env.ALLOW_DEMO_AUTH = '1';
  assert.equal(demoAuthEnabled(), true);
  if (prev === undefined) delete process.env.ALLOW_DEMO_AUTH;
  else process.env.ALLOW_DEMO_AUTH = prev;
});
