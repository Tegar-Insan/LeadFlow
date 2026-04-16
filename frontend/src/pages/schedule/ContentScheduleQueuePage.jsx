/**
 * ContentScheduleQueuePage.jsx
 * UC007 — Content Schedule Queue (list / table view)
 * Reads from the same /api/calendar + /api/calendar/drafts endpoints already wired.
 * Marketing Staff only.
 * LeadFlow – Krench Chicken
 */

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc      from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { useSchedule }  from '../../hooks/useSchedule';
import AuthContext       from '../../context/AuthContext';
import { fLongDateTime } from '../../utils/formatDate';
import { InlineLoader }  from '../../components/common/KineticLoader';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';

// ─── Status badge map ─────────────────────────────────────────
const STATUS = {
  draft:     { label: 'Draft',     cls: 'bg-zinc-700/60 text-zinc-300 border-zinc-600' },
  scheduled: { label: 'Scheduled', cls: 'bg-amber-900/50 text-amber-300 border-amber-700/40' },
  uploaded:  { label: 'Uploaded',  cls: 'bg-blue-900/50  text-blue-300  border-blue-700/40' },
  published: { label: 'Published', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40' },
  failed:    { label: 'Failed',    cls: 'bg-red-900/50   text-red-300   border-red-700/40' },
};

const FILTERS = ['all', 'draft', 'scheduled', 'uploaded', 'published', 'failed'];

const StatusBadge = ({ status }) => {
  const cfg = STATUS[status] || STATUS.draft;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border font-body ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Queue row ────────────────────────────────────────────────
const QueueRow = ({ schedule, onEdit, onDelete, onView }) => {
  const hasThumb = !!schedule.primary_asset_url;
  const isVideo  = schedule.primary_asset_mime?.startsWith('video/');

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer"
      onClick={() => onView(schedule)}
    >
      {/* Thumbnail */}
      <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 flex items-center justify-center">
        {hasThumb ? (
          isVideo ? (
            <video
              src={schedule.primary_asset_url}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            <img
              src={schedule.primary_asset_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <span className="text-lg opacity-30">
            {schedule.primary_asset_type === 'short_video' ? '🎬' : '📷'}
          </span>
        )}
      </div>

      {/* Title + hashtags */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate font-body">
          {schedule.custom_caption || schedule.title || 'Untitled'}
        </p>
        {schedule.custom_hashtags?.length > 0 && (
          <p className="text-[10px] text-text-muted truncate mt-0.5 font-body">
            {schedule.custom_hashtags.slice(0, 4).join(' ')}
            {schedule.custom_hashtags.length > 4 && ` +${schedule.custom_hashtags.length - 4}`}
          </p>
        )}
      </div>

      {/* Scheduled at */}
      <div className="w-44 flex-shrink-0 hidden md:block">
        {schedule.scheduled_at ? (
          <p className="text-xs text-text-secondary font-body">
            {fLongDateTime(schedule.scheduled_at)}
          </p>
        ) : (
          <p className="text-xs text-text-muted font-body italic">Not scheduled</p>
        )}
      </div>

      {/* Status */}
      <div className="w-24 flex-shrink-0 hidden sm:flex justify-center">
        <StatusBadge status={schedule.status} />
      </div>

      {/* Media type */}
      <div className="w-16 flex-shrink-0 hidden lg:block text-center">
        <span className="text-[11px] text-text-muted font-body">
          {schedule.primary_asset_type === 'short_video' ? '🎬 Video' : schedule.primary_asset_type === 'poster_photo' ? '🖼️ Photo' : '—'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(schedule); }}
          className="w-7 h-7 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 flex items-center justify-center transition-colors"
          title="Edit"
        >
          <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(schedule.id); }}
          className="w-7 h-7 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 flex items-center justify-center transition-colors"
          title="Delete"
        >
          <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const ContentScheduleQueuePage = () => {
  const navigate = useNavigate();
  const authCtx  = useContext(AuthContext);
  const roleName = authCtx?.user?.roleName || authCtx?.user?.role_name;
  const canEdit  = ['marketing_staff', 'admin'].includes(roleName);

  const {
    year, month,
    schedules, drafts,
    loading, error,
    prevMonth, nextMonth, goToToday,
    removeSchedule,
  } = useSchedule();

  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');

  // Merge schedules + drafts; deduplicate
  const allItems = (() => {
    const seen = new Set();
    return [
      ...schedules,
      ...drafts,
    ].filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  })();

  // Apply filter + search
  const visible = allItems.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const title = (s.custom_caption || s.title || '').toLowerCase();
      if (!title.includes(q)) return false;
    }
    return true;
  });

  // Sort: unscheduled drafts first, then by scheduled_at asc
  visible.sort((a, b) => {
    if (!a.scheduled_at && b.scheduled_at) return -1;
    if (a.scheduled_at && !b.scheduled_at) return 1;
    if (!a.scheduled_at && !b.scheduled_at) return 0;
    return new Date(a.scheduled_at) - new Date(b.scheduled_at);
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule and all its media?')) return;
    try { await removeSchedule(id); }
    catch { alert('Failed to delete.'); }
  };

  const handleEdit = (s) => {
    navigate('/calendar', { state: { editScheduleId: s.id } });
  };

  const handleView = (s) => {
    navigate('/calendar', { state: { viewScheduleId: s.id } });
  };

  const monthLabel = dayjs(new Date(year, month - 1)).tz(TZ).format('MMMM YYYY');

  return (
    <div className="min-h-screen bg-surface font-body">

      {/* ── Header ── */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-surface-border bg-surface-raised">
        <button
          onClick={() => navigate('/calendar')}
          className="w-8 h-8 rounded-lg border border-surface-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          title="Back to Calendar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="font-headline font-bold text-base text-text-primary">Content Schedule Queue</h1>
          <p className="text-[11px] text-text-secondary font-body mt-0.5">All scheduled + draft content</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => navigate('/calendar', { state: { openCreate: true } })}
              className="btn-primary px-4 h-8 text-xs"
            >
              + New Post
            </button>
          )}
        </div>
      </header>

      {/* ── Controls ── */}
      <div className="px-6 py-3 border-b border-surface-border bg-surface-raised flex flex-wrap items-center gap-3">

        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded border border-surface-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-xs font-semibold text-text-primary min-w-[110px] text-center font-body">{monthLabel}</span>
          <button onClick={nextMonth} className="w-7 h-7 rounded border border-surface-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
          <button onClick={goToToday} className="ml-1 px-2 h-7 rounded border border-surface-border text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors font-body">Today</button>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 h-6 rounded-full text-[11px] font-semibold font-body transition-all capitalize
                ${filter === f
                  ? 'bg-brand text-black'
                  : 'bg-white/[0.04] text-text-secondary border border-white/[0.08] hover:text-text-primary'}`}
            >
              {f === 'all' ? `All (${allItems.length})` : f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="ml-auto relative">
          <svg className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            placeholder="Search posts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field h-7 pl-7 pr-3 text-xs w-48"
          />
        </div>
      </div>

      {/* ── Table header ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-surface-raised/50">
        <div className="w-14 flex-shrink-0" />
        <div className="flex-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest font-body">Title</div>
        <div className="w-44 flex-shrink-0 hidden md:block text-[10px] font-semibold text-text-muted uppercase tracking-widest font-body">Scheduled At</div>
        <div className="w-24 flex-shrink-0 hidden sm:block text-[10px] font-semibold text-text-muted uppercase tracking-widest font-body text-center">Status</div>
        <div className="w-16 flex-shrink-0 hidden lg:block text-[10px] font-semibold text-text-muted uppercase tracking-widest font-body text-center">Type</div>
        <div className="w-[68px] flex-shrink-0" />
      </div>

      {/* ── Content ── */}
      <div className="divide-y divide-transparent">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-text-secondary">
            <InlineLoader size="md" className="text-brand" />
            <span className="text-sm font-body">Loading queue…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-brand font-body">{error}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
            <p className="text-3xl">📋</p>
            <p className="text-sm font-body">
              {search || filter !== 'all'
                ? 'No posts match this filter.'
                : 'No content yet. Create your first post on the Calendar.'}
            </p>
            {canEdit && !search && filter === 'all' && (
              <button
                onClick={() => navigate('/calendar', { state: { openCreate: true } })}
                className="btn-primary px-4 h-8 text-xs mt-1"
              >
                + New Post
              </button>
            )}
          </div>
        ) : (
          visible.map(s => (
            <QueueRow
              key={s.id}
              schedule={s}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))
        )}
      </div>

      {/* ── Footer count ── */}
      {visible.length > 0 && (
        <div className="px-6 py-3 text-[11px] text-text-muted font-body border-t border-surface-border">
          Showing {visible.length} of {allItems.length} posts
        </div>
      )}
    </div>
  );
};

export default ContentScheduleQueuePage;
