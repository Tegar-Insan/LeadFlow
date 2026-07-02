/**
 * AIChatbot.jsx
 * Floating Gemini-powered AI assistant — yellow circle FAB + glassmorphism panel
 * Supports schedule recommendations with Approve / Reject actions.
 * LeadFlow — UC Chatbot (AI Assistant)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sendChatMessage,
  approveScheduleFromChat,
  rejectScheduleFromChat,
  getChatSessions,
  getChatSessionMessages,
} from '../../services/chatbotService';

// ── AI sparkle icon ─────────────────────────────────────────────
const AIIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C10.34 2 9 3.34 9 5c0 .34.06.67.17.97C7.34 6.57 6 8.14 6 10c0 .37.05.73.14 1.07A4.003 4.003 0 0 0 4 15c0 1.86 1.27 3.43 3 3.87V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.13A4.001 4.001 0 0 0 20 15a4 4 0 0 0-2.14-3.54c.09-.31.14-.62.14-.96 0-1.7-1.1-3.14-2.63-3.66.11-.3.17-.62.17-.97C15.54 3.34 13.94 2 12 2Z" fill="currentColor" opacity="0.15"/>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" fill="currentColor"/>
    <circle cx="19" cy="5"  r="1.2" fill="currentColor" opacity="0.7"/>
    <circle cx="5"  cy="5"  r="0.9" fill="currentColor" opacity="0.5"/>
    <circle cx="19" cy="19" r="0.9" fill="currentColor" opacity="0.5"/>
  </svg>
);

// ── Typing dots ─────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map(i => (
      <span key={i} className="w-2 h-2 rounded-full bg-brand/60"
        style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
    ))}
  </div>
);

// ── Schedule recommendation card ────────────────────────────────
const ScheduleCard = ({ schedule, onApprove, onReject, approved, rejected, approving }) => {
  const dateLabel = schedule.day_label || schedule.scheduled_at?.slice(0, 10) || '—';
  const timeLabel = schedule.time_wib  || '—';

  if (approved) {
    return (
      <div className="mt-2 px-3 py-2.5 rounded-xl bg-success/10 border border-success/20 text-xs font-body text-success">
        ✅ Jadwal dibuat — <strong>{dateLabel}</strong> pukul <strong>{timeLabel}</strong>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="mt-2 px-3 py-2 rounded-xl bg-gray-100 border border-gray-200 text-xs font-body text-text-muted">
        ❌ Rekomendasi ditolak
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-brand/25 bg-brand/[0.05]">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-brand/15">
        <svg className="w-3.5 h-3.5 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span className="text-[11px] font-headline font-bold text-brand uppercase tracking-wider">
          Rekomendasi Jadwal
        </span>
      </div>

      {/* Card body */}
      <div className="px-3 py-2.5 space-y-2">
        <p className="text-sm font-headline font-semibold text-text-primary leading-snug">
          {schedule.title}
        </p>

        <div className="flex items-center gap-1.5 text-xs font-body text-brand">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span className="font-semibold">{dateLabel}</span>
          <span className="text-text-muted">·</span>
          <span className="font-semibold">{timeLabel}</span>
        </div>

        {schedule.caption && (
          <p className="text-xs font-body text-text-secondary leading-relaxed line-clamp-2">
            {schedule.caption}
          </p>
        )}

        {schedule.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {schedule.hashtags.slice(0, 5).map(h => (
              <span key={h} className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand/80 font-body">{h}</span>
            ))}
          </div>
        )}

        {schedule.reasoning && (
          <p className="text-[10px] font-body text-text-muted italic">{schedule.reasoning}</p>
        )}
      </div>

      {/* Approve / Reject buttons */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={onApprove}
          disabled={approving}
          className="flex-1 h-8 rounded-lg bg-brand text-black text-xs font-headline font-bold
            hover:bg-brand-dark active:scale-95 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {approving ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : '✅'}
          {approving ? 'Membuat…' : 'Setujui'}
        </button>
        <button
          onClick={onReject}
          disabled={approving}
          className="flex-1 h-8 rounded-lg border border-gray-300 text-text-secondary text-xs font-headline font-semibold
            hover:border-gray-400 hover:text-text-primary active:scale-95 transition-all
            disabled:opacity-40"
        >
          ❌ Tolak
        </button>
      </div>
    </div>
  );
};

// ── Message bubble ──────────────────────────────────────────────
const MessageBubble = ({ msg, onApprove, onReject }) => {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
          <span className="text-brand"><AIIcon size={14} /></span>
        </div>
      )}
      <div className={`max-w-[82%] ${isUser ? '' : 'w-full'}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-brand text-black rounded-br-sm font-medium'
              : 'bg-gray-100 border border-gray-200 text-text-primary rounded-bl-sm'
          }`}
        >
          {msg.content}
        </div>

        {/* Schedule card — shown beneath AI bubble */}
        {!isUser && msg.type === 'schedule_recommendation' && msg.schedule && (
          <ScheduleCard
            schedule={msg.schedule}
            onApprove={() => onApprove(msg.schedule, msg.id)}
            onReject={() => onReject(msg.id)}
            approved={msg.approved}
            rejected={msg.rejected}
            approving={msg.approving}
          />
        )}
      </div>
    </div>
  );
};

// ── Quick suggestion prompts ────────────────────────────────────
const SUGGESTIONS = [
  'Rekomendasikan jadwal posting minggu ini',
  'Ide konten viral untuk Krench Chicken',
  'Hashtag terbaik untuk ayam goreng',
  'Jam berapa posting TikTok paling efektif?',
];

// ── Main component ──────────────────────────────────────────────
type AIChatbotProps = {
  openOnMount?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApproved?: () => void;
};

const WELCOME_MESSAGE = {
  id:      'welcome',
  role:    'assistant',
  content: 'Halo! 👋 Saya AI Assistant Krench Chicken — ditenagai Gemini + data TikTok terkini.\n\nTanya saya tentang jadwal posting, ide konten, hashtag, atau minta rekomendasi jadwal otomatis!',
  type:    'text',
};

