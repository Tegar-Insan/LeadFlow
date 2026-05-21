import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  approveIdea,
  generateDrafts,
  rejectIdea,
  type GeneratedScheduleDraft,
} from '../../services/contentService';
import { useNotification } from '../../context/NotificationContext';
import { fLongDateTime } from '../../utils/formatDate';
import { InlineLoader } from '../../components/common/KineticLoader';

type CardState = 'idle' | 'approving' | 'rejecting' | 'fading';

interface DraftCardViewModel extends GeneratedScheduleDraft {
  ui_state: CardState;
}

// ─── Idea Card ────────────────────────────────────────────────
const IdeaCard = ({
  draft,
  index,
  rejectingId,
  rejectReason,
  onApprove,
  onRejectOpen,
  onRejectConfirm,
  onRejectCancel,
  onRejectReasonChange,
}: {
  draft: DraftCardViewModel;
  index: number;
  rejectingId: string | null;
  rejectReason: string;
  onApprove: (d: DraftCardViewModel) => void;
  onRejectOpen: (id: string) => void;
  onRejectConfirm: (withReason: boolean) => void;
  onRejectCancel: () => void;
  onRejectReasonChange: (v: string) => void;
}) => {
  const isRejecting = rejectingId === draft.id;

  return (
    <div
      className={`relative rounded-3xl border bg-[#0d0d0d] overflow-hidden transition-all duration-400 ${
        draft.ui_state === 'fading'
          ? 'opacity-0 scale-95 pointer-events-none'
          : 'opacity-100 border-white/[0.07]'
      }`}
    >
      {/* Gold top stripe */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-brand/[0.12] border border-brand/20 flex items-center justify-center text-[10px] font-headline font-bold text-brand">
            {index + 1}
          </span>
          <span className="text-xs font-headline font-bold text-white/50 uppercase tracking-widest">
            {draft.category || 'Content Idea'}
          </span>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand/[0.08] border border-brand/[0.15] text-brand/70 font-body">
          {draft.estimated_engagement || 'Medium'}
        </span>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Title */}
        <h3 className="text-lg font-headline font-bold text-white leading-snug">
          {draft.idea_title}
        </h3>

        {/* Hook */}
        {draft.hook && (
          <div className="space-y-1">
            <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-white/30">Hook</p>
            <p className="text-sm text-white/65 italic font-body leading-relaxed">
              "{draft.hook}"
            </p>
          </div>
        )}

        {/* Caption */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-white/30">Caption</p>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <p className="text-sm text-white/60 font-body leading-relaxed">{draft.caption}</p>
          </div>
        </div>

        {/* Hashtags */}
        {draft.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2.5 py-1 rounded-full bg-brand/[0.07] border border-brand/[0.12] text-brand/70 font-body"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Musik', value: draft.suggested_music || '—', icon: '🎵' },
            { label: 'Durasi', value: draft.estimated_duration ? `${draft.estimated_duration}s` : '—', icon: '⏱' },
            { label: 'Best Time', value: draft.best_time_to_post_wib ? fLongDateTime(draft.best_time_to_post_wib) : '—', icon: '📅' },
            { label: 'Engagement', value: draft.estimated_engagement || '—', icon: '📈' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl bg-white/[0.02] border border-white/[0.05] px-3 py-2.5">
              <p className="text-[9px] font-headline font-semibold uppercase tracking-widest text-white/25 mb-1">
                {icon} {label}
              </p>
              <p className="text-xs text-white/55 font-body truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {draft.ui_state !== 'fading' && (
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onApprove(draft)}
              disabled={draft.ui_state !== 'idle'}
              className="flex-1 h-11 rounded-2xl bg-brand text-black text-sm font-headline font-bold hover:bg-[#d4960a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_4px_20px_rgba(246,183,10,0.2)] hover:shadow-[0_4px_24px_rgba(246,183,10,0.35)] flex items-center justify-center gap-2"
            >
              {draft.ui_state === 'approving' ? (
                <>
                  <InlineLoader size="sm" className="text-black" />
                  <span>Menambahkan…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onRejectOpen(draft.id)}
              disabled={draft.ui_state !== 'idle'}
              className="flex-1 h-11 rounded-2xl border border-white/[0.1] text-white/45 text-sm font-headline font-semibold hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/[0.06] disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </div>
        )}

        {/* Reject reason panel */}
        {isRejecting && (
          <div className="mt-1 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 space-y-3">
            <p className="text-xs font-headline font-semibold text-red-400">Alasan penolakan (opsional)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              rows={2}
              placeholder="Contoh: Video belum siap diproduksi"
              className="w-full rounded-xl bg-white/[0.04] border border-red-500/20 px-3 py-2 text-xs text-white/70 placeholder:text-white/20 outline-none resize-none focus:border-red-500/40 transition-colors font-body"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRejectConfirm(false)}
                className="flex-1 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs text-white/50 hover:text-white/70 font-body transition-colors"
              >
                Skip & Reject
              </button>
              <button
                type="button"
                onClick={() => onRejectConfirm(true)}
                className="flex-1 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-headline font-semibold transition-colors"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onRejectCancel}
                className="h-8 px-3 rounded-xl border border-white/[0.08] text-xs text-white/40 hover:text-white/60 font-body transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────
export default function GeneratedIdeasPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useNotification();
  const [brief, setBrief] = useState('');
  const [lastBrief, setLastBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftCardViewModel[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function populateDrafts(briefText: string, append = false): Promise<void> {
    const normalized = briefText.trim();
    if (normalized.length < 5) { toast.error('Brief minimal 5 karakter'); return; }
    if (!append) setLastBrief(normalized);
    setLoading(true);
    try {
      const resp = await generateDrafts(normalized);
      const enriched: DraftCardViewModel[] = resp.map((d) => ({ ...d, ui_state: 'idle' }));
      setDrafts((prev) => {
        if (!append) return enriched;
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...enriched.filter((x) => !seen.has(x.id))].slice(0, 3);
      });
      if (enriched.length === 0) toast.warning('Tidak ada ide yang dikembalikan. Coba brief berbeda.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal generate');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(idea: DraftCardViewModel): Promise<void> {
    setDrafts((prev) => prev.map((d) => d.id === idea.id ? { ...d, ui_state: 'approving' } : d));
    try {
      const result = await approveIdea(idea.id);
      toast.success('Ditambahkan ke kalender sebagai draft');
      navigate('/calendar', {
        replace: true,
        state: result.schedule_id ? { createdScheduleId: result.schedule_id } : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal approve');
      setDrafts((prev) => prev.map((d) => d.id === idea.id ? { ...d, ui_state: 'idle' } : d));
    }
  }

  function openRejectPrompt(id: string): void {
    setRejectingId(id);
    setRejectReason('');
  }

  async function confirmReject(withReason: boolean): Promise<void> {
    if (!rejectingId) return;
    const id = rejectingId;
    const reason = withReason ? rejectReason.trim() || null : null;
    setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, ui_state: 'rejecting' } : d));
    setRejectingId(null);
    setRejectReason('');
    try {
      await rejectIdea(id, reason);
      toast.info('Ide ditolak');
      setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, ui_state: 'fading' } : d));
      window.setTimeout(() => {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        if (lastBrief.trim().length >= 5) void populateDrafts(lastBrief, true);
      }, 400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal reject');
      setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, ui_state: 'idle' } : d));
    }
  }

  const QUICK_PROMPTS = [
    'Promo ayam goreng weekend, jam prime time',
    'Menu best seller, gaya santai Gen-Z Bogor',
    '3 konten TikTok minggu ini untuk Krench',
    'Tren food TikTok yang cocok buat konten',
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-64 right-1/4 w-[700px] h-[500px] rounded-full bg-brand/[0.03] blur-[140px]" />
        <div className="absolute top-1/2 -left-48 w-[500px] h-[400px] rounded-full bg-brand/[0.02] blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 py-8 lg:py-10">

        {/* Top nav */}
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-[10px] font-headline font-bold uppercase tracking-[0.28em] text-brand">
              AI Content Assistant
            </p>
            <h1 className="text-xl font-headline font-bold text-white mt-0.5">
              Generate Ideas
            </h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* LEFT — Input panel (sticky) */}
          <div className="lg:sticky lg:top-6">
            <div className="rounded-3xl border border-white/[0.07] bg-[#0d0d0d] overflow-hidden">
              <div className="h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
              <div className="px-6 py-6 space-y-5">
                <div>
                  <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-white/30 mb-3">
                    Brief Konten
                  </p>
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    rows={5}
                    placeholder="Deskripsikan konten TikTok yang kamu inginkan minggu ini. Semakin detail, semakin relevan hasilnya."
                    disabled={loading}
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-brand/40 focus:bg-white/[0.06] transition-all font-body leading-relaxed min-h-[120px]"
                  />
                </div>

                {/* Quick prompts */}
                <div className="space-y-2">
                  <p className="text-[10px] font-headline font-semibold uppercase tracking-widest text-white/25">
                    Quick Start
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBrief(p)}
                        disabled={loading}
                        className="text-left px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/40 hover:border-brand/25 hover:text-brand/70 hover:bg-brand/[0.04] transition-all font-body disabled:opacity-30"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <button
                  type="button"
                  onClick={() => void populateDrafts(brief)}
                  disabled={loading || brief.trim().length < 5}
                  className="w-full h-12 rounded-2xl bg-brand text-black text-sm font-headline font-bold hover:bg-[#d4960a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_4px_20px_rgba(246,183,10,0.18)] hover:shadow-[0_4px_28px_rgba(246,183,10,0.32)] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      AI sedang berpikir…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Ideas
                    </>
                  )}
                </button>

                {/* Tip */}
                <p className="text-[10px] text-white/20 font-body text-center leading-relaxed">
                  AI akan membuat 3 ide konten TikTok.<br/>Approve untuk mengirim ke kalender.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — Results */}
          <div className="space-y-4">
            {loading && drafts.length === 0 && (
              <div className="rounded-3xl border border-white/[0.06] bg-[#0d0d0d] px-6 py-14 flex flex-col items-center gap-4">
                <div className="flex items-end gap-2">
                  {[0,1,2,3,4].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-brand animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s`, boxShadow: '0 0 8px rgba(246,183,10,0.6)' }}
                    />
                  ))}
                </div>
                <p className="text-sm text-white/35 font-body">AI sedang menganalisis brief kamu…</p>
              </div>
            )}

            {!loading && drafts.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/[0.06] px-6 py-16 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-headline font-semibold text-white/30">Belum ada ide</p>
                  <p className="text-xs text-white/20 font-body mt-1">Isi brief di sebelah kiri, lalu klik Generate Ideas</p>
                </div>
              </div>
            )}

            {drafts.map((draft, i) => (
              <IdeaCard
                key={draft.id}
                draft={draft}
                index={i}
                rejectingId={rejectingId}
                rejectReason={rejectReason}
                onApprove={handleApprove}
                onRejectOpen={openRejectPrompt}
                onRejectConfirm={(w) => void confirmReject(w)}
                onRejectCancel={() => { setRejectingId(null); setRejectReason(''); }}
                onRejectReasonChange={setRejectReason}
              />
            ))}

            {drafts.length > 0 && !loading && (
              <button
                type="button"
                onClick={() => void populateDrafts(brief || lastBrief)}
                className="w-full h-11 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-sm font-headline font-semibold text-white/40 hover:border-brand/30 hover:text-brand/70 hover:bg-brand/[0.04] transition-all"
              >
                Generate More Ideas
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
