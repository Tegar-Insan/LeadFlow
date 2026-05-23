/**
 * ContentLibrarySidebar.jsx
 * Left panel — draggable content library
 * Shows all non-published content; scheduled items remain visible so the user
 * can still drag-reschedule them or see their status at a glance.
 * LeadFlow – Krench Chicken
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryCard } from './ContentCard';
import Button from '../common/button';

const getPrimaryAssetUrl = (item) => (
  item?.primary_asset_url
  || item?.assets?.[0]?.file_url
  || item?.assets?.[0]?.url
  || item?.file_url
  || item?.preview_url
  || null
);

const getPrimaryAssetType = (item) => {
  const directType = item?.primary_asset_type || item?.content_type || item?.asset_type;
  if (directType) return directType;

  const mime = String(item?.primary_asset_mime || item?.assets?.[0]?.mime_type || '').toLowerCase();
  if (mime.startsWith('video/')) return 'short_video';
  if (mime.startsWith('image/')) return 'poster_photo';
  return null;
};

const normalizeItem = (item) => ({
  ...item,
  primary_asset_url: getPrimaryAssetUrl(item),
  primary_asset_type: getPrimaryAssetType(item),
  slide_count: item?.slide_count ?? item?.assets?.length ?? 1,
});

type ContentLibrarySidebarProps = {
  drafts?: any[];
  schedules?: any[];
  onEdit?: (schedule: any) => void;
  onDelete?: (scheduleId: string) => void;
  onPublish?: (schedule: any) => void;
  publishLoadingId?: string | null;
  totalContent?: number;
  totalScheduled?: number;
  totalUnscheduled?: number;
};

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
}: ContentLibrarySidebarProps) => {
  const navigate = useNavigate();

  // Build unified list: drafts first (unscheduled stack), then scheduled items.
  // Deduplication ensures items moved from drafts→schedules appear only once.
  const seen = new Set();
  const items = [
    ...drafts,
    ...schedules.filter(s => s.status !== 'published'),
  ].map(normalizeItem).filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const sortedItems = [...items].sort((a, b) => {
    const aIsDraft = !a.scheduled_at || a.status === 'draft';
    const bIsDraft = !b.scheduled_at || b.status === 'draft';

    if (aIsDraft && !bIsDraft) return -1;
    if (!aIsDraft && bIsDraft) return 1;

    if (aIsDraft && bIsDraft) {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    }

    const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  const scheduledCount   = items.filter(s => s.status === 'scheduled' || s.status === 'uploaded').length;
  const unscheduledCount = items.filter(s => s.status === 'draft' || !s.scheduled_at).length;

  return (
    <aside className="w-[175px] flex-shrink-0 bg-[#141414] border-r border-white/[0.06] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-white/[0.06]">
        <h2 className="font-headline font-bold text-sm text-text-primary">Content Library</h2>
        <p className="text-[10px] font-body text-text-secondary mt-0.5 leading-tight">Drag content to schedule posts</p>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700">
        {sortedItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-[11px] text-zinc-600 leading-tight">No content yet.<br/>Create a new post.</p>
          </div>
        ) : (
          sortedItems.map(s => (
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
          { label: 'Total Content',   value: totalContent      ?? sortedItems.length },
          { label: 'Scheduled',       value: totalScheduled    ?? scheduledCount },
          { label: 'Unscheduled',     value: totalUnscheduled  ?? unscheduledCount },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[10px] text-text-secondary">{label}:</span>
            <span className="text-[10px] font-bold text-text-primary">{value}</span>
          </div>
        ))}
      </div>

      {/* Messages button */}
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/interaction')}
          className="w-full text-xs"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        >
          Messages
        </Button>
      </div>
    </aside>
  );
};

export default ContentLibrarySidebar;