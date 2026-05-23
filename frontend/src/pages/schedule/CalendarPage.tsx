/**
 * CalendarPage.jsx — Complete redesign
 * Weekly time-slot calendar with Content Library sidebar
 * Matches reference UI: left panel + weekly grid + top nav
 * LeadFlow – Krench Chicken
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
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
import { fetchMediaBySchedule, uploadMedia, deleteMediaAsset } from '../../services/mediaService';
import AIChatbot from '../../components/common/AIChatbot';
import TikTokLoginButton from '../../components/common/TikTokLoginButton';
import ViewModeToggle from '../../components/Schedule/ViewModeToggle';
import { KineticLoader } from '../../components/common/KineticLoader';
import { useNotification } from '../../context/NotificationContext';
import { getTikTokAuthUrl, getTikTokStatus, disconnectTikTok } from '../../services/tiktokService';
import {
  listComments,
  createComment,
  deleteComment,
} from '../../services/commentsService';

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

const POST_FILTER_OPTIONS = [
  { key: 'allpost', label: 'All Post' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
];

// ─── Create/Edit Modal ────────────────────────────────────────
const EMPTY_POST_SLOT = () => ({
  title: '', caption: '', hashtags: '',
  mediaType: 'photo', mediaFiles: [], mediaPreviews: [], mediaDropOver: false,
});

const ScheduleModal = ({ mode, initial = {}, initialDate, initialHour, onClose, onSave, loading, error }: any) => {
  const defaultTime = initialHour != null
    ? `${initialDate}T${String(initialHour).padStart(2,'0')}:00`
    : initialDate ? `${initialDate}T10:00` : '';
  const fallbackScheduledTime = dayjs().tz(TZ).add(1, 'hour').format('YYYY-MM-DDTHH:mm');

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
  const [publishMode, setPublishMode] = useState(() => {
    if (initial.status === 'published') return 'scheduled';
    if (initial.scheduled_at || defaultTime) return 'scheduled';
    return 'draft';
  });

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

  const addMediaFiles = (idx, rawFiles: FileList | File[] | null | undefined) => {
    const p    = posts[idx];
    const arr: File[]  = Array.from(rawFiles || []) as File[];
    if (p.mediaType === 'video') {
      const mp4 = arr.find((f) => f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4'));
      if (!mp4) { alert('Please select an MP4 video file.'); return; }
      if (mp4.size > 50 * 1024 * 1024) { alert('Video must be ≤ 50 MB.'); return; }
      p.mediaPreviews.forEach(u => URL.revokeObjectURL(u));
      setPosts(prev => prev.map((pp, i) => i !== idx ? pp
        : { ...pp, mediaFiles: [mp4], mediaPreviews: [URL.createObjectURL(mp4)] }));
    } else {
      const valid: File[] = arr.filter((f) => {
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

  const selectPublishMode = (nextMode) => {
    setPublishMode(nextMode);
    setDateError(null);
    if (nextMode === 'scheduled' && !shared.scheduled_at) {
      setShared((s) => ({ ...s, scheduled_at: defaultTime || fallbackScheduledTime }));
    }
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const isDraftMode = publishMode === 'draft';

    if (!isDraftMode && !shared.scheduled_at) {
      setDateError('Publish date & time is required when content is ready to publish.');
      return;
    }

    if (shared.scheduled_at && !isDraftMode) {
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
      scheduled_at:  isDraftMode ? null : (shared.scheduled_at ? datetimeLocalToUTCiso(shared.scheduled_at) : null),
      status:        isDraftMode ? 'draft' : 'scheduled',
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
              onChange={(e) => { addMediaFiles(idx, e.currentTarget.files); e.currentTarget.value = ''; }}
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
              {isCreate ? 'Create Content' : 'Edit Content'} {totalFiles > 0 && `· ${totalFiles} file${totalFiles > 1 ? 's' : ''}`}
            </h2>
            {isCreate && (
              <p className="text-[11px] text-text-muted font-body mt-0.5">Schedule multiple content at the same time</p>
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
                How many content to create?
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
                    <span>content {i + 1}</span>
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
                  content {activeTab + 1} of {postCount}
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">
                    Content Title {postCount === 1 ? '*' : `(Content ${activeTab + 1})`}
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
                <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Save Mode</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectPublishMode('draft')}
                    className={`px-3 h-8 rounded-lg text-xs font-body font-semibold transition-colors ${publishMode === 'draft' ? 'bg-brand text-black' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPublishMode('scheduled')}
                    className={`px-3 h-8 rounded-lg text-xs font-body font-semibold transition-colors ${publishMode === 'scheduled' ? 'bg-brand text-black' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
                  >
                    Ready to Publish
                  </button>
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  Drafts stay out of the calendar until you add a publish time.
                </p>
              </div>

              {publishMode === 'scheduled' && (
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
                    : <p className="text-[10px] text-text-muted mt-1">Choose a future date/time to publish later.</p>
                  }
                </div>
              )}

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
                    ? publishMode === 'draft'
                      ? 'Save Draft'
                      : postCount === 1 ? 'Create Post' : `Create ${postCount} Posts`
                    : publishMode === 'draft'
                      ? 'Save Draft'
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
const DetailModal = ({ schedule, onClose, onEdit, onDelete, onPublish, publishLoading = false, onMediaUpload, onMediaDeleted, onMediaDelete, assets, loadingAssets, canEdit }) => {
  const { toast } = useNotification();
  const authCtx = useContext(AuthContext);
  const currentUserId = authCtx?.user?.userId || authCtx?.user?.id;
  const currentRole = authCtx?.user?.roleName || authCtx?.user?.role_name;
  const cfg = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.draft;
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const canComment = schedule.status !== 'published' && currentRole === 'marketing_staff';

  useEffect(() => {
    setCommentText('');

    let cancelled = false;
    setLoadingComments(true);
    listComments(schedule.id)
      .then((rows) => {
        if (!cancelled) {
          setComments(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load comments');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingComments(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [schedule.id, schedule.status]);

  const handlePostComment = async () => {
    if (!canComment) {
      toast.error('Comments are locked on published schedules');
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed || postingComment) return;

    setPostingComment(true);
    try {
      await createComment(schedule.id, trimmed);
      toast.success('Comment posted');
      setCommentText('');
      const rows = await listComments(schedule.id);
      setComments(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (deletingCommentId) return;
    if (!window.confirm('Delete this comment?')) return;

    setDeletingCommentId(commentId);
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted');
      setComments((prev) => prev.filter((comment) => comment.comment_id !== commentId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[90vh] bg-surface-raised rounded-2xl shadow-2xl overflow-hidden border border-surface-border flex flex-col">
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

        <div className="flex flex-1 max-h-[70vh] overflow-hidden">
          {/* LEFT PANEL — Schedule Details & Media */}
          <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto border-r border-surface-border">
            {schedule.custom_hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {schedule.custom_hashtags.map((h, idx) => (
                  <span key={`${h}-${idx}`} className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-text-secondary font-body">{h}</span>
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
              ) : <MediaPreview assets={assets} onDeleteAsset={canEdit && schedule.status !== 'published' ? onMediaDelete : undefined} />}

              {canEdit && schedule.status !== 'published' && (
                <div className="mt-3">
                  <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest mb-2">Upload Media</p>
                  <MediaUploader scheduleId={schedule.id} existingAssets={[]}
                    onUploadComplete={onMediaUpload} onAssetDeleted={onMediaDeleted} />
                </div>
              )}
            </div>

            <div className="pt-4">
              <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest mb-3">Details</p>
              <div className="text-[11px] text-text-muted font-body space-y-2">
                <p>Created by: <span className="text-text-secondary">{schedule.created_by_name || '—'}</span></p>
                <p>Platform: <span className="text-text-secondary uppercase">{schedule.platform || 'TikTok'}</span></p>
                <p>Privacy: <span className="text-text-secondary">{schedule.privacy_level?.replace(/_/g,' ') || 'Public'}</span></p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Comments Only */}
          <div className="w-72 flex flex-col bg-surface-overlay/50">
            <div className="px-4 py-3 border-b border-surface-border/50">
              <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest">Comments</p>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loadingComments ? (
                  <p className="text-xs text-text-secondary font-body">Loading comments...</p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => {
                    const canDeleteComment = currentRole === 'admin' || comment.author_user_id === currentUserId;
                    const authorInitial = (comment.author_name || comment.author_email || 'U').trim().charAt(0).toUpperCase();
                    return (
                      <div key={comment.comment_id} className="rounded-lg bg-surface-raised px-2.5 py-2 text-xs">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            {comment.author_photo_url ? (
                              <img
                                src={comment.author_photo_url}
                                alt={comment.author_name || comment.author_email || 'Comment author'}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-brand text-black flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {authorInitial}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-text-primary block truncate">
                                {comment.author_name || comment.author_email || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-text-muted">{comment.created_at_wib}</span>
                            </div>
                          </div>
                          {canDeleteComment && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(comment.comment_id)}
                              disabled={deletingCommentId === comment.comment_id}
                              className="text-[10px] text-brand hover:text-brand-light disabled:opacity-60 flex-shrink-0"
                            >
                              {deletingCommentId === comment.comment_id ? '…' : '✕'}
                            </button>
                          )}
                        </div>
                        <p className="text-text-primary font-body line-clamp-3">
                          {comment.comment_text}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-text-secondary font-body text-center py-4">No comments yet.</p>
                )}
              </div>

              {/* Comment input */}
              <div className="px-4 py-3 border-t border-surface-border/50 space-y-2">
                {canComment ? (
                  <>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                      placeholder="Add a comment…"
                      className="w-full rounded-lg bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary font-body resize-none outline-none ring-1 ring-surface-border focus:ring-brand/40"
                      disabled={postingComment}
                    />
                    <button
                      type="button"
                      onClick={() => void handlePostComment()}
                      disabled={postingComment || commentText.trim().length === 0}
                      className="w-full h-7 rounded-lg bg-brand text-black text-xs font-headline font-bold disabled:opacity-60 transition-opacity"
                    >
                      {postingComment ? 'Posting…' : 'Post'}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-text-secondary font-body text-center">Comments are locked on published schedules.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {canEdit && schedule.status !== 'published' && (
          <div className="flex gap-3 px-6 py-4 border-t border-surface-border">
            <button
              onClick={() => onPublish(schedule)}
              disabled={publishLoading}
              className="h-9 px-4 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-body font-semibold transition-colors"
            >
              {publishLoading ? 'Publishing...' : 'Publish Now'}
            </button>
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

const AIAgentModal = ({ open, brief, onChangeBrief, onClose, onSubmit, loading, error }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-surface-raised rounded-2xl border border-surface-border shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <p className="text-[11px] text-brand font-headline font-bold uppercase tracking-widest">AI Agent</p>
            <h3 className="text-lg font-headline font-bold text-text-primary mt-1">Generate Schedule</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="text-text-muted hover:text-text-primary transition-colors disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">
              Content Brief
            </label>
            <textarea
              value={brief}
              onChange={(e) => onChangeBrief(e.target.value)}
              rows={5}
              placeholder="Contoh: Buat jadwal konten promo weekend ayam goreng, target anak kuliah Bogor, tone fun, post di jam prime time."
              className="input-field resize-none"
              disabled={loading}
            />
            <p className="text-[10px] text-text-muted mt-1">
              AI Agent akan generate satu rekomendasi schedule dan langsung membuatnya di kalender.
            </p>
          </div>

          {error && (
            <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 font-body">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary flex-1 h-10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !brief.trim()}
              className="btn-primary flex-1 h-10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating…' : 'Generate with AI Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────
const YELLOW_ACTIVE = '#f6b70a';

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
    navigateToDate,
    loadMonth,
    addSchedule, editSchedule, removeSchedule, publishNow, dragDrop,
  } = useSchedule();

  // Read view from URL path segment: /calendar/day → 'day', /calendar/week → 'week', /calendar/month → 'month'
  const pathSegment = location.pathname.split('/').pop();
  const validViews = ['day', 'week', 'month'];
  const view = validViews.includes(pathSegment) ? pathSegment : 'month';
  const [selectedDay,    setSelectedDay]    = useState(() => dayjs().tz(TZ));
  const [modal,          setModal]          = useState(null);
  const [activeDate,     setActiveDate]     = useState(null);
  const [activeHour,     setActiveHour]     = useState(null);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [postFilter,     setPostFilter]     = useState('allpost');
  const [assets,         setAssets]         = useState([]);
  const [loadingAssets,  setLoadingAssets]  = useState(false);
  const [formLoading,    setFormLoading]    = useState(false);
  const [formError,      setFormError]      = useState(null);
  const [publishLoadingId, setPublishLoadingId] = useState(null);
  const [mediaDeleting,  setMediaDeleting]  = useState(false);
  const [chatbotDrawerOpen, setChatbotDrawerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const createdIdReloadedRef = useRef<string | null>(null);

  // ── TikTok connect state ────────────────────────────────────
  const { toast }                         = useNotification();
  const [tiktokStatus,  setTiktokStatus]  = useState(null);  // null=unknown, object=connected, false=not connected
  const [tiktokLoading, setTiktokLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleGenerateIdea = () => {
    navigate('/calendar/ideas');
  };

  const filteredSchedules = schedules.filter((schedule) => {
    if (postFilter === 'allpost') return true;
    if (postFilter === 'drafts') return schedule.status === 'draft';
    if (postFilter === 'scheduled') return schedule.status === 'scheduled' || schedule.status === 'uploaded';
    if (postFilter === 'published') return schedule.status === 'published';
    return true;
  });

  const filteredDrafts = postFilter === 'allpost' || postFilter === 'drafts' ? drafts : [];

  const filteredSchedulesByDate = filteredSchedules.reduce((acc, schedule) => {
    if (!schedule.scheduled_at) return acc;
    const key = dayjs(schedule.scheduled_at).tz(TZ).format('YYYY-MM-DD');
    acc[key] = acc[key] ? [...acc[key], schedule] : [schedule];
    return acc;
  }, {});

  const allPostCount = (() => {
    const ids = new Set([
      ...schedules.map((schedule) => schedule.id),
      ...drafts.map((schedule) => schedule.id),
    ]);
    return ids.size;
  })();
  const draftCount = drafts.length;
  const scheduledCount = schedules.filter((schedule) => schedule.status === 'scheduled' || schedule.status === 'uploaded').length;
  const publishedCount = schedules.filter((schedule) => schedule.status === 'published').length;
  const currentFilter = POST_FILTER_OPTIONS.find((item) => item.key === postFilter) || POST_FILTER_OPTIONS[0];
  const currentFilterCount = currentFilter.key === 'allpost'
    ? allPostCount
    : currentFilter.key === 'drafts'
      ? draftCount
      : currentFilter.key === 'scheduled'
        ? scheduledCount
        : publishedCount;
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
    const createdScheduleId = location.state?.createdScheduleId;
    if (!createdScheduleId) return;

    const createdSchedule =
      schedules.find((s) => s.id === createdScheduleId) ||
      drafts.find((s) => s.id === createdScheduleId);

    if (createdSchedule) {
      createdIdReloadedRef.current = null;
      setActiveSchedule(createdSchedule);
      setModal('detail');
      navigate(location.pathname, { replace: true, state: {} });
    } else if (createdIdReloadedRef.current !== createdScheduleId) {
      // Draft was just created via DB trigger — refresh from DB once to pick it up
      createdIdReloadedRef.current = createdScheduleId;
      loadMonth();
    }
  }, [location.state?.createdScheduleId, navigate, location.pathname, schedules, drafts, loadMonth]);

  useEffect(() => {
    const editScheduleId = location.state?.editScheduleId;
    const viewScheduleId = location.state?.viewScheduleId;
    const targetScheduleId = editScheduleId || viewScheduleId;

    if (!targetScheduleId || (schedules.length === 0 && drafts.length === 0)) return;

    const targetSchedule = schedules.find((schedule) => schedule.id === targetScheduleId)
      || drafts.find((schedule) => schedule.id === targetScheduleId);

    if (!targetSchedule) return;

    setActiveSchedule(targetSchedule);
    setModal(viewScheduleId ? 'detail' : 'edit');
    navigate(location.pathname, { replace: true, state: {} });
  }, [drafts, location.state?.editScheduleId, location.state?.viewScheduleId, navigate, location.pathname, schedules]);

  useEffect(() => {
    if (modal === 'detail' && activeSchedule) {
      setLoadingAssets(true);
      fetchMediaBySchedule(activeSchedule.id)
        .then(r => setAssets(r.data?.data?.assets || []))
        .catch(() => setAssets([]))
        .finally(() => setLoadingAssets(false));
    }
  }, [modal, activeSchedule?.id]);

  const prevWeek = () => {
    const next = weekStart.subtract(7, 'day');
    setWeekStart(next);
    const ny = next.year(), nm = next.month() + 1;
    if (ny !== year || nm !== month) navigateToDate(ny, nm);
  };
  const nextWeek = () => {
    const next = weekStart.add(7, 'day');
    setWeekStart(next);
    const ny = next.year(), nm = next.month() + 1;
    if (ny !== year || nm !== month) navigateToDate(ny, nm);
  };
  const prevDay = () => {
    const next = selectedDay.subtract(1, 'day');
    setSelectedDay(next);
    const ny = next.year(), nm = next.month() + 1;
    if (ny !== year || nm !== month) navigateToDate(ny, nm);
  };
  const nextDay = () => {
    const next = selectedDay.add(1, 'day');
    setSelectedDay(next);
    const ny = next.year(), nm = next.month() + 1;
    if (ny !== year || nm !== month) navigateToDate(ny, nm);
  };
  const goToThisWeek = () => {
    const today = dayjs().tz(TZ);
    const dow   = today.day();
    const diff  = dow === 0 ? -6 : 1 - dow;
    setWeekStart(today.add(diff, 'day').startOf('day'));
    setSelectedDay(today);
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
          await uploadMedia(s.id, files, () => {});
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
        await uploadMedia(activeSchedule.id, files, () => {});
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

  const handlePublishNow = async (schedule) => {
    if (!schedule?.id || publishLoadingId) return;
    setPublishLoadingId(schedule.id);
    const result = await publishNow(schedule.id);

    if (result.ok) {
      toast.success(result.message || 'Content published successfully');
      if (activeSchedule?.id === schedule.id) {
        setActiveSchedule(prev => (prev ? { ...prev, status: 'published' } : prev));
      }
    } else {
      toast.error(result.message || 'Failed to publish content');
      if (activeSchedule?.id === schedule.id) {
        setActiveSchedule(prev => (prev ? { ...prev, status: 'failed' } : prev));
      }
    }

    setPublishLoadingId(null);
  };

  const handleMediaUpload = (newAssets) => {
    setAssets(prev => [...prev, ...newAssets]);
    loadMonth();
  };

  const handleMediaDelete = async (asset) => {
    setMediaDeleting(true);
    try {
      await deleteMediaAsset(asset.id);
      setAssets(prev => prev.filter(item => item.id !== asset.id));
      loadMonth();
      toast.success('Media deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete media');
    } finally {
      setMediaDeleting(false);
    }
  };

  return (
    <div className="calendar-reframe flex h-screen overflow-hidden font-body">
      {/* Loading overlay for media operations */}
      {mediaDeleting && (
        <KineticLoader message="Deleting Media…" overlay />
      )}

      <style>{`
        .calendar-reframe {
          background:
            radial-gradient(1200px 600px at 18% -12%, #eaf2ff 0%, rgba(234,242,255,0) 65%),
            radial-gradient(900px 420px at 92% -18%, #fff1e7 0%, rgba(255,241,231,0) 66%),
            #f7f9fc;
          color: #1f2937;
        }

        .calendar-reframe aside {
          width: 268px;
          background: #ffffff;
          border-right: 1px solid #d7e0ea;
        }

        .calendar-reframe aside h2 {
          color: #0f172a;
          font-size: 0.95rem;
        }

        .calendar-reframe aside p,
        .calendar-reframe aside span {
          color: #64748b;
        }

        .calendar-reframe aside [draggable='true'] {
          background: #f8fbff;
          border-color: #dbe7f3;
        }

        .calendar-reframe aside [draggable='true']:hover {
          border-color: #93c5fd;
          box-shadow: 0 8px 18px rgba(59, 130, 246, 0.12);
          transform: translateY(-1px);
        }

        .calendar-reframe .calendar-main {
          background: #f7f9fc;
        }

        .calendar-reframe .calendar-topbar {
          height: 72px;
          border-bottom: 1px solid #d7e0ea;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
        }

        .calendar-reframe .calendar-topbar .calendar-title {
          color: #111827;
          letter-spacing: 0.12em;
        }

        .calendar-reframe .calendar-topbar button,
        .calendar-reframe .calendar-topbar span,
        .calendar-reframe .calendar-topbar p {
          color: #334155;
        }

        .calendar-reframe .calendar-grid-shell {
          margin: 14px;
          border: 1px solid #d7e0ea;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.07);
        }

        .calendar-reframe .calendar-grid-shell [class*='border-white'] {
          border-color: #e2e8f0 !important;
        }

        .calendar-reframe .calendar-grid-shell [class*='text-text-primary'] {
          color: #1f2937 !important;
        }

        .calendar-reframe .calendar-grid-shell [class*='text-text-secondary'],
        .calendar-reframe .calendar-grid-shell [class*='text-text-muted'] {
          color: #64748b !important;
        }

        .calendar-reframe .calendar-grid-shell [class*='bg-surface'],
        .calendar-reframe .calendar-grid-shell [class*='bg-white/[0.02]'],
        .calendar-reframe .calendar-grid-shell [class*='bg-white/[0.03]'] {
          background: #ffffff !important;
        }

        .calendar-reframe .calendar-grid-shell [class*='bg-gold/[0.08]'] {
          background: #e8f0fe !important;
        }

        .calendar-reframe .calendar-grid-shell .calendar-past-slot,
        .calendar-reframe .calendar-grid-shell .calendar-past-day-cell {
          background: #fff3f3 !important;
        }

        .calendar-reframe .calendar-grid-shell .calendar-past-slot span,
        .calendar-reframe .calendar-grid-shell .calendar-past-day-cell span {
          color: #ef4444 !important;
          opacity: 0.75;
          font-weight: 600;
        }

        .calendar-reframe .calendar-grid-shell [class*='bg-brand/[0.08]'] {
          background: #eff6ff !important;
        }

        .calendar-reframe .calendar-grid-shell [class*='hover:bg-white/[0.03]']:hover {
          background: #f8fbff !important;
        }

        .calendar-reframe .calendar-grid-shell [class*='bg-white/[0.04]'] {
          background: #eef4ff !important;
          border-color: #cedcf2 !important;
        }

        .calendar-reframe .calendar-grid-shell [class*='bg-white/[0.04]'] span {
          color: #0f172a !important;
        }

        .calendar-reframe .calendar-topbar .toolbar-pill {
          border: 1px solid #d0dbe8;
          background: #ffffff;
          border-radius: 999px;
          color: #334155;
        }

        .calendar-reframe .calendar-topbar .toolbar-pill-active {
          background: ${YELLOW_ACTIVE};
          color: #111827;
          border-color: ${YELLOW_ACTIVE};
        }

        .calendar-reframe .calendar-grid-shell .calendar-past-slot,
        .calendar-reframe .calendar-grid-shell .calendar-past-day-cell {
          background: #fff3f3 !important;
        }

        .calendar-reframe .calendar-grid-shell .calendar-past-slot span,
        .calendar-reframe .calendar-grid-shell .calendar-past-day-cell span,
        .calendar-reframe .calendar-grid-shell .calendar-past-slot p,
        .calendar-reframe .calendar-grid-shell .calendar-past-day-cell p {
          color: #dc2626 !important;
          opacity: 0.9;
          font-weight: 700;
        }
      `}</style>

      {/* ── Left: Content Library Sidebar ── */}
      <ContentLibrarySidebar
        drafts={filteredDrafts}
        schedules={filteredSchedules}
        onEdit={(s) => { setActiveSchedule(s); setFormError(null); setModal('edit'); }}
        onDelete={handleDelete}
        onPublish={handlePublishNow}
        publishLoadingId={publishLoadingId}
      />

      {/* ── Right: Main area ── */}
      <div className="calendar-main flex-1 flex flex-col overflow-hidden">

        {/* Top nav bar */}
        <header className="calendar-topbar relative z-40 flex items-center gap-3 px-5 py-3 flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center mr-2">
            <img src="/logo.png" alt="Krench Chicken" className="h-8 w-auto object-contain" />
          </div>

          {/* Page title */}
          <div className="hidden md:block">
            <p className="calendar-title text-xs font-body font-semibold uppercase tracking-[0.28em]">Marketing Calendar</p>
          </div>

          <div className="relative z-50 ml-2" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              className="toolbar-pill px-4 h-9 text-xs font-body font-semibold inline-flex items-center gap-2"
              title="Filter posts"
            >
              <span>{currentFilter.label}</span>
              <span className="inline-flex min-w-4 h-4 px-1 rounded-full items-center justify-center text-[10px] bg-slate-100 text-slate-600">
                {currentFilterCount}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 min-w-[160px] bg-white border border-slate-300 rounded-xl shadow-lg z-[70] overflow-hidden">
                {POST_FILTER_OPTIONS.map((item) => {
                  const active = postFilter === item.key;
                  const count = item.key === 'allpost'
                    ? allPostCount
                    : item.key === 'drafts'
                      ? draftCount
                      : item.key === 'scheduled'
                        ? scheduledCount
                        : publishedCount;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setPostFilter(item.key);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-body font-semibold flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-amber-100 text-amber-800'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`inline-flex min-w-4 h-4 px-1 rounded-full items-center justify-center text-[10px] ${active ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Today */}
            <button onClick={goToThisWeek}
              className="toolbar-pill px-4 h-9 text-xs font-body font-semibold transition-colors hover:bg-slate-50">
              Today
            </button>

            {/* View toggle */}
            <div className="flex items-center rounded-full p-0.5 border border-slate-300 bg-white">
              {['Day','Week','Month'].map(v => (
                <button key={v} onClick={() => navigate(`/calendar/${v.toLowerCase()}`)}
                  className={`px-3 h-8 rounded-full text-xs font-body font-semibold transition-all
                    ${view === v.toLowerCase()
                      ? 'toolbar-pill-active'
                      : 'text-slate-600 hover:text-slate-900'}`}>
                  {v}
                </button>
              ))}
            </div>

            {/* List/Calendar view toggle */}
            <ViewModeToggle 
              currentMode="grid" 
              onModeChange={(mode) => {
                if (mode === 'list') {
                  navigate(`/calendar/list?year=${year}&month=${month}`);
                }
              }}
            />

            {/* Week navigation */}
            <button onClick={view === 'week' ? prevWeek : view === 'day' ? prevDay : prevMonth}
              className="toolbar-pill w-9 h-9 flex items-center justify-center transition-colors hover:bg-slate-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <span className="text-base font-body font-semibold text-slate-900 min-w-[220px] text-center tracking-wide">
              {view === 'week'
                ? weekLabel
                : view === 'day'
                ? selectedDay.format('dddd, MMMM D, YYYY')
                : dayjs(new Date(year, month-1)).format('MMMM YYYY')}
            </span>

            <button onClick={view === 'week' ? nextWeek : view === 'day' ? nextDay : nextMonth}
              className="toolbar-pill w-9 h-9 flex items-center justify-center transition-colors hover:bg-slate-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            {/* TikTok connect button */}
            {canEdit && (
              <TikTokLoginButton
                connected={!!tiktokStatus}
                needsReconnect={tiktokStatus?.needs_reconnect === true}
                accountName={tiktokStatus?.tiktok_display_name || tiktokStatus?.tiktok_account_name}
                onConnect={handleConnectTikTok}
                onDisconnect={handleDisconnectTikTok}
                loading={tiktokLoading}
              />
            )}

            {canEdit && (
              <button
                onClick={handleGenerateIdea}
                className="h-9 px-4 rounded-full bg-[#f6b70a] border border-[#f6b70a] text-white text-xs font-headline font-bold transition-colors hover:bg-[#e2a700] shadow-[0_8px_16px_rgba(246,183,10,0.25)]"
                title="Generate ideas"
              >
                Generate ideas
              </button>
            )}

            {/* New Post button */}
            {canEdit && (
              <button onClick={() => { setActiveDate(null); setActiveHour(null); setFormError(null); setModal('create'); }}
                className="h-9 px-4 rounded-full bg-[#f6b70a] border border-[#f6b70a] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-[#e2a700] shadow-[0_8px_16px_rgba(246,183,10,0.25)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                New Post
              </button>
            )}

            {/* Profile button */}
            <button
              onClick={() => navigate('/profile')}
              className="toolbar-pill w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors flex-shrink-0"
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
          <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-body font-semibold">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Calendar content */}
        <div className="calendar-grid-shell calendar-grid-surface flex-1 overflow-hidden">
          {(view === 'week' || view === 'day') ? (
            <WeeklyCalendarView
              weekStart={weekStart}
              schedulesByDate={filteredSchedulesByDate}
              onDrop={handleDrop}
              onSlotClick={handleSlotClick}
              onCardClick={handleCardClick}
              loading={loading}
              mode={view}
              selectedDay={view === 'day' ? selectedDay : undefined}
            />
          ) : (
            <div className="p-3 h-full overflow-auto bg-white">
              <CalendarView
                year={year}
                month={month}
                schedulesByDate={filteredSchedulesByDate}
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
          onPublish={handlePublishNow}
          publishLoading={publishLoadingId === activeSchedule.id}
          onMediaUpload={handleMediaUpload}
          onMediaDeleted={(id) => setAssets(prev => prev.filter(a => a.id !== id))}
          onMediaDelete={handleMediaDelete}
          canEdit={canEdit} />
      )}

      {/* ── AI Chatbot FAB — bottom-right floating ── */}
      <AIChatbot openOnMount={chatbotDrawerOpen} onOpenChange={setChatbotDrawerOpen} />
    </div>
  );
};

export default CalendarPage;