import React from 'react';
import { fLongDateTime } from '../../utils/formatDate';

const ContentIdeaCard = ({
	schedule,
	onApprove,
	onReject,
	approving = false,
	approved = false,
	rejected = false,
}) => {
	if (!schedule) return null;

	const dateLabel = schedule.day_label || (schedule.scheduled_at ? fLongDateTime(schedule.scheduled_at) : 'Draft');
	const timeLabel = schedule.time_wib || '';

	return (
		<div className="mt-3 rounded-2xl overflow-hidden border border-brand/20 bg-brand/[0.04] shadow-[0_0_0_1px_rgba(246,183,10,0.05)]">
			<div className="flex items-center gap-2 px-4 py-3 border-b border-brand/15 bg-brand/[0.08]">
				<span className="text-brand text-sm">📅</span>
				<span className="text-[11px] font-headline font-bold text-brand uppercase tracking-widest">
					Rekomendasi Jadwal
				</span>
			</div>

			<div className="px-4 py-3 space-y-2.5">
				<p className="text-sm font-headline font-semibold text-text-primary leading-snug">
					{schedule.title || 'AI Recommended Post'}
				</p>

				<div className="flex flex-wrap items-center gap-2 text-xs font-body text-brand">
					<span className="font-semibold">{dateLabel}</span>
					{timeLabel && <span className="text-text-muted">·</span>}
					{timeLabel && <span className="font-semibold">{timeLabel}</span>}
				</div>

				{schedule.caption && (
					<p className="text-xs font-body text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-3">
						{schedule.caption}
					</p>
				)}

				{Array.isArray(schedule.hashtags) && schedule.hashtags.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{schedule.hashtags.slice(0, 6).map((tag) => (
							<span
								key={tag}
								className="text-[10px] px-2 py-1 rounded-full bg-white/[0.05] text-text-secondary"
							>
								{tag}
							</span>
						))}
					</div>
				)}

				{schedule.reasoning && (
					<p className="text-[10px] italic text-text-muted font-body">
						{schedule.reasoning}
					</p>
				)}

				{approved ? (
					<div className="mt-2 rounded-xl px-3 py-2 bg-green-500/10 border border-green-500/20 text-xs text-green-300 font-body">
						✅ Schedule sudah dibuat dan dikirim ke kalender.
					</div>
				) : rejected ? (
					<div className="mt-2 rounded-xl px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-xs text-text-muted font-body">
						Rekomendasi ditolak.
					</div>
				) : null}
			</div>

			{!approved && !rejected && (
				<div className="flex gap-2 px-4 pb-4">
					<button
						type="button"
						onClick={onApprove}
						disabled={approving}
						className="flex-1 h-9 rounded-xl bg-brand text-black text-xs font-headline font-bold hover:bg-[#d4960a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{approving ? 'Membuat…' : 'Setujui'}
					</button>
					<button
						type="button"
						onClick={onReject}
						disabled={approving}
						className="flex-1 h-9 rounded-xl border border-white/[0.08] text-text-secondary text-xs font-headline font-semibold hover:border-white/20 hover:text-text-primary disabled:opacity-50 transition-colors"
					>
						Tolak
					</button>
				</div>
			)}
		</div>
	);
};

export default ContentIdeaCard;
