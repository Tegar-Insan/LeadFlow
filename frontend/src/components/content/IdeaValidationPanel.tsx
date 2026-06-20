import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import {
  approveScheduleFromChat,
  rejectScheduleFromChat,
  sendChatMessage,
  getChatSessions,
  getChatSessionMessages,
} from '../../services/chatbotService';
import GeneratedIdeasList, { type ScheduleIdea } from './GeneratedIdeasList';
import PromptInputForm from './PromptInputForm';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: string;
  schedules?: ScheduleIdea[];
}

const defaultWelcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Ketik kebutuhan konten kamu, lalu saya akan bantu buat rekomendasi jadwal yang bisa langsung dikirim ke kalender.',
  type: 'text',
};

interface IdeaValidationPanelProps {
  title: string;
  subtitle: string;
  intro?: string;
}

const IdeaValidationPanel = ({ title, subtitle, intro }: IdeaValidationPanelProps) => {
  const { toast } = useNotification();
  const [messages, setMessages] = useState<ChatMessage[]>([{
    ...defaultWelcome,
    content: intro || defaultWelcome.content,
  }]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCount = useMemo(() => messages.length, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Resume the user's global chat thread (shared with the floating AIChatbot
  // FAB) so navigating between /content/prompt and /content/validate keeps
  // the same conversation instead of resetting to the welcome message.
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
        setMessages(history.map((m: Record<string, unknown>) => ({
          id: m['id'] as string,
          role: m['role'] as 'user' | 'assistant',
          content: m['content'] as string,
          type: m['message_type'] as string,
          schedules: Array.isArray(m['schedules'])
            ? (m['schedules'] as Record<string, unknown>[]).map((schedule) => ({
                schedule, approved: false, rejected: false, approving: false,
              }))
            : undefined,
        })));
      } catch {
        // Resume is best-effort — fall back to the local welcome message.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const send = useCallback(async (text: string) => {
    const content = String(text || '').trim();
    if (!content || loading) return;

    const userMessage = { id: `user_${Date.now()}`, role: 'user' as const, content, type: 'text' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      // Only the new turn is sent — the backend owns history via
      // chatbot_sessions/chatbot_messages (long-term memory).
      const response = await sendChatMessage(sessionId, content);
      if (!sessionId && response.session_id) setSessionId(response.session_id);

      const schedules: ScheduleIdea[] = Array.isArray(response.schedules)
        ? response.schedules.map((schedule: Record<string, unknown>) => ({
            schedule,
            approved: false,
            rejected: false,
            approving: false,
          }))
        : [];
      setMessages((prev) => [...prev, {
        id: `ai_${Date.now()}`,
        role: 'assistant' as const,
        content: response.reply,
        type: response.type || 'text',
        schedules,
      }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menghubungi AI assistant.');
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId]);

  const updateScheduleAt = useCallback((msgId: string, index: number, patch: Partial<ScheduleIdea>) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId || !m.schedules) return m;
      return { ...m, schedules: m.schedules.map((s, i) => i === index ? { ...s, ...patch } : s) };
    }));
  }, []);

  const handleApprove = useCallback(async (schedule: Record<string, unknown>, msgId: string, index: number) => {
    if (!schedule) return;
    updateScheduleAt(msgId, index, { approving: true });

    try {
      await approveScheduleFromChat(schedule);
      toast.success('Ide disetujui — jadwal ditambahkan ke kalender.');
      updateScheduleAt(msgId, index, { approving: false, approved: true });
    } catch (err: unknown) {
      updateScheduleAt(msgId, index, { approving: false });
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal membuat schedule dari rekomendasi AI.');
    }
  }, [toast, updateScheduleAt]);

  const handleReject = useCallback(async (msgId: string, index: number) => {
    updateScheduleAt(msgId, index, { rejected: true });
    try {
      await rejectScheduleFromChat();
    } catch {
      // rejection is local-only state; the acknowledgement call is best-effort
    }
  }, [updateScheduleAt]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/4 w-[600px] h-[400px] rounded-full bg-brand/[0.04] blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-headline font-bold uppercase tracking-[0.3em] text-brand mb-2">
            AI Content Assistant
          </p>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-white leading-tight">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-white/45 font-body max-w-xl">{subtitle}</p>
        </div>

        {/* Main panel */}
        <div className="rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0d0d0d] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
          <div className="grid lg:grid-cols-[1.3fr_0.7fr] min-h-[540px]">

            {/* Left — conversation */}
            <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.05]">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[10px] font-headline font-semibold uppercase tracking-widest text-white/30">
                  Percakapan · {messageCount} pesan
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                <GeneratedIdeasList messages={messages} onApprove={handleApprove} onReject={handleReject} />
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/[0.07]">
                      <span className="flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                      <span className="text-xs text-white/35 font-body">AI sedang menulis…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Right — input panel */}
            <div className="px-5 py-6 bg-white/[0.015]">
              <div className="sticky top-6 space-y-5">
                <div>
                  <p className="text-[10px] font-headline font-semibold uppercase tracking-widest text-white/30 mb-3">
                    Mulai dari sini
                  </p>
                  <PromptInputForm
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onSubmit={handleSubmit}
                    loading={loading}
                  />
                </div>

                {/* How it works */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                  <p className="text-[10px] font-headline font-bold text-white/50 uppercase tracking-widest">
                    Cara kerja
                  </p>
                  <p className="text-xs text-white/35 font-body leading-relaxed">
                    Tulis kebutuhan konten → AI rekomendasikan jadwal → tombol Setujui kirim ke kalender otomatis.
                  </p>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 flex items-start gap-2.5">
                    <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-red-400 font-body">{error}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeaValidationPanel;
