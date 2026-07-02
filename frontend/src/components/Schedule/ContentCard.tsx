/**
 * ContentCard.jsx
 * Draggable content card for Library sidebar + calendar slots
 * LeadFlow – Krench Chicken
 */

import { fLongDateTime, fTime } from '../../utils/formatDate';

type LibraryCardProps = {
  schedule: any;
  onEdit?: (schedule: any) => void;
  onDelete?: (scheduleId: string) => void;
  onPublish?: (schedule: any) => void;
  onDragStart?: (schedule: any) => void;
  publishLoading?: boolean;
};

type SlotCardProps = {
  schedule: any;
  onClick?: (schedule: any) => void;
};

const STATUS_BADGE = {
  draft:     { label: 'draft',     cls: 'status-draft' },
  planned:   { label: 'planned',   cls: 'status-draft' },
  scheduled: { label: 'scheduled', cls: 'status-scheduled' },
  uploaded:  { label: 'uploaded',  cls: 'status-scheduled' },
  published: { label: 'published', cls: 'status-live' },
  failed:    { label: 'failed',    cls: 'status-failed' },
};

// Library sidebar card (vertical)
export const LibraryCard = ({ schedule, onEdit, onDelete, onPublish, onDragStart, publishLoading = false }: LibraryCardProps) => {
  const badge = STATUS_BADGE[schedule.status] || STATUS_BADGE.draft;
  // No media uploaded yet — fall back to the AI-generated cover image from
  // idea generation (content_ideas.generated_image_url) or, for idea-less
  // agent/chatbot-approved schedules, content_queue_schedules.preview_image_url
  // (Supabase Storage `leadflow-media` bucket) so the card isn't blank
  // between approve and upload.
  const imageUrl = schedule.primary_asset_url || schedule.generated_image_url || schedule.preview_image_url;
  const hasImage = Boolean(imageUrl);
  const slideCount = schedule.slide_count || 1;
  const canPublish = ['scheduled', 'uploaded', 'failed'].includes(schedule.status);
  const isDraft = schedule.status === 'draft' || schedule.status === 'planned' || !schedule.scheduled_at;
  const scheduleText = isDraft ? 'Draft only' : fLongDateTime(schedule.scheduled_at);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('scheduleId', schedule.id);
        onDragStart?.(schedule);
      }}
      className="relative rounded-xl overflow-hidden bg-white border border-gray-300 cursor-grab active:cursor-grabbing group hover:border-gray-400 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative h-[88px] bg-gray-100 overflow-hidden">
        {hasImage ? (
          <img src={imageUrl} alt={schedule.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">
            {schedule.primary_asset_type === 'short_video' ? '🎬' : '📷'}
          </div>
        )}
        {/* Slide count badge */}
        {slideCount > 1 && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/70 rounded px-1.5 py-0.5 text-[10px] text-white font-semibold">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7"/></svg>
            {slideCount}
          </div>
        )}
        {/* Check badge */}
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
        </div>
        {/* Action buttons */}
        <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canPublish && (
            <button
              onClick={(e) => { e.stopPropagation(); onPublish?.(schedule); }}
              disabled={publishLoading}
              className="w-6 h-6 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title={publishLoading ? 'Publishing...' : 'Publish now'}
            >
              {publishLoading ? (
                <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              )}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(schedule); }}
            className="w-6 h-6 rounded-md bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(schedule.id); }}
            className="w-6 h-6 rounded-md bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{schedule.title || schedule.custom_caption || 'Untitled'}</p>
        <p className={`mt-1 text-[10px] truncate ${isDraft ? 'text-amber-600' : 'text-gray-500'}`}>
          {scheduleText}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">
            {schedule.duration_seconds ? `⏱ ${schedule.duration_seconds}s` : '📷 Photo'}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
};

// Compact calendar slot card (horizontal) — fits inside weekly time-slot cells
export const SlotCard = ({ schedule, onClick }: SlotCardProps) => {
  const imageUrl = schedule.primary_asset_url || schedule.generated_image_url || schedule.preview_image_url;
  const hasImage = Boolean(imageUrl);
  const badge = STATUS_BADGE[schedule.status] || STATUS_BADGE.draft;
  const isDraft = schedule.status === 'draft' || schedule.status === 'planned' || !schedule.scheduled_at;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('scheduleId', schedule.id);
      }}
      onClick={(e) => { e.stopPropagation(); onClick?.(schedule); }}
      className="relative w-full rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing transition-all duration-200 group"
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      {/* Thumbnail — only when image exists */}
      {hasImage && (
        <div className="h-[48px] overflow-hidden">
          <img src={imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}

      {/* Info row */}
      <div className="px-2 py-1.5 flex flex-col gap-1">
        {/* Icon + title */}
        <div className="flex items-center gap-1 min-w-0">
          {!hasImage && (
            <span className="text-[11px] flex-shrink-0 opacity-60">
              {schedule.primary_asset_type === 'short_video' ? '🎬' : '📷'}
            </span>
          )}
          <p className="text-[11px] font-body font-semibold text-slate-800 truncate leading-tight flex-1 min-w-0">
            {schedule.custom_caption || schedule.title || 'Untitled'}
          </p>
        </div>
        {/* Status + Auto */}
        <div className="flex items-center justify-between">
          <span className={badge.cls} style={{ fontSize: '9px', padding: '1px 6px' }}>
            {badge.label}
          </span>
          {isDraft ? (
            <span className="text-[9px] font-body font-bold text-amber-600 flex items-center gap-0.5">
              Draft
            </span>
          ) : schedule.auto_publish ? (
            <span className="text-[9px] font-body font-bold text-emerald-600 flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {fTime(schedule.scheduled_at)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SlotCard;