import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import { Avatar, Badge, Button, Empty, ErrorBox, Icon, Loading } from '../ui';
import { useAsync } from '../lib/hooks';
import { faNum, fmtDateISO } from '../lib/dates';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${faNum(h)}:${faNum(m)}`;
}

/* ═══════════════ گفتگوی آنلاین ═══════════════ */
export function Chat() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedStudentId = params.get('student');
  const isCounselor = user?.role === 'counselor';

  // For counselor: list of student threads
  const threads = useAsync(() => (isCounselor ? api.listChatThreads() : Promise.resolve([])), [isCounselor]);

  // Determine who the current chat target is:
  // If student: target is user.counselorId
  // If counselor: target is selectedStudentId or first student in thread list
  const activeStudentId = isCounselor
    ? selectedStudentId || threads.data?.[0]?.student?.id
    : user?.counselorId;

  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadMessages = async (silent = false) => {
    if (!activeStudentId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const list = await api.getChatMessages(activeStudentId);
      setMessages(list || []);
      if (isCounselor) threads.reload();
    } catch (e) {
      console.warn('Error loading chat:', e);
    }
    if (!silent) setLoadingMsgs(false);
  };

  useEffect(() => {
    loadMessages();
  }, [activeStudentId]); // eslint-disable-line

  // Polling every 3.5 seconds for real-time feel
  useEffect(() => {
    if (!activeStudentId) return;
    const interval = setInterval(() => {
      loadMessages(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeStudentId]); // eslint-disable-line

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (msgText) => {
    const content = (msgText ?? text).trim();
    if (!content || sending || !activeStudentId) return;
    setText('');
    setSending(true);

    // Optimistic UI update
    const tempMsg = {
      id: `temp_${Date.now()}`,
      senderId: user.id,
      receiverId: activeStudentId,
      text: content,
      createdAt: new Date().toISOString(),
      read: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const saved = await api.sendChatMessage(activeStudentId, content);
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? saved : m)));
      if (isCounselor) threads.reload();
    } catch (e) {
      alert(e.message || 'خطا در ارسال پیام');
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const counselorQuick = [
    'برنامه‌ی جدیدت در سامانه ثبت شد، حتماً بررسی کن.',
    'کارت رو دیدم، بازخوردش رو ثبت کردم.',
    'آزمون این هفته رو قبل از مهلت تموم کن.',
    'خسته نباشی، روند این هفته‌ات خیلی خوب بوده.',
  ];

  const studentQuick = [
    'سلام استاد، برنامه‌ی این هفته من ثبت شد؟',
    'برای درس درک عمومی هنر چه کتاب تستی پیشنهاد می‌کنید؟',
    'کار عملی جدیدم رو فرستادم، ممنون میشم چک کنید.',
    'استاد در مورد سوالات آزمون این هفته راهنمایی می‌فرمایید؟',
  ];

  const quickPrompts = isCounselor ? counselorQuick : studentQuick;

  // Selected student entity for counselor
  const currentStudent = threads.data?.find((t) => t.student?.id === activeStudentId)?.student;

  return (
    <div className={`chat-layout ${isCounselor && selectedStudentId ? 'has-selected' : ''}`}>
      {/* Sidebar for Counselor */}
      {isCounselor && (
        <aside className="chat-sidebar">
          <div className="chat-sidebar-head">
            <h3>گفتگو با دانش‌آموزان</h3>
            <small className="muted">{faNum(threads.data?.length || 0)} دانش‌آموز</small>
          </div>
          <div className="chat-thread-list">
            {threads.loading && !threads.data ? (
              <Loading label="در حال بارگذاری گفتگوها…" />
            ) : !threads.data?.length ? (
              <p className="muted pad sm">دانش‌آموزی اضافه نشده است.</p>
            ) : (
              threads.data.map(({ student, lastMessage, unreadCount }) => {
                const isSelected = student.id === activeStudentId;
                return (
                  <button
                    key={student.id}
                    className={`chat-thread-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setParams({ student: student.id })}
                  >
                    <Avatar user={student} size={42} />
                    <div className="grow">
                      <div className="row between">
                        <b>{student.name}</b>
                        <small className="muted">{lastMessage ? fmtTime(lastMessage.createdAt) : ''}</small>
                      </div>
                      <p className="chat-thread-snippet muted sm">
                        {lastMessage ? lastMessage.text : student.field}
                      </p>
                    </div>
                    {unreadCount > 0 && <span className="chat-unread-badge">{faNum(unreadCount)}</span>}
                  </button>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main Chat Box */}
      <section className="chat-main">
        {/* Chat Header */}
        <header className="chat-head">
          <div className="row">
            {isCounselor && (
              <Button
                variant="ghost"
                size="sm"
                icon="prev"
                className="chat-back-btn"
                onClick={() => setParams({})}
                aria-label="بازگشت به لیست گفتگوها"
              />
            )}
            <Avatar user={isCounselor ? currentStudent || { name: 'دانش‌آموز' } : { name: 'مشاور', color: '#1f8a70' }} size={46} />
            <div>
              <h3>{isCounselor ? (currentStudent?.name || 'انتخاب دانش‌آموز') : 'مشاور کنکور هنر (استاد احمدی)'}</h3>
              <p className="muted sm">
                {isCounselor ? `${currentStudent?.field || ''} · آنلاین` : 'پاسخگویی آنلاین به سوالات درسی و برنامه‌ریزی'}
              </p>
            </div>
          </div>
          <Badge tone="good">آنلاین</Badge>
        </header>

        {/* Message Thread */}
        <div className="chat-feed">
          {loadingMsgs && !messages.length ? (
            <Loading label="در حال دریافت پیام‌ها…" />
          ) : !messages.length ? (
            <div className="empty">
              <Icon name="chat" size={32} />
              <p>هنوز پیامی رد و بدل نشده است.</p>
              <small className="muted">می‌توانید اولین پیام یا سوال را ارسال کنید.</small>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user.id;
              return (
                <div key={m.id} className={`chat-bubble-wrap ${isMe ? 'me' : 'them'}`}>
                  <div className="chat-bubble">
                    <p>{m.text}</p>
                    <div className="chat-bubble-meta">
                      <span>{fmtTime(m.createdAt)}</span>
                      {isMe && <Icon name="check" size={13} stroke={2.5} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Prompts */}
        <div className="chat-quick-row">
          {quickPrompts.map((q, idx) => (
            <button key={idx} type="button" className="chip-toggle" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <footer className="chat-footer">
          <textarea
            className="chat-textarea"
            rows={1}
            placeholder="پیام خود را بنویسید… (Enter برای ارسال)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button icon="send" disabled={!text.trim() || sending} loading={sending} onClick={() => send()}>
            ارسال
          </Button>
        </footer>
      </section>
    </div>
  );
}