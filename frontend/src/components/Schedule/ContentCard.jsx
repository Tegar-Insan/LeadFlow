/**
 * ContentCard.jsx
 * Draggable content card for Library sidebar + calendar slots
 * LeadFlow – Krench Chicken
 */
import React from 'react';
import { fTime } from '../../utils/formatDate';

const STATUS_BADGE = {
  draft:     { label: 'draft',     cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  planned:   { label: 'planned',   cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  scheduled: { label: 'scheduled', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  uploaded:  { label: 'uploaded',  cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  published: { label: 'published', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  failed:    { label: 'failed',    cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

// Library sidebar card (vertical)
export const LibraryCard = ({ schedule, onEdit, onDelete, onDragStart }) => {
  const badge = STATUS_BADGE[schedule.status] || STATUS_BADGE.draft;
  const hasImage = schedule.primary_asset_url;
  const slideCount = schedule.slide_count || 1;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('scheduleId', schedule.id);
        onDragStart?.(schedule);
      }}
      className="relative rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/8 cursor-grab active:cursor-grabbing group hover:border-white/20 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative h-[88px] bg-zinc-800 overflow-hidden">
        {hasImage ? (
          <img src={schedule.primary_asset_url} alt={schedule.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
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
        <p className="text-xs font-semibold text-white/90 truncate leading-tight">{schedule.title || schedule.custom_caption || 'Untitled'}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-zinc-500">
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

// Compact calendar slot card (horizontal)
export const SlotCard = ({ schedule, onClick }) => {
  const hasImage = schedule.primary_asset_url;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('scheduleId', schedule.id);
      }}
      onClick={(e) => { e.stopPropagation(); onClick?.(schedule); }}
      className="relative rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 group"
    >
      {/* Image */}
      {hasImage && (
        <div className="h-[80px] overflow-hidden">
          <img src={schedule.primary_asset_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      {!hasImage && (
        <div className="h-[60px] bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-zinc-400 text-xl">
          {schedule.primary_asset_type === 'short_video' ? '🎬' : '📷'}
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </div>
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-[11px] font-semibold text-zinc-800 truncate leading-tight">
          {schedule.title || schedule.custom_caption || 'Untitled'}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-zinc-400">
            {schedule.duration_seconds ? `⏱ ${schedule.duration_seconds}s` : ''}
          </span>
          {schedule.auto_publish && (
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Auto
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlotCard;