/**
 * CalendarPage.jsx — Complete redesign
 * Weekly time-slot calendar with Content Library sidebar
 * Matches reference UI: left panel + weekly grid + top nav
 * LeadFlow – Krench Chicken
 */

import React, { useState, useEffect, useContext } from 'react';
import dayjs from 'dayjs';
import utc      from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import WeeklyCalendarView    from '../../components/schedule/WeeklyCalendarView';
import CalendarView          from '../../components/schedule/CalendarView';
import ContentLibrarySidebar from '../../components/schedule/ContentLibrarySidebar';
import MediaUploader         from '../../components/media/MediaUploader';
import MediaPreview          from '../../components/media/MediaPreview';
import { useSchedule }       from '../../hooks/useSchedule';
import AuthContext           from '../../context/AuthContext';
import {
  toDatetimeLocal,
  datetimeLocalToUTCiso,
  fLongDateTime,
  TZ,
} from '../../utils/formatDate';
import { fetchMediaBySchedule } from '../../services/mediaService';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { label: 'Draft',     cls: 'bg-zinc-100 text-zinc-600' },
  planned:   { label: 'Planned',   cls: 'bg-blue-50 text-blue-600' },
  scheduled: { label: 'Scheduled', cls: 'bg-amber-50 text-amber-600' },
  uploaded:  { label: 'Uploaded',  cls: 'bg-purple-50 text-purple-600' },
  published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-600' },
  failed:    { label: 'Failed',    cls: 'bg-red-50 text-red-600' },
};

