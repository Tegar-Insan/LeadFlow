/**
 * AIChatbot.jsx
 * Floating AI assistant — yellow circle FAB + glassmorphism chat panel
 * Positioned fixed bottom-right, overlays the Calendar page
 * LeadFlow — UC Chatbot (AI Assistant)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage } from '../../services/chatbotService';

// ── AI sparkle / brain SVG icon ────────────────────────────────
const AIIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2C10.34 2 9 3.34 9 5c0 .34.06.67.17.97C7.34 6.57 6 8.14 6 10c0 .37.05.73.14 1.07A4.003 4.003 0 0 0 4 15c0 1.86 1.27 3.43 3 3.87V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.13A4.001 4.001 0 0 0 20 15a4 4 0 0 0-2.14-3.54c.09-.31.14-.62.14-.96 0-1.7-1.1-3.14-2.63-3.66.11-.3.17-.62.17-.97C15.54 3.34 13.94 2 12 2Z"
      fill="currentColor"
      opacity="0.15"
    />
    {/* Central star / sparkle */}
    <path
      d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"
      fill="currentColor"
    />
    {/* Small dots */}
    <circle cx="19" cy="5" r="1.2" fill="currentColor" opacity="0.7" />
    <circle cx="5"  cy="5" r="0.9" fill="currentColor" opacity="0.5" />
    <circle cx="19" cy="19" r="0.9" fill="currentColor" opacity="0.5" />
  </svg>
);

// ── Typing indicator ────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-brand/60"
        style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
      />
    ))}
  </div>
);

// ── Message bubble ──────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
          <span className="text-brand"><AIIcon size={14} /></span>
        </div>
      )}
      <div
        className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-brand text-black rounded-br-sm font-medium'
            : 'bg-white/[0.06] border border-white/[0.08] text-text-primary rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
};

// ── Suggested prompts ───────────────────────────────────────────
const SUGGESTIONS = [
  'Best posting times for TikTok?',
  'Write a caption for ayam goreng',
  'Content ideas for Ramadan promo',
  'What hashtags should I use?',
];

// ── Main component ──────────────────────────────────────────────
const AIChatbot = () => {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    {
      role:    'assistant',
      content: 'Halo! 👋 Saya AI Assistant Krench Chicken.\n\nTanya saya tentang strategi konten TikTok, jadwal posting, caption, hashtag, atau ide konten — dalam Bahasa Indonesia atau English!',
    },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const panelRef   = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg = { role: 'user', content };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      // Send only role+content pairs to backend
      const payload = nextMessages.map(({ role, content }) => ({ role, content }));
      const data = await sendChatMessage(payload);

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to connect to AI. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (text) => sendMessage(text);

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      {/* ── Typing animation keyframes ── */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chatPanelIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(246,183,10,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(246,183,10,0); }
        }
        .chat-panel-in { animation: chatPanelIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .fab-pulse:not(:hover) { animation: fabPulse 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── FAB button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI Assistant"
        className={`fab-pulse fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand text-black
          flex items-center justify-center shadow-[0_8px_32px_rgba(246,183,10,0.45)]
          hover:bg-[#d4960a] hover:shadow-[0_0_28px_rgba(246,183,10,0.6)]
          active:scale-95 transition-all duration-200 select-none`}
      >
        {open ? (
          /* Close × */
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <AIIcon size={26} />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="chat-panel-in fixed bottom-24 right-6 z-40 w-[360px] max-h-[520px]
            flex flex-col rounded-2xl overflow-hidden
            bg-[#111111]/95 backdrop-blur-2xl
            border border-white/[0.08]
            shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(246,183,10,0.06)]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center">
              <span className="text-brand"><AIIcon size={16} /></span>
            </div>
            <div>
              <p className="text-sm font-headline font-bold text-text-primary leading-none">AI Assistant</p>
              <p className="text-[11px] font-body text-brand mt-0.5">Krench Chicken · TikTok Expert</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-body text-text-muted">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 scroll-smooth">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start mb-3">
                <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <span className="text-brand"><AIIcon size={14} /></span>
                </div>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-body mb-3">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Suggestion chips */}
            {showSuggestions && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-headline font-bold text-text-muted uppercase tracking-widest mb-2">Quick questions</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="block w-full text-left px-3 py-2 rounded-xl text-xs font-body text-text-secondary
                      bg-white/[0.03] border border-white/[0.06]
                      hover:border-brand/30 hover:bg-brand/[0.06] hover:text-text-primary
                      transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.05] flex-shrink-0" />

          {/* Input area */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-3 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about TikTok strategy…"
              rows={1}
              disabled={loading}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                text-sm font-body text-text-primary placeholder:text-text-muted
                outline-none resize-none min-h-[40px] max-h-[100px] overflow-y-auto
                focus:border-brand/40 focus:bg-white/[0.06]
                transition-all duration-150 disabled:opacity-50 leading-relaxed"
              style={{ height: 'auto' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-brand text-black flex items-center justify-center
                flex-shrink-0 transition-all duration-150
                hover:bg-[#d4960a] hover:shadow-[0_0_16px_rgba(246,183,10,0.4)]
                active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </form>

          {/* Footer label */}
          <div className="px-4 pb-2.5 flex-shrink-0">
            <p className="text-[10px] font-body text-text-muted/50 text-center">
              Powered by GPT-4o · LeadFlow AI
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
