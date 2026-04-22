/**
 * ContentLibrarySidebar.jsx
 * Left panel — draggable content library
 * Shows all non-published content; scheduled items remain visible so the user
 * can still drag-reschedule them or see their status at a glance.
 * LeadFlow – Krench Chicken
 */
import React from 'react';
import { LibraryCard } from './ContentCard';

const ContentLibrarySidebar = ({
  drafts = [],
  schedules = [],
  onEdit,
  onDelete,
  onPublish,
  publishLoadingId,
  totalContent,
  totalScheduled,
  totalUnscheduled,
}) => {
  // Build unified list: scheduled/uploaded first (already on calendar), then drafts.
  // Deduplication ensures items moved from drafts→schedules appear only once.
  const seen = new Set();
  const items = [
    ...schedules.filter(s => s.status !== 'published'),
    ...drafts,
  ].filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const scheduledCount   = items.filter(s => s.status === 'scheduled' || s.status === 'uploaded').length;
  const unscheduledCount = items.filter(s => s.status === 'draft').length;

  return (
    <aside className="w-[175px] flex-shrink-0 bg-[#141414] border-r border-white/[0.06] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-white/[0.06]">
        <h2 className="font-headline font-bold text-sm text-text-primary">Content Library</h2>
        <p className="text-[10px] font-body text-text-secondary mt-0.5 leading-tight">Drag content to schedule posts</p>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-[11px] text-zinc-600 leading-tight">No content yet.<br/>Create a new post.</p>
          </div>
        ) : (
          items.map(s => (
            <LibraryCard
              key={s.id}
              schedule={s}
              onEdit={onEdit}
              onDelete={onDelete}
              onPublish={onPublish}
              publishLoading={publishLoadingId === s.id}
            />
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        {[
          { label: 'Total Content',   value: totalContent      ?? items.length },
          { label: 'Scheduled',       value: totalScheduled    ?? scheduledCount },
          { label: 'Unscheduled',     value: totalUnscheduled  ?? unscheduledCount },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[10px] text-text-secondary">{label}:</span>
            <span className="text-[10px] font-bold text-text-primary">{value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default ContentLibrarySidebar;