// ─── Create/Edit Modal ────────────────────────────────────────
const ScheduleModal = ({ mode, initial = {}, initialDate, initialHour, onClose, onSave, loading, error }) => {
  const defaultTime = initialHour != null
    ? `${initialDate}T${String(initialHour).padStart(2,'0')}:00`
    : initialDate ? `${initialDate}T10:00` : '';

  const [form, setForm] = useState({
    title:       initial.custom_caption || initial.title || '',
    caption:     initial.custom_caption || '',
    hashtags:    (initial.custom_hashtags || []).join(' '),
    scheduled_at: initial.scheduled_at ? toDatetimeLocal(initial.scheduled_at) : defaultTime,
    priority:    initial.priority_order || initial.priority || 0,
    auto_publish: initial.auto_publish !== false,
    privacy_level: initial.privacy_level || 'PUBLIC_TO_EVERYONE',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title:        form.title.trim(),
      caption:      form.caption.trim() || null,
      hashtags:     form.hashtags.split(/\s+/).filter(h => h.startsWith('#') && h.length > 1),
      scheduled_at: form.scheduled_at ? datetimeLocalToUTCiso(form.scheduled_at) : null,
      priority:     parseInt(form.priority, 10) || 0,
      auto_publish: form.auto_publish,
      privacy_level: form.privacy_level,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-syne font-bold text-lg text-zinc-800">
            {mode === 'create' ? '+ New Post' : 'Edit Post'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Post Title *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required
              placeholder="e.g. Weekend Promo Krench Chicken"
              className="w-full h-10 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-pink-400 transition-colors"/>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">TikTok Caption</label>
            <textarea value={form.caption} onChange={e => set('caption', e.target.value)} rows={3}
              placeholder="Write your TikTok caption here…"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-pink-400 transition-colors resize-none"/>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Hashtags</label>
            <input type="text" value={form.hashtags} onChange={e => set('hashtags', e.target.value)}
              placeholder="#krenchChicken #friedchicken #bogor"
              className="w-full h-10 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-pink-400 transition-colors"/>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              Publish Date & Time <span className="text-zinc-400 font-normal">(WIB / Jakarta)</span>
            </label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm focus:outline-none focus:border-pink-400 transition-colors [color-scheme:light]"/>
            <p className="text-[10px] text-zinc-400 mt-1">Leave empty to save as draft</p>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Privacy</label>
              <select value={form.privacy_level} onChange={e => set('privacy_level', e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm focus:outline-none focus:border-pink-400 transition-colors">
                <option value="PUBLIC_TO_EVERYONE">Public</option>
                <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                <option value="SELF_ONLY">Private</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.auto_publish} onChange={e => set('auto_publish', e.target.checked)}
                  className="w-4 h-4 rounded accent-pink-500"/>
                <span className="text-xs font-semibold text-zinc-500">Auto-publish</span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-zinc-200 text-zinc-500 hover:text-zinc-700 text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-10 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-pink-200">
              {loading ? 'Saving…' : mode === 'create' ? 'Create Post' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────
const DetailModal = ({ schedule, onClose, onEdit, onDelete, onMediaUpload, onMediaDeleted, assets, loadingAssets, canEdit }) => {
  const cfg = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.draft;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.cls}`}>
                {cfg.label}
              </span>
              {schedule.auto_publish && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Auto
                </span>
              )}
            </div>
            <h2 className="font-syne font-bold text-lg text-zinc-800 truncate">
              {schedule.custom_caption || schedule.title || 'Untitled'}
            </h2>
            {schedule.scheduled_at && (
              <p className="text-xs text-zinc-400 mt-0.5">🗓 {fLongDateTime(schedule.scheduled_at)}</p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {schedule.custom_hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {schedule.custom_hashtags.map(h => (
                <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{h}</span>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Media</p>
            {loadingAssets ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-3">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Loading media…
              </div>
            ) : <MediaPreview assets={assets} />}

            {canEdit && schedule.status !== 'published' && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Upload Media</p>
                <MediaUploader scheduleId={schedule.id} existingAssets={[]}
                  onUploadComplete={onMediaUpload} onAssetDeleted={onMediaDeleted} />
              </div>
            )}
          </div>

          <div className="text-[11px] text-zinc-400 border-t border-zinc-100 pt-3 space-y-0.5">
            <p>Created by: <span className="text-zinc-600">{schedule.created_by_name || '—'}</span></p>
            <p>Platform: <span className="text-zinc-600 uppercase">{schedule.platform || 'TikTok'}</span></p>
            <p>Privacy: <span className="text-zinc-600">{schedule.privacy_level?.replace(/_/g,' ') || 'Public'}</span></p>
          </div>
        </div>

        {canEdit && schedule.status !== 'published' && (
          <div className="flex gap-3 px-6 py-4 border-t border-zinc-100">
            <button onClick={() => onDelete(schedule.id)}
              className="h-9 px-4 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-xs font-semibold transition-colors">
              Delete
            </button>
            <button onClick={() => onEdit(schedule)}
              className="flex-1 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors">
              Edit Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────
const CalendarPage = () => {
  const authCtx  = useContext(AuthContext);
  const user     = authCtx?.user;
  const roleName = user?.roleName || user?.role_name;
  const canEdit  = ['marketing_staff', 'admin'].includes(roleName);

  const {
    year, month,
    schedules, schedulesByDate,
    drafts,
    loading, error,
    prevMonth, nextMonth, goToToday,
    loadMonth,
    addSchedule, editSchedule, removeSchedule, dragDrop,
  } = useSchedule();

  const [view,           setView]           = useState('week'); // 'week' | 'month'
  const [modal,          setModal]          = useState(null);
  const [activeDate,     setActiveDate]     = useState(null);
  const [activeHour,     setActiveHour]     = useState(null);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [assets,         setAssets]         = useState([]);
  const [loadingAssets,  setLoadingAssets]  = useState(false);
  const [formLoading,    setFormLoading]    = useState(false);
  const [formError,      setFormError]      = useState(null);

  // Current week start (Monday WIB)
  const [weekStart, setWeekStart] = useState(() => {
    const today = dayjs().tz(TZ);
    const dow   = today.day(); // 0=Sun
    const diff  = dow === 0 ? -6 : 1 - dow;
    return today.add(diff, 'day').startOf('day');
  });

  useEffect(() => {
    if (modal === 'detail' && activeSchedule) {
      setLoadingAssets(true);
      fetchMediaBySchedule(activeSchedule.id)
        .then(r => setAssets(r.data?.data?.assets || []))
        .catch(() => setAssets([]))
        .finally(() => setLoadingAssets(false));
    }
  }, [modal, activeSchedule?.id]);

  const prevWeek = () => setWeekStart(w => w.subtract(7, 'day'));
  const nextWeek = () => setWeekStart(w => w.add(7, 'day'));
  const goToThisWeek = () => {
    const today = dayjs().tz(TZ);
    const dow   = today.day();
    const diff  = dow === 0 ? -6 : 1 - dow;
    setWeekStart(today.add(diff, 'day').startOf('day'));
    goToToday();
  };

  const weekEnd = weekStart.add(6, 'day');
  const weekLabel = weekStart.format('MMM D') + ' – ' + weekEnd.format('MMM D, YYYY');

  const handleSlotClick = (dateISO, hour) => {
    if (!canEdit) return;
    setActiveDate(dateISO);
    setActiveHour(hour);
    setFormError(null);
    setModal('create');
  };

  const handleCardClick = (schedule) => {
    setActiveSchedule(schedule);
    setAssets([]);
    setModal('detail');
  };

  const handleDrop = async (scheduleId, dateISO, hour = 10) => {
    if (!canEdit) return;
    try {
      await dragDrop(scheduleId, dateISO, `${String(hour).padStart(2,'0')}:00`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to move');
    }
  };

  const handleCreateSave = async (payload) => {
    setFormLoading(true); setFormError(null);
    try { await addSchedule(payload); setModal(null); }
    catch (err) { setFormError(err.response?.data?.message || 'Failed to create'); }
    finally { setFormLoading(false); }
  };

  const handleEditSave = async (payload) => {
    if (!activeSchedule) return;
    setFormLoading(true); setFormError(null);
    try { await editSchedule(activeSchedule.id, payload); setModal(null); }
    catch (err) { setFormError(err.response?.data?.message || 'Failed to update'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule and all its media?')) return;
    try { await removeSchedule(id); setModal(null); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  const handleMediaUpload = (newAssets) => {
    setAssets(prev => [...prev, ...newAssets]);
    loadMonth();
  };

  return (
    <div className="flex h-screen bg-[#111] overflow-hidden font-dm-sans">

      {/* ── Left: Content Library Sidebar ── */}
      <ContentLibrarySidebar
        drafts={drafts}
        schedules={schedules}
        onEdit={(s) => { setActiveSchedule(s); setFormError(null); setModal('edit'); }}
        onDelete={handleDelete}
      />

      {/* ── Right: Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {/* Top nav bar */}
        <header className="flex items-center gap-4 px-5 py-3 border-b border-zinc-200 bg-white flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048"/>
              </svg>
            </div>
            <span className="font-syne font-bold text-base text-zinc-800">Lead<span className="text-pink-500">flow</span></span>
          </div>

          {/* Subtitle */}
          <span className="text-xs text-zinc-400 hidden md:block">Restaurant Marketing Scheduler</span>

          <div className="flex items-center gap-2 ml-auto">
            {/* Today */}
            <button onClick={goToThisWeek}
              className="px-3 h-8 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
              Today
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
              {['Day','Week','Month'].map(v => (
                <button key={v} onClick={() => setView(v.toLowerCase())}
                  className={`px-3 h-7 rounded-md text-xs font-semibold transition-all
                    ${view === v.toLowerCase() ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  {v}
                </button>
              ))}
            </div>

            {/* Week navigation */}
            <button onClick={view === 'week' ? prevWeek : prevMonth}
              className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <span className="text-sm font-semibold text-zinc-700 min-w-[200px] text-center">
              {view === 'week'
                ? weekLabel
                : view === 'day'
                ? dayjs().tz(TZ).format('dddd, MMMM D, YYYY')
                : dayjs(new Date(year, month-1)).format('MMMM YYYY')}
            </span>

            <button onClick={view === 'week' ? nextWeek : nextMonth}
              className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            {/* Action icons */}
            {[
              { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', title: 'Profile' },
              { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', title: 'Messages' },
              { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', title: 'AI' },
              { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Analytics' },
              { icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', title: 'Team' },
            ].map(({ icon, title }) => (
              <button key={title} title={title}
                className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon}/>
                </svg>
              </button>
            ))}

            {/* New Post button */}
            {canEdit && (
              <button onClick={() => { setActiveDate(null); setActiveHour(null); setFormError(null); setModal('create'); }}
                className="flex items-center gap-1.5 px-4 h-8 rounded-lg bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold transition-colors shadow-lg shadow-pink-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                New Post
              </button>
            )}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-500">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Calendar content */}
        <div className="flex-1 overflow-hidden">
          {(view === 'week' || view === 'day') ? (
            <WeeklyCalendarView
              weekStart={weekStart}
              schedulesByDate={schedulesByDate}
              onDrop={handleDrop}
              onSlotClick={handleSlotClick}
              onCardClick={handleCardClick}
              loading={loading}
              mode={view}
              selectedDay={view === 'day' ? dayjs().tz(TZ) : undefined}
            />
          ) : (
            <div className="p-4 h-full overflow-auto bg-white">
              <CalendarView
                year={year}
                month={month}
                schedulesByDate={schedulesByDate}
                onDrop={(id, iso) => handleDrop(id, iso)}
                onDayClick={(iso) => handleSlotClick(iso, 10)}
                onCardClick={handleCardClick}
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'create' && canEdit && (
        <ScheduleModal mode="create" initialDate={activeDate} initialHour={activeHour}
          onClose={() => setModal(null)} onSave={handleCreateSave}
          loading={formLoading} error={formError} />
      )}
      {modal === 'edit' && activeSchedule && canEdit && (
        <ScheduleModal mode="edit" initial={activeSchedule}
          onClose={() => setModal('detail')} onSave={handleEditSave}
          loading={formLoading} error={formError} />
      )}
      {modal === 'detail' && activeSchedule && (
        <DetailModal schedule={activeSchedule} assets={assets} loadingAssets={loadingAssets}
          onClose={() => setModal(null)}
          onEdit={(s) => { setActiveSchedule(s); setFormError(null); setModal('edit'); }}
          onDelete={handleDelete}
          onMediaUpload={handleMediaUpload}
          onMediaDeleted={(id) => setAssets(prev => prev.filter(a => a.id !== id))}
          canEdit={canEdit} />
      )}
    </div>
  );
};

export default CalendarPage;