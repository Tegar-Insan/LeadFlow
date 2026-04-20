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

import WeeklyCalendarView    from '../../components/Schedule/WeeklyCalendarView';
import CalendarView          from '../../components/Schedule/CalendarView';
import ContentLibrarySidebar from '../../components/Schedule/ContentLibrarySidebar';
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
import { fetchMediaBySchedule, uploadMedia } from '../../services/mediaService';
import AIChatbot from '../../components/common/AIChatbot';
import TikTokLoginButton from '../../components/common/TikTokLoginButton';
import { useNotification } from '../../context/NotificationContext';
import { getTikTokAuthUrl, getTikTokStatus, disconnectTikTok } from '../../services/tiktokService';

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
const EMPTY_POST_SLOT = () => ({
  title: '', caption: '', hashtags: '',
  mediaType: 'photo', mediaFiles: [], mediaPreviews: [], mediaDropOver: false,
});

const ScheduleModal = ({ mode, initial = {}, initialDate, initialHour, onClose, onSave, loading, error }) => {
  const defaultTime = initialHour != null
    ? `${initialDate}T${String(initialHour).padStart(2,'0')}:00`
    : initialDate ? `${initialDate}T10:00` : '';

  // ── Bulk count (create-only) ────────────────────────────────
  const [postCount, setPostCount] = useState(1);
  const [activeTab, setActiveTab] = useState(0);

  // ── Per-post state array ────────────────────────────────────
  const [posts, setPosts] = useState(() => [
    mode === 'edit'
      ? {
          ...EMPTY_POST_SLOT(),
          title:    initial.custom_caption || initial.title || '',
          caption:  initial.custom_caption || '',
          hashtags: (initial.custom_hashtags || []).join(' '),
        }
      : EMPTY_POST_SLOT(),
  ]);

  // ── Shared state ────────────────────────────────────────────
  const [shared, setShared] = useState({
    scheduled_at:  initial.scheduled_at ? toDatetimeLocal(initial.scheduled_at) : defaultTime,
    priority:      initial.priority_order || initial.priority || 0,
    auto_publish:  initial.auto_publish !== false,
    privacy_level: initial.privacy_level || 'PUBLIC_TO_EVERYONE',
  });
  const [dateError, setDateError] = useState(null);

  // ── Hidden file inputs — one per slot (array ref, no hook-in-loop) ──
  const mediaInputRef = React.useRef([]);

  const formatBytes = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  // ── Resize posts array when count changes ───────────────────
  const changeCount = (n) => {
    setPostCount(n);
    setPosts(prev => {
      if (n > prev.length) {
        return [...prev, ...Array(n - prev.length).fill(null).map(() => EMPTY_POST_SLOT())];
      }
      // Revoke URLs for removed slots
      prev.slice(n).forEach(p => p.mediaPreviews.forEach(u => URL.revokeObjectURL(u)));
      return prev.slice(0, n);
    });
    if (activeTab >= n) setActiveTab(n - 1);
  };

  // ── Per-post helpers ────────────────────────────────────────
  const setPostField = (idx, field, value) =>
    setPosts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const switchMediaType = (idx, t) => {
    setPosts(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      p.mediaPreviews.forEach(u => URL.revokeObjectURL(u));
      return { ...p, mediaType: t, mediaFiles: [], mediaPreviews: [] };
    }));
  };

  const addMediaFiles = (idx, rawFiles) => {
    const p    = posts[idx];
    const arr  = Array.from(rawFiles);
    if (p.mediaType === 'video') {
      const mp4 = arr.find(f => f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4'));
      if (!mp4) { alert('Please select an MP4 video file.'); return; }
      if (mp4.size > 50 * 1024 * 1024) { alert('Video must be ≤ 50 MB.'); return; }
      p.mediaPreviews.forEach(u => URL.revokeObjectURL(u));
      setPosts(prev => prev.map((pp, i) => i !== idx ? pp
        : { ...pp, mediaFiles: [mp4], mediaPreviews: [URL.createObjectURL(mp4)] }));
    } else {
      const valid = arr.filter(f => {
        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
          alert(`${f.name} is not JPG or PNG.`); return false;
        }
        if (f.size > 50 * 1024 * 1024) { alert(`${f.name} exceeds 50 MB.`); return false; }
        return true;
      });
      if (!valid.length) return;
      setPosts(prev => prev.map((pp, i) => i !== idx ? pp : {
        ...pp,
        mediaFiles:    [...pp.mediaFiles, ...valid],
        mediaPreviews: [...pp.mediaPreviews, ...valid.map(f => URL.createObjectURL(f))],
      }));
    }
  };

  const removeMediaFile = (idx, fileIdx) => {
    setPosts(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      URL.revokeObjectURL(p.mediaPreviews[fileIdx]);
      return {
        ...p,
        mediaFiles:    p.mediaFiles.filter((_, j) => j !== fileIdx),
        mediaPreviews: p.mediaPreviews.filter((_, j) => j !== fileIdx),
      };
    }));
  };

  const setSharedField = (k, v) => {
    setShared(s => ({ ...s, [k]: v }));
    if (k === 'scheduled_at') setDateError(null);
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (shared.scheduled_at) {
      const wib = dayjs.tz(shared.scheduled_at, TZ);
      if (wib.isBefore(dayjs().tz(TZ))) {
        setDateError('Cannot schedule in the past. Please choose a future date and time (WIB).');
        return;
      }
    }
    const basePayload = (p) => ({
      title:         p.title.trim(),
      caption:       p.caption.trim() || null,
      hashtags:      p.hashtags.split(/\s+/).filter(h => h.startsWith('#') && h.length > 1),
      scheduled_at:  shared.scheduled_at ? datetimeLocalToUTCiso(shared.scheduled_at) : null,
      priority:      parseInt(shared.priority, 10) || 0,
      auto_publish:  shared.auto_publish,
      privacy_level: shared.privacy_level,
    });

    if (mode === 'edit') {
      // Edit keeps old single-item signature: (payload, files)
      onSave(basePayload(posts[0]), posts[0].mediaFiles);
    } else {
      // Create uses bulk array: [{ payload, files }, ...]
      onSave(posts.map(p => ({ payload: basePayload(p), files: p.mediaFiles })));
    }
  };

  // ── Per-post media panel (reused for each tab) ──────────────
  const PostMediaPanel = ({ idx }) => {
    const p = posts[idx];
    return (
      <div className="border-t border-surface-border pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-body font-semibold text-text-secondary">
            Media <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <div className="flex items-center bg-surface-overlay rounded-lg p-0.5 border border-surface-border">
            {['photo','video'].map(t => (
              <button key={t} type="button" onClick={() => switchMediaType(idx, t)}
                className={`px-2.5 h-6 rounded-md text-[11px] font-body font-semibold transition-all
                  ${p.mediaType === t ? 'bg-surface-raised text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                {t === 'photo' ? '📷 Photos' : '🎬 Video'}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        {!(p.mediaType === 'video' && p.mediaFiles.length > 0) && (
          <div
            onDragOver={e => { e.preventDefault(); setPostField(idx, 'mediaDropOver', true); }}
            onDragLeave={() => setPostField(idx, 'mediaDropOver', false)}
            onDrop={e => { e.preventDefault(); setPostField(idx, 'mediaDropOver', false); addMediaFiles(idx, e.dataTransfer.files); }}
            onClick={() => mediaInputRef.current[idx]?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
              ${p.mediaDropOver ? 'border-brand bg-brand/[0.06]' : 'border-surface-border hover:border-white/20 hover:bg-white/[0.02]'}`}
          >
            <input
              ref={el => mediaInputRef.current[idx] = el}
              type="file"
              className="hidden"
              accept={p.mediaType === 'video' ? '.mp4,video/mp4' : '.jpg,.jpeg,.png,image/jpeg,image/png'}
              multiple={p.mediaType === 'photo'}
              onChange={e => { addMediaFiles(idx, e.target.files); e.target.value = ''; }}
            />
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl">{p.mediaDropOver ? '⬇️' : p.mediaType === 'video' ? '🎬' : '🖼️'}</span>
              <p className="text-xs font-semibold text-text-secondary font-body">
                {p.mediaDropOver ? 'Drop here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-[10px] text-text-muted font-body">
                {p.mediaType === 'video' ? 'MP4 only · max 50 MB · 1 video' : 'JPG or PNG · max 50 MB each · multiple allowed'}
              </p>
            </div>
          </div>
        )}

        {/* Previews */}
        {p.mediaPreviews.length > 0 && (
          <div className={`grid gap-2 ${p.mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {p.mediaPreviews.map((url, fi) => (
              <div key={fi} className="relative group rounded-lg overflow-hidden bg-zinc-800 border border-white/10">
                {p.mediaType === 'video'
                  ? <video src={url} className="w-full h-32 object-cover" muted playsInline />
                  : <img src={url} alt={`p${idx}-f${fi}`} className="w-full h-24 object-cover" />}
                <button type="button" onClick={() => removeMediaFile(idx, fi)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 px-1.5 py-1">
                  <p className="text-[9px] text-white truncate">{p.mediaFiles[fi]?.name}</p>
                  <p className="text-[9px] text-zinc-400">{formatBytes(p.mediaFiles[fi]?.size)}</p>
                </div>
                {p.mediaType === 'photo' && p.mediaPreviews.length > 1 && (
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 text-white text-[9px] font-bold flex items-center justify-center">
                    {fi + 1}
                  </div>
                )}
              </div>
            ))}
            {p.mediaType === 'photo' && (
              <div onClick={() => mediaInputRef.current[idx]?.click()}
                className="h-24 rounded-lg border-2 border-dashed border-surface-border hover:border-white/20 flex flex-col items-center justify-center cursor-pointer transition-colors gap-1">
                <span className="text-lg text-text-muted">+</span>
                <span className="text-[10px] text-text-muted font-body">Add more</span>
              </div>
            )}
          </div>
        )}
        {p.mediaFiles.length > 0 && (
          <p className="text-[10px] text-text-muted font-body">
            {p.mediaType === 'video' ? '1 video selected' : `${p.mediaFiles.length} photo${p.mediaFiles.length > 1 ? 's' : ''} selected`}
            {' — will upload after save'}
          </p>
        )}
      </div>
    );
  };

  const isCreate = mode === 'create';
  const totalFiles = posts.reduce((s, p) => s + p.mediaFiles.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-raised rounded-2xl shadow-2xl overflow-hidden border border-surface-border">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="font-headline font-bold text-lg text-text-primary">
              {isCreate ? 'Manage Content Queue' : 'Edit Post'}
            </h2>
            {isCreate && (
              <p className="text-[11px] text-text-muted font-body mt-0.5">Schedule multiple posts at the same time</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto">

          {/* ── Post Count Selector (create-only) ── */}
          {isCreate && (
            <div className="px-6 pt-4 pb-3 border-b border-surface-border">
              <p className="text-xs font-body font-semibold text-text-secondary mb-2">
                How many posts to queue?
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => changeCount(n)}
                    className={`w-9 h-9 rounded-lg text-sm font-headline font-bold transition-all border
                      ${postCount === n
                        ? 'bg-brand text-black border-brand shadow-[0_0_10px_rgba(246,183,10,0.2)]'
                        : 'bg-white/[0.04] text-text-secondary border-white/[0.08] hover:border-brand/50 hover:text-text-primary'}`}
                  >
                    {n}
                  </button>
                ))}
                <span className="text-xs text-text-muted font-body ml-1">
                  {postCount === 1 ? 'Single post' : `${postCount} posts at once`}
                </span>
              </div>
            </div>
          )}

          {/* ── Post Tabs (when count > 1) ── */}
          {isCreate && postCount > 1 && (
            <div className="flex items-center gap-1 px-6 pt-3 pb-0 overflow-x-auto">
              {posts.map((p, i) => {
                const hasContent = p.title.trim() || p.mediaFiles.length > 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-t-lg text-xs font-headline font-semibold whitespace-nowrap transition-all border-b-2
                      ${activeTab === i
                        ? 'bg-surface-overlay text-text-primary border-brand'
                        : 'text-text-muted hover:text-text-secondary border-transparent hover:bg-surface-overlay/50'}`}
                  >
                    <span>Post {i + 1}</span>
                    {hasContent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="px-6 py-5 space-y-4">
            {/* ── Per-post fields (active tab only) ── */}
            <div>
              {postCount > 1 && (
                <p className="text-[11px] font-body font-semibold text-brand uppercase tracking-widest mb-3">
                  Post {activeTab + 1} of {postCount}
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">
                    Post Title {postCount === 1 ? '*' : `(Post ${activeTab + 1})`}
                  </label>
                  <input
                    type="text"
                    value={posts[activeTab].title}
                    onChange={e => setPostField(activeTab, 'title', e.target.value)}
                    required={activeTab === 0}
                    placeholder="e.g. Weekend Promo Krench Chicken"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">TikTok Caption</label>
                  <textarea
                    value={posts[activeTab].caption}
                    onChange={e => setPostField(activeTab, 'caption', e.target.value)}
                    rows={3}
                    placeholder="Write your TikTok caption here…"
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Hashtags</label>
                  <input
                    type="text"
                    value={posts[activeTab].hashtags}
                    onChange={e => setPostField(activeTab, 'hashtags', e.target.value)}
                    placeholder="#krenchChicken #friedchicken #bogor"
                    className="input-field"
                  />
                </div>

                <PostMediaPanel idx={activeTab} />
              </div>
            </div>

            {/* ── Shared fields ── */}
            <div className={`space-y-4 ${postCount > 1 ? 'border-t border-surface-border pt-4' : ''}`}>
              {postCount > 1 && (
                <p className="text-[11px] font-body font-semibold text-text-muted uppercase tracking-widest">
                  Shared Settings — applies to all {postCount} posts
                </p>
              )}

              <div>
                <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">
                  Publish Date & Time <span className="text-text-muted font-normal">(WIB / Jakarta)</span>
                </label>
                <input
                  type="datetime-local"
                  value={shared.scheduled_at}
                  onChange={e => setSharedField('scheduled_at', e.target.value)}
                  className={`input-field [color-scheme:dark] ${dateError ? 'border-brand' : ''}`}
                />
                {dateError
                  ? <p className="text-[10px] text-brand mt-1">{dateError}</p>
                  : <p className="text-[10px] text-text-muted mt-1">Leave empty to save as draft</p>
                }
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Privacy</label>
                  <select
                    value={shared.privacy_level}
                    onChange={e => setSharedField('privacy_level', e.target.value)}
                    className="input-field"
                  >
                    <option value="PUBLIC_TO_EVERYONE">Public</option>
                    <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                    <option value="SELF_ONLY">Private</option>
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shared.auto_publish}
                      onChange={e => setSharedField('auto_publish', e.target.checked)}
                      className="w-4 h-4 rounded accent-brand"
                    />
                    <span className="text-xs font-body font-semibold text-text-secondary">Auto-publish</span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 font-body">{error}</p>
            )}

            {/* ── Post progress indicator (bulk only) ── */}
            {isCreate && postCount > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {posts.map((p, i) => (
                  <div key={i} onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-body cursor-pointer transition-colors
                      ${i === activeTab ? 'bg-brand/20 text-brand' : 'bg-surface-overlay text-text-muted hover:text-text-secondary'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.title.trim() ? 'bg-green-400' : 'bg-surface-border'}`}/>
                    Post {i + 1}
                    {p.title.trim() && <span className="truncate max-w-[60px]">· {p.title.trim()}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 h-10">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 h-10">
                {loading
                  ? (totalFiles > 0 ? 'Saving & uploading…' : `Creating ${postCount > 1 ? postCount + ' posts' : ''}…`)
                  : mode === 'create'
                    ? postCount === 1 ? 'Create Post' : `Create ${postCount} Posts`
                    : 'Save Changes'}
              </button>
            </div>
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
            <h2 className="font-headline font-bold text-lg text-text-primary truncate">
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

  // ── TikTok connect state ────────────────────────────────────
  const { toast }                         = useNotification();
  const [tiktokStatus,  setTiktokStatus]  = useState(null);  // null=unknown, object=connected, false=not connected
  const [tiktokLoading, setTiktokLoading] = useState(false);

  // Fetch TikTok connection status on mount
  useEffect(() => {
    if (!canEdit) return;
    getTikTokStatus()
      .then(row => setTiktokStatus(row || false))
      .catch(() => setTiktokStatus(false));
  }, [canEdit]);

  const handleConnectTikTok = async () => {
    setTiktokLoading(true);
    try {
      const { url } = await getTikTokAuthUrl();
      window.location.href = url;
    } catch {
      toast.error('Failed to start TikTok login');
      setTiktokLoading(false);
    }
  };

  const handleDisconnectTikTok = async () => {
    if (!window.confirm('Disconnect TikTok account?')) return;
    try {
      await disconnectTikTok();
      setTiktokStatus(false);
      toast.success('TikTok disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };
  // ────────────────────────────────────────────────────────────

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
    // Block creation on past dates
    const slotDay = dayjs.tz(dateISO, TZ).startOf('day');
    const today   = dayjs().tz(TZ).startOf('day');
    if (slotDay.isBefore(today)) return;
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
    // Block drop onto past dates
    const dropDay = dayjs.tz(dateISO, TZ).startOf('day');
    const today   = dayjs().tz(TZ).startOf('day');
    if (dropDay.isBefore(today)) {
      alert('Cannot move a post to a past date.');
      return;
    }
    try {
      await dragDrop(scheduleId, dateISO, `${String(hour).padStart(2,'0')}:00`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to move');
    }
  };

  // postsArray: [{ payload, files }]  (bulk create — always an array, even for 1 post)
  const handleCreateSave = async (postsArray) => {
    setFormLoading(true); setFormError(null);
    let needReload = false;
    try {
      for (const { payload, files = [] } of postsArray) {
        const s = await addSchedule(payload);
        if (files.length > 0) {
          await uploadMedia(s.id, files);
          needReload = true;
        }
      }
      if (needReload) loadMonth();
      setModal(null);
    }
    catch (err) { setFormError(err.response?.data?.message || 'Failed to create'); }
    finally { setFormLoading(false); }
  };

  const handleEditSave = async (payload, files = []) => {
    if (!activeSchedule) return;
    setFormLoading(true); setFormError(null);
    try {
      await editSchedule(activeSchedule.id, payload);
      if (files.length > 0) {
        await uploadMedia(activeSchedule.id, files);
        loadMonth();
      }
      setModal(null);
    }
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
          <div className="flex items-center mr-2">
            <img src="/logo.png" alt="Krench Chicken" className="h-8 w-auto object-contain" />
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

            {/* TikTok connect button */}
            {canEdit && (
              <TikTokLoginButton
                connected={!!tiktokStatus}
                accountName={tiktokStatus?.tiktok_display_name || tiktokStatus?.tiktok_account_name}
                onConnect={handleConnectTikTok}
                onDisconnect={handleDisconnectTikTok}
                loading={tiktokLoading}
              />
            )}

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

      {/* ── AI Chatbot FAB — bottom-right floating ── */}
      <AIChatbot />
    </div>
  );
};

export default CalendarPage;