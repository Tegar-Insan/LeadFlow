/**
 * ScheduleQueueCard.jsx
 * Draggable card displayed on calendar cells
 * LeadFlow – Krench Chicken
 * Design: dark charcoal + red accent, Syne + DM Sans
 */

import React from 'react';
import { fTime } from '../../utils/formatDate';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     bg: 'bg-zinc-700/60',  text: 'text-zinc-300',  dot: 'bg-zinc-400'  },
  planned:   { label: 'Planned',   bg: 'bg-blue-900/50',  text: 'text-blue-300',  dot: 'bg-blue-400'  },
  scheduled: { label: 'Scheduled', bg: 'bg-amber-900/50', text: 'text-amber-300', dot: 'bg-amber-400' },
  published: { label: 'Published', bg: 'bg-emerald-900/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  failed:    { label: 'Failed',    bg: 'bg-red-900/50',   text: 'text-red-300',   dot: 'bg-red-500'   },
};

const ASSET_ICON = {
  video:    '🎬',
  photo:    '📷',
  carousel: '🖼️',
};

const ScheduleQueueCard = ({
  schedule,
  onClick,
  onDragStart,
  isDragging = false,
  compact = false,
}) => {
  const cfg = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.draft;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('scheduleId', schedule.id);
    onDragStart?.(schedule);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onClick?.(schedule)}
      className={`
        group relative rounded-lg px-2 py-1.5 cursor-pointer select-none
        border transition-all duration-150
        ${cfg.bg} border-white/5
        ${isDragging ? 'opacity-40 scale-95' : 'hover:border-white/20 hover:brightness-110'}
        ${compact ? 'min-h-[28px]' : 'min-h-[42px]'}
      `}
    >
      {/* Status dot */}
      <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />

      {/* Media type icon */}
      {schedule.primary_asset_type && !compact && (
        <span className="text-[10px] mr-1 opacity-70">
          {ASSET_ICON[schedule.primary_asset_type] || '📄'}
        </span>
      )}

      {/* Title — DB stores caption as custom_caption; fall back to title for safety */}
      <p className={`font-medium leading-tight truncate ${compact ? 'text-[10px]' : 'text-xs'} text-white/90`}>
        {schedule.custom_caption || schedule.title || 'Untitled'}
      </p>

      {/* Time */}
      {schedule.scheduled_at && !compact && (
        <p className={`text-[10px] mt-0.5 ${cfg.text} opacity-80`}>
          {fTime(schedule.scheduled_at)}
        </p>
      )}

      {/* Status badge — shown on hover */}
      <div className={`
        hidden group-hover:flex absolute -top-5 left-0 z-10
        items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold
        ${cfg.bg} ${cfg.text} border border-white/10 whitespace-nowrap shadow-xl
      `}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </div>
    </div>
  );
};

export default ScheduleQueueCard;