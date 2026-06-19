import { fLongDateTime } from '../../utils/formatDate';
import { InlineLoader } from '../common/KineticLoader';

interface Schedule {
  title?: string;
  caption?: string;
  hashtags?: string[];
  day_label?: string;
  time_wib?: string;
  scheduled_at?: string;
  reasoning?: string;
  generated_image_url?: string;
}

interface ContentIdeaCardProps {
  schedule: Schedule;
  onApprove?: () => void;
  onReject?: () => void;
  approving?: boolean;
  approved?: boolean;
  rejected?: boolean;
}

const ContentIdeaCard = ({
  schedule,
  onApprove,
  onReject,
  approving = false,
  approved = false,
  rejected = false,
}: ContentIdeaCardProps) => {
  if (!schedule) return null;

  const dateLabel = schedule.day_label || (schedule.scheduled_at ? fLongDateTime(schedule.scheduled_at) : 'Draft');
  const timeLabel = schedule.time_wib || '';

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-brand/20 bg-[#0f0f0f] shadow-[0_0_0_1px_rgba(246,183,10,0.05),0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-brand/[0.12] bg-brand/[0.06]">
        <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_6px_rgba(246,183,10,0.8)]" />
        <span className="text-[10px] font-headline font-bold text-brand uppercase tracking-[0.22em]">
          Rekomendasi Jadwal
        </span>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* GPT Image 2.0 — generated automatically alongside this idea */}
        <div className="rounded-xl overflow-hidden border border-white/[0.07] h-36 relative bg-white/[0.03]">
          {schedule.generated_image_url ? (
            <img
              src={schedule.generated_image_url}
              alt={schedule.title || 'AI Recommended Post'}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-headline font-bold text-white leading-snug">
          {schedule.title || 'AI Recommended Post'}
        </p>

        {/* Date & time */}
        <div className="flex items-center gap-2 text-xs font-body">
          <span className="text-brand font-semibold">{dateLabel}</span>
          {timeLabel && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-brand/80 font-medium">{timeLabel}</span>
            </>
          )}
        </div>

        {/* Caption */}
        {schedule.caption && (
          <p className="text-xs font-body text-white/60 leading-relaxed line-clamp-3 bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.06]">
            {schedule.caption}
          </p>
        )}

        {/* Hashtags */}
        {Array.isArray(schedule.hashtags) && schedule.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {schedule.hashtags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-brand/[0.08] border border-brand/[0.15] text-brand/80 font-body"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Reasoning */}
        {schedule.reasoning && (
          <p className="text-[10px] italic text-white/35 font-body leading-relaxed">
            {schedule.reasoning}
          </p>
        )}

        {/* Status banners */}
        {approved && (
          <div className="rounded-xl px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs text-emerald-300 font-body">Schedule dikirim ke kalender.</p>
          </div>
        )}
        {rejected && (
          <div className="rounded-xl px-3 py-2.5 bg-white/[0.03] border border-white/[0.08]">
            <p className="text-xs text-white/35 font-body">Rekomendasi ditolak.</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!approved && !rejected && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onApprove}
            disabled={approving}
            className="flex-1 h-9 rounded-xl bg-brand text-black text-xs font-headline font-bold hover:bg-[#d4960a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(246,183,10,0.25)]"
          >
            {approving ? (
              <>
                <InlineLoader size="sm" className="text-black" />
                <span>Membuat…</span>
              </>
            ) : 'Setujui'}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={approving}
            className="flex-1 h-9 rounded-xl border border-white/[0.1] text-white/50 text-xs font-headline font-semibold hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/[0.06] disabled:opacity-50 transition-colors"
          >
            Tolak
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentIdeaCard;