const AIChatbot = ({ openOnMount = false, onOpenChange, onApproved }: AIChatbotProps = {}) => {
  const navigate = useNavigate();
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [sessionId, setSessionId] = useState(null);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const msgIdRef  = useRef(0);
  const nextId    = () => `msg_${++msgIdRef.current}`;

  const setOpenState = useCallback((nextOpen) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (openOnMount) {
      setOpenState(true);
    }
  }, [openOnMount, setOpenState]);

  // Resume the user's global chat thread (shared with /content/prompt and
  // /content/validate) so context survives navigation/refresh instead of
  // resetting to the welcome message every time the FAB mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessions = await getChatSessions();
        const latest = sessions?.[0];
        if (!latest || cancelled) return;
        const history = await getChatSessionMessages(latest.id);
        if (cancelled || history.length === 0) return;
        setSessionId(latest.id);
        setMessages(history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          type: m.message_type,
          schedule: Array.isArray(m.schedules) ? m.schedules[0] ?? null : null,
          approved: false,
          rejected: false,
          approving: false,
        })));
      } catch {
        // Resume is best-effort — fall back to the local welcome message.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg = { id: nextId(), role: 'user', content, type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      // Only the new turn is sent — the backend loads prior context from
      // chatbot_sessions/chatbot_messages (long-term memory), not the client.
      const data = await sendChatMessage(sessionId, content);
      if (!sessionId && data.session_id) setSessionId(data.session_id);

      const aiMsg = {
        id:       nextId(),
        role:     'assistant',
        content:  data.reply,
        type:     data.type || 'text',
        schedule: Array.isArray(data.schedules) ? data.schedules[0] ?? null : null,
        approved: false,
        rejected: false,
        approving: false,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal terhubung ke AI. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading]);

  // ── Approve handler ─────────────────────────────────────────
  const handleApprove = useCallback(async (schedule, msgId) => {
    // Mark message as approving
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, approving: true } : m)
    );

    try {
      await approveScheduleFromChat(schedule);

      // Mark approved + add success text bubble
      setMessages(prev => [
        ...prev.map(m => m.id === msgId ? { ...m, approving: false, approved: true } : m),
        {
          id:      nextId(),
          role:    'assistant',
          content: `✅ Jadwal berhasil dibuat!\n📅 ${schedule.day_label || ''} pukul ${schedule.time_wib || ''}\n\nKlik tombol di bawah untuk melihat di kalender.`,
          type:    'approved_confirm',
        },
      ]);

      // Tell the host page (CalendarPage/ListPage) to refetch its
      // useSchedule() data — otherwise the new schedule never appears in
      // ContentLibrarySidebar until a manual page reload, since this widget
      // has its own isolated state and no other link back to the page.
      onApproved?.();
    } catch (err) {
      setMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, approving: false } : m)
      );
      setError(err?.response?.data?.message || 'Gagal membuat jadwal. Coba lagi.');
    }
  }, [onApproved]);

  // ── Reject handler ──────────────────────────────────────────
  const handleReject = useCallback(async (msgId) => {
    // Mark rejected immediately (no loading state needed)
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, rejected: true } : m)
    );

    try {
      const data = await rejectScheduleFromChat();
      setMessages(prev => [
        ...prev,
        {
          id:      nextId(),
          role:    'assistant',
          content: data.reply,
          type:    'text',
        },
      ]);
    } catch {
      // Rejection acknowledgement is non-critical — just silently add fallback
      setMessages(prev => [
        ...prev,
        {
          id:      nextId(),
          role:    'assistant',
          content: 'Baik, jadwal tidak dibuat. Beritahu saya jika butuh rekomendasi lain! 👍',
          type:    'text',
        },
      ]);
    }
  }, []);

  const handleSubmit    = (e) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown   = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
  const handleSuggestion = (t) => sendMessage(t);
  const showSuggestions  = messages.length === 1 && !loading;

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chatPanelIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(246,183,10,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(246,183,10,0); }
        }
        .chat-panel-in { animation: chatPanelIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .fab-pulse:not(:hover) { animation: fabPulse 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── FAB ── */}
      <button
        onClick={() => setOpenState(!open)}
        aria-label="Open AI Assistant"
        className="fab-pulse fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand text-black
          flex items-center justify-center shadow-[0_8px_32px_rgba(246,183,10,0.45)]
          hover:bg-brand-dark hover:shadow-[0_0_28px_rgba(246,183,10,0.6)]
          active:scale-95 transition-all duration-200 select-none"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : <AIIcon size={26} />}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="chat-panel-in fixed bottom-24 right-6 z-40 w-[360px] max-h-[540px]
          flex flex-col rounded-2xl overflow-hidden
          bg-white
          border border-gray-200
          shadow-[0_24px_64px_rgba(0,0,0,0.14),0_0_0_1px_rgba(246,183,10,0.06)]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center">
              <span className="text-brand"><AIIcon size={16} /></span>
            </div>
            <div>
              <p className="text-sm font-headline font-bold text-text-primary leading-none">AI Assistant</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"/>
              <span className="text-[11px] font-body text-text-muted">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 scroll-smooth">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start mb-3">
                <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <span className="text-brand"><AIIcon size={14}/></span>
                </div>
                <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-bl-sm">
                  <TypingDots/>
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-body mb-3">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </div>
            )}

            {/* View Calendar shortcut — shown after an approval */}
            {messages.some(m => m.type === 'approved_confirm') && (
              <button
                onClick={() => { setOpenState(false); navigate('/calendar'); }}
                className="w-full mt-1 mb-3 h-8 rounded-xl border border-brand/30 text-brand text-xs font-headline font-semibold
                  hover:bg-brand/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Lihat di Kalender →
              </button>
            )}

            {/* Suggestion chips */}
            {showSuggestions && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-headline font-bold text-text-muted uppercase tracking-widest mb-2">Quick prompts</p>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleSuggestion(s)}
                    className="block w-full text-left px-3 py-2 rounded-xl text-xs font-body text-text-secondary
                      bg-gray-50 border border-gray-200
                      hover:border-brand/30 hover:bg-brand/[0.06] hover:text-text-primary
                      transition-all duration-150">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 flex-shrink-0"/>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-3 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya strategi TikTok atau minta jadwal…"
              rows={1}
              disabled={loading}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5
                text-sm font-body text-text-primary placeholder:text-text-muted
                outline-none resize-none min-h-[40px] max-h-[100px] overflow-y-auto
                focus:border-brand/40 focus:bg-white
                transition-all duration-150 disabled:opacity-50 leading-relaxed"
              style={{ height: 'auto' }}
              onInput={e => {
                const target = e.currentTarget;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-brand text-black flex items-center justify-center
                flex-shrink-0 transition-all duration-150
                hover:bg-brand-dark hover:shadow-[0_0_16px_rgba(246,183,10,0.4)]
                active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </form>

          {/* Footer */}
          <div className="px-4 pb-2.5 flex-shrink-0">
            <p className="text-[10px] font-body text-text-muted text-center">
              Powered by Anthropic
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
