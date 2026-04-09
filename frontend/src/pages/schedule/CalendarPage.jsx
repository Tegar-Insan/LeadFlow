/**
 * CalendarPage.jsx — Complete redesign
 * Weekly time-slot calendar with Content Library sidebar
 * Matches reference UI: left panel + weekly grid + top nav
 * LeadFlow – Krench Chicken
 */

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  draft:     { label: 'Draft',     cls: 'status-draft' },
  planned:   { label: 'Planned',   cls: 'status-draft' },
  scheduled: { label: 'Scheduled', cls: 'status-scheduled' },
  uploaded:  { label: 'Uploaded',  cls: 'status-scheduled' },
  published: { label: 'Published', cls: 'status-live' },
  failed:    { label: 'Failed',    cls: 'status-failed' },
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
  const [dateError, setDateError] = useState(null);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'scheduled_at') setDateError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Guard: reject past dates (WIB) before hitting the API
    if (form.scheduled_at) {
      const scheduledWIB = dayjs.tz(form.scheduled_at, TZ);
      if (scheduledWIB.isBefore(dayjs().tz(TZ))) {
        setDateError('Cannot schedule in the past. Please choose a future date and time (WIB).');
        return;
      }
    }

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
      <div className="w-full max-w-lg bg-surface-raised rounded-2xl shadow-2xl overflow-hidden border border-surface-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-display font-bold text-lg text-text-primary">
            {mode === 'create' ? '+ New Post' : 'Edit Post'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Post Title *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required
              placeholder="e.g. Weekend Promo Krench Chicken"
              className="input-field"/>
          </div>

          <div>
            <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">TikTok Caption</label>
            <textarea value={form.caption} onChange={e => set('caption', e.target.value)} rows={3}
              placeholder="Write your TikTok caption here…"
              className="input-field resize-none"/>
          </div>

          <div>
            <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Hashtags</label>
            <input type="text" value={form.hashtags} onChange={e => set('hashtags', e.target.value)}
              placeholder="#krenchChicken #friedchicken #bogor"
              className="input-field"/>
          </div>

          <div>
            <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">
              Publish Date & Time <span className="text-text-muted font-normal">(WIB / Jakarta)</span>
            </label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
              className={`input-field [color-scheme:dark] ${dateError ? 'border-brand' : ''}`}/>
            {dateError
              ? <p className="text-[10px] text-brand mt-1">{dateError}</p>
              : <p className="text-[10px] text-text-muted mt-1">Leave empty to save as draft</p>
            }
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Privacy</label>
              <select value={form.privacy_level} onChange={e => set('privacy_level', e.target.value)}
                className="input-field">
                <option value="PUBLIC_TO_EVERYONE">Public</option>
                <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                <option value="SELF_ONLY">Private</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.auto_publish} onChange={e => set('auto_publish', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand"/>
                <span className="text-xs font-body font-semibold text-text-secondary">Auto-publish</span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 font-body">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1 h-10">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 h-10">
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
      <div className="w-full max-w-xl bg-surface-raised rounded-2xl shadow-2xl overflow-hidden border border-surface-border">
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={cfg.cls}>{cfg.label}</span>
              {schedule.auto_publish && (
                <span className="status-live flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Auto
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-lg text-text-primary truncate">
              {schedule.custom_caption || schedule.title || 'Untitled'}
            </h2>
            {schedule.scheduled_at && (
              <p className="text-xs text-text-secondary font-body mt-0.5">{fLongDateTime(schedule.scheduled_at)}</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {schedule.custom_hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {schedule.custom_hashtags.map(h => (
                <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-text-secondary font-body">{h}</span>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest mb-2">Media</p>
            {loadingAssets ? (
              <div className="flex items-center gap-2 text-text-secondary text-sm py-3 font-body">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Loading media…
              </div>
            ) : <MediaPreview assets={assets} />}

            {canEdit && schedule.status !== 'published' && (
              <div className="mt-3">
                <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest mb-2">Upload Media</p>
                <MediaUploader scheduleId={schedule.id} existingAssets={[]}
                  onUploadComplete={onMediaUpload} onAssetDeleted={onMediaDeleted} />
              </div>
            )}
          </div>

          <div className="text-[11px] text-text-muted font-body border-t border-surface-border pt-3 space-y-0.5">
            <p>Created by: <span className="text-text-secondary">{schedule.created_by_name || '—'}</span></p>
            <p>Platform: <span className="text-text-secondary uppercase">{schedule.platform || 'TikTok'}</span></p>
            <p>Privacy: <span className="text-text-secondary">{schedule.privacy_level?.replace(/_/g,' ') || 'Public'}</span></p>
          </div>
        </div>

        {canEdit && schedule.status !== 'published' && (
          <div className="flex gap-3 px-6 py-4 border-t border-surface-border">
            <button onClick={() => onDelete(schedule.id)}
              className="h-9 px-4 rounded-lg border border-brand/30 text-brand hover:bg-brand/10 text-xs font-body font-semibold transition-colors">
              Delete
            </button>
            <button onClick={() => onEdit(schedule)}
              className="flex-1 h-9 btn-primary text-xs">
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
  const navigate  = useNavigate();
  const location  = useLocation();
  const authCtx   = useContext(AuthContext);
  const user      = authCtx?.user;
  const roleName  = user?.roleName || user?.role_name;
  const canEdit   = ['marketing_staff', 'admin'].includes(roleName);

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

  // Auto-open create modal when navigated from Sidebar "Create Post"
  useEffect(() => {
    if (canEdit && location.state?.openCreate) {
      setActiveDate(null);
      setActiveHour(null);
      setFormError(null);
      setModal('create');
      // Clear state so refreshing the page doesn't re-open the modal
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

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
    <div className="flex h-screen bg-surface overflow-hidden font-body">

      {/* ── Left: Content Library Sidebar ── */}
      <ContentLibrarySidebar
        drafts={drafts}
        schedules={schedules}
        onEdit={(s) => { setActiveSchedule(s); setFormError(null); setModal('edit'); }}
        onDelete={handleDelete}
      />

      {/* ── Right: Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-raised">

        {/* Top nav bar */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-surface-border bg-surface-raised flex-shrink-0 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center glow-red">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048"/>
              </svg>
            </div>
            <span className="font-display font-extrabold text-base text-text-primary">Lead<span className="text-brand">Flow</span></span>
          </div>

          {/* Page title */}
          <div className="hidden md:block">
            <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest">Marketing Calendar</p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Today */}
            <button onClick={goToThisWeek}
              className="px-3 h-8 rounded-lg border border-surface-border text-xs font-body font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors">
              Today
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-surface-overlay rounded-lg p-0.5 border border-surface-border">
              {['Day','Week','Month'].map(v => (
                <button key={v} onClick={() => setView(v.toLowerCase())}
                  className={`px-3 h-7 rounded-md text-xs font-body font-semibold transition-all
                    ${view === v.toLowerCase()
                      ? 'bg-surface-raised text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'}`}>
                  {v}
                </button>
              ))}
            </div>

            {/* Week navigation */}
            <button onClick={view === 'week' ? prevWeek : prevMonth}
              className="w-8 h-8 rounded-lg border border-surface-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <span className="text-sm font-body font-semibold text-text-primary min-w-[200px] text-center">
              {view === 'week'
                ? weekLabel
                : view === 'day'
                ? dayjs().tz(TZ).format('dddd, MMMM D, YYYY')
                : dayjs(new Date(year, month-1)).format('MMMM YYYY')}
            </span>

            <button onClick={view === 'week' ? nextWeek : nextMonth}
              className="w-8 h-8 rounded-lg border border-surface-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            {/* New Post button */}
            {canEdit && (
              <button onClick={() => { setActiveDate(null); setActiveHour(null); setFormError(null); setModal('create'); }}
                className="btn-primary px-4 h-8 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                New Post
              </button>
            )}

            {/* Profile button */}
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-lg border border-surface-border flex items-center justify-center text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
              title="Profile"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-brand/10 border border-brand/20 text-sm text-brand font-body">
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
            <div className="p-4 h-full overflow-auto bg-surface-raised">
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