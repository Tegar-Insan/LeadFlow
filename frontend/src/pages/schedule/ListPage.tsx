/**
 * ListPage.tsx — List View for Content Management
 * Same chrome as CalendarPage (light theme, sidebar, topbar).
 * Main content replaced with date-grouped list of posts.
 * LeadFlow – Krench Chicken (UC007)
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';

import ContentLibrarySidebar from '../../components/Schedule/ContentLibrarySidebar';
import MediaUploader from '../../components/media/MediaUploader';
import MediaPreview from '../../components/media/MediaPreview';
import { useSchedule } from '../../hooks/useSchedule';
import AuthContext from '../../context/AuthContext';
import {
  toDatetimeLocal,
  datetimeLocalToUTCiso,
  fLongDateTime,
  TZ,
} from '../../utils/formatDate';
import { fetchMediaBySchedule, uploadMedia, deleteMediaAsset } from '../../services/mediaService';
import { fetchSchedulesForList } from '../../services/scheduleService';
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
dayjs.extend(relativeTime);

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
  { key: 'allpost',   label: 'All Post' },
  { key: 'drafts',    label: 'Drafts' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
];

// ─── Helpers ──────────────────────────────────────────────────
const EMPTY_POST_SLOT = () => ({
  title: '', caption: '', hashtags: '',
  mediaType: 'photo', mediaFiles: [], mediaPreviews: [], mediaDropOver: false,
});

// ─── ScheduleModal (identical to CalendarPage) ───────────────
const ScheduleModal = ({ mode, initial = {}, initialDate, initialHour, onClose, onSave, loading, error }: any) => {
  const defaultTime = initialHour != null
    ? `${initialDate}T${String(initialHour).padStart(2,'0')}:00`
    : initialDate ? `${initialDate}T10:00` : '';
  const fallbackScheduledTime = dayjs().tz(TZ).add(1, 'hour').format('YYYY-MM-DDTHH:mm');

  const [postCount, setPostCount] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState(() => [
    mode === 'edit'
      ? { ...EMPTY_POST_SLOT(), title: initial.custom_caption || initial.title || '', caption: initial.custom_caption || '', hashtags: (initial.custom_hashtags || []).join(' ') }
      : EMPTY_POST_SLOT(),
  ]);
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
  const mediaInputRef = React.useRef([]);
  const formatBytes = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const changeCount = (n) => {
    setPostCount(n);
    setPosts(prev => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(null).map(() => EMPTY_POST_SLOT())];
      prev.slice(n).forEach(p => p.mediaPreviews.forEach(u => URL.revokeObjectURL(u)));
      return prev.slice(0, n);
    });
    if (activeTab >= n) setActiveTab(n - 1);
  };

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
    const p = posts[idx];
    const arr = Array.from(rawFiles || []) as File[];
    if (p.mediaType === 'video') {
      const mp4 = arr.find((f: File) => f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4'));
      if (!mp4) { alert('Please select an MP4 video file.'); return; }
      if ((mp4 as File).size > 50 * 1024 * 1024) { alert('Video must be ≤ 50 MB.'); return; }
      p.mediaPreviews.forEach(u => URL.revokeObjectURL(u));
      setPosts(prev => prev.map((pp, i) => i !== idx ? pp : { ...pp, mediaFiles: [mp4], mediaPreviews: [URL.createObjectURL(mp4 as File)] }));
    } else {
      const valid = arr.filter((f: File) => {
        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) { alert(`${f.name} is not JPG or PNG.`); return false; }
        if (f.size > 50 * 1024 * 1024) { alert(`${f.name} exceeds 50 MB.`); return false; }
        return true;
      });
      if (!valid.length) return;
      setPosts(prev => prev.map((pp, i) => i !== idx ? pp : {
        ...pp, mediaFiles: [...pp.mediaFiles, ...valid],
        mediaPreviews: [...pp.mediaPreviews, ...valid.map((f: File) => URL.createObjectURL(f))],
      }));
    }
  };

  const removeMediaFile = (idx, fileIdx) => {
    setPosts(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      URL.revokeObjectURL(p.mediaPreviews[fileIdx]);
      return { ...p, mediaFiles: p.mediaFiles.filter((_, j) => j !== fileIdx), mediaPreviews: p.mediaPreviews.filter((_, j) => j !== fileIdx) };
    }));
  };

  const setSharedField = (k, v) => { setShared(s => ({ ...s, [k]: v })); if (k === 'scheduled_at') setDateError(null); };
  const selectPublishMode = (nextMode) => {
    setPublishMode(nextMode); setDateError(null);
    if (nextMode === 'scheduled' && !shared.scheduled_at) setShared(s => ({ ...s, scheduled_at: defaultTime || fallbackScheduledTime }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isDraftMode = publishMode === 'draft';
    if (!isDraftMode && !shared.scheduled_at) { setDateError('Publish date & time is required when content is ready to publish.'); return; }
    if (shared.scheduled_at && !isDraftMode) {
      const wib = dayjs.tz(shared.scheduled_at, TZ);
      if (wib.isBefore(dayjs().tz(TZ))) { setDateError('Cannot schedule in the past. Please choose a future date and time (WIB).'); return; }
    }
    const basePayload = (p) => ({
      title: p.title.trim(), caption: p.caption.trim() || null,
      hashtags: p.hashtags.split(/\s+/).filter(h => h.startsWith('#') && h.length > 1),
      scheduled_at: isDraftMode ? null : (shared.scheduled_at ? datetimeLocalToUTCiso(shared.scheduled_at) : null),
      status: isDraftMode ? 'draft' : 'scheduled',
      priority: parseInt(shared.priority, 10) || 0,
      auto_publish: shared.auto_publish, privacy_level: shared.privacy_level,
    });
    if (mode === 'edit') onSave(basePayload(posts[0]), posts[0].mediaFiles);
    else onSave(posts.map(p => ({ payload: basePayload(p), files: p.mediaFiles })));
  };

  const PostMediaPanel = ({ idx }) => {
    const p = posts[idx];
    return (
      <div className="border-t border-surface-border pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-body font-semibold text-text-secondary">Media <span className="text-text-muted font-normal">(optional)</span></label>
          <div className="flex items-center bg-surface-overlay rounded-lg p-0.5 border border-surface-border">
            {['photo','video'].map(t => (
              <button key={t} type="button" onClick={() => switchMediaType(idx, t)}
                className={`px-2.5 h-6 rounded-md text-[11px] font-body font-semibold transition-all ${p.mediaType === t ? 'bg-surface-raised text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                {t === 'photo' ? '📷 Photos' : '🎬 Video'}
              </button>
            ))}
          </div>
        </div>
        {!(p.mediaType === 'video' && p.mediaFiles.length > 0) && (
          <div onDragOver={e => { e.preventDefault(); setPostField(idx, 'mediaDropOver', true); }}
            onDragLeave={() => setPostField(idx, 'mediaDropOver', false)}
            onDrop={e => { e.preventDefault(); setPostField(idx, 'mediaDropOver', false); addMediaFiles(idx, e.dataTransfer.files); }}
            onClick={() => mediaInputRef.current[idx]?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${p.mediaDropOver ? 'border-brand bg-brand/[0.06]' : 'border-surface-border hover:border-white/20 hover:bg-white/[0.02]'}`}>
            <input ref={el => mediaInputRef.current[idx] = el} type="file" className="hidden"
              accept={p.mediaType === 'video' ? '.mp4,video/mp4' : '.jpg,.jpeg,.png,image/jpeg,image/png'}
              multiple={p.mediaType === 'photo'}
              onChange={(e) => { addMediaFiles(idx, e.currentTarget.files); e.currentTarget.value = ''; }} />
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl">{p.mediaDropOver ? '⬇️' : p.mediaType === 'video' ? '🎬' : '🖼️'}</span>
              <p className="text-xs font-semibold text-text-secondary font-body">{p.mediaDropOver ? 'Drop here' : 'Drag & drop or click to browse'}</p>
              <p className="text-[10px] text-text-muted font-body">{p.mediaType === 'video' ? 'MP4 only · max 50 MB · 1 video' : 'JPG or PNG · max 50 MB each · multiple allowed'}</p>
            </div>
          </div>
        )}
        {p.mediaPreviews.length > 0 && (
          <div className={`grid gap-2 ${p.mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {p.mediaPreviews.map((url, fi) => (
              <div key={fi} className="relative group rounded-lg overflow-hidden bg-zinc-800 border border-white/10">
                {p.mediaType === 'video' ? <video src={url} className="w-full h-32 object-cover" muted playsInline /> : <img src={url} alt={`p${idx}-f${fi}`} className="w-full h-24 object-cover" />}
                <button type="button" onClick={() => removeMediaFile(idx, fi)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const isCreate = mode === 'create';
  const totalFiles = posts.reduce((s, p) => s + p.mediaFiles.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-raised rounded-2xl shadow-2xl overflow-hidden border border-surface-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="font-headline font-bold text-lg text-text-primary">{isCreate ? 'Manage Content Queue' : 'Edit Post'}</h2>
            {isCreate && <p className="text-[11px] text-text-muted font-body mt-0.5">Schedule multiple posts at the same time</p>}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto">
          {isCreate && (
            <div className="px-6 pt-4 pb-3 border-b border-surface-border">
              <p className="text-xs font-body font-semibold text-text-secondary mb-2">How many posts to queue?</p>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => changeCount(n)}
                    className={`w-9 h-9 rounded-lg text-sm font-headline font-bold transition-all border ${postCount === n ? 'bg-brand text-black border-brand' : 'bg-white/[0.04] text-text-secondary border-white/[0.08] hover:border-brand/50'}`}>{n}</button>
                ))}
                <span className="text-xs text-text-muted font-body ml-1">{postCount === 1 ? 'Single post' : `${postCount} posts at once`}</span>
              </div>
            </div>
          )}
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-4">
              <div><label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Post Title *</label>
                <input type="text" value={posts[activeTab].title} onChange={e => setPostField(activeTab, 'title', e.target.value)} required placeholder="e.g. Weekend Promo Krench Chicken" className="input-field" /></div>
              <div><label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">TikTok Caption</label>
                <textarea value={posts[activeTab].caption} onChange={e => setPostField(activeTab, 'caption', e.target.value)} rows={3} placeholder="Write your TikTok caption here…" className="input-field resize-none" /></div>
              <div><label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Hashtags</label>
                <input type="text" value={posts[activeTab].hashtags} onChange={e => setPostField(activeTab, 'hashtags', e.target.value)} placeholder="#krenchChicken #friedchicken #bogor" className="input-field" /></div>
              <PostMediaPanel idx={activeTab} />
            </div>
            <div className="space-y-4 border-t border-surface-border pt-4">
              <div>
                <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Save Mode</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => selectPublishMode('draft')} className={`px-3 h-8 rounded-lg text-xs font-body font-semibold transition-colors ${publishMode === 'draft' ? 'bg-brand text-black' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}>Save as Draft</button>
                  <button type="button" onClick={() => selectPublishMode('scheduled')} className={`px-3 h-8 rounded-lg text-xs font-body font-semibold transition-colors ${publishMode === 'scheduled' ? 'bg-brand text-black' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}>Ready to Publish</button>
                </div>
              </div>
              {publishMode === 'scheduled' && (
                <div>
                  <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Publish Date & Time <span className="text-text-muted font-normal">(WIB / Jakarta)</span></label>
                  <input type="datetime-local" value={shared.scheduled_at} onChange={e => setSharedField('scheduled_at', e.target.value)} className={`input-field [color-scheme:dark] ${dateError ? 'border-brand' : ''}`} />
                  {dateError ? <p className="text-[10px] text-brand mt-1">{dateError}</p> : <p className="text-[10px] text-text-muted mt-1">Choose a future date/time to publish later.</p>}
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Privacy</label>
                  <select value={shared.privacy_level} onChange={e => setSharedField('privacy_level', e.target.value)} className="input-field">
                    <option value="PUBLIC_TO_EVERYONE">Public</option>
                    <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                    <option value="SELF_ONLY">Private</option>
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={shared.auto_publish} onChange={e => setSharedField('auto_publish', e.target.checked)} className="w-4 h-4 rounded accent-brand" />
                    <span className="text-xs font-body font-semibold text-text-secondary">Auto-publish</span>
                  </label>
                </div>
              </div>
            </div>
            {error && <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 font-body">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 h-10">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 h-10">
                {loading ? (totalFiles > 0 ? 'Saving & uploading…' : 'Saving…') : mode === 'create' ? (publishMode === 'draft' ? 'Save Draft' : 'Create Post') : (publishMode === 'draft' ? 'Save Draft' : 'Save Changes')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail Modal (identical to CalendarPage) ────────────────
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
      .then(rows => { if (!cancelled) setComments(rows); })
      .catch(() => { if (!cancelled) toast.error('Failed to load comments'); })
      .finally(() => { if (!cancelled) setLoadingComments(false); });
    return () => { cancelled = true; };
  }, [schedule.id, schedule.status]);

  const handlePostComment = async () => {
    if (!canComment) { toast.error('Comments are locked on published schedules'); return; }
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
    } finally { setPostingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    if (deletingCommentId) return;
    if (!window.confirm('Delete this comment?')) return;
    setDeletingCommentId(commentId);
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted');
      setComments(prev => prev.filter(c => c.comment_id !== commentId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally { setDeletingCommentId(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[90vh] bg-surface-raised rounded-2xl shadow-2xl overflow-hidden border border-surface-border flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={cfg.cls}>{cfg.label}</span>
              {schedule.auto_publish && <span className="status-live flex items-center gap-0.5"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Auto</span>}
            </div>
            <h2 className="font-headline font-bold text-lg text-text-primary truncate">{schedule.custom_caption || schedule.title || 'Untitled'}</h2>
            {schedule.scheduled_at && <p className="text-xs text-text-secondary font-body mt-0.5">{fLongDateTime(schedule.scheduled_at)}</p>}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex flex-1 max-h-[70vh] overflow-hidden">
          <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto border-r border-surface-border">
            {schedule.custom_hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {schedule.custom_hashtags.map((h, idx) => <span key={`${h}-${idx}`} className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-text-secondary font-body">{h}</span>)}
              </div>
            )}
            <div>
              <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest mb-2">Media</p>
              {loadingAssets ? (
                <div className="flex items-center gap-2 text-text-secondary text-sm py-3 font-body">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Loading media…
                </div>
              ) : <MediaPreview assets={assets} onDeleteAsset={canEdit && schedule.status !== 'published' ? onMediaDelete : undefined} />}
              {canEdit && schedule.status !== 'published' && (
                <div className="mt-3">
                  <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest mb-2">Upload Media</p>
                  <MediaUploader scheduleId={schedule.id} existingAssets={[]} onUploadComplete={onMediaUpload} onAssetDeleted={onMediaDeleted} />
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
          <div className="w-72 flex flex-col bg-surface-overlay/50">
            <div className="px-4 py-3 border-b border-surface-border/50">
              <p className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-widest">Comments</p>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loadingComments ? <p className="text-xs text-text-secondary font-body">Loading comments...</p>
                  : comments.length > 0 ? comments.map(comment => {
                    const canDeleteComment = currentRole === 'admin' || comment.author_user_id === currentUserId;
                    const authorInitial = (comment.author_name || comment.author_email || 'U').trim().charAt(0).toUpperCase();
                    return (
                      <div key={comment.comment_id} className="rounded-lg bg-surface-raised px-2.5 py-2 text-xs">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            {comment.author_photo_url
                              ? <img src={comment.author_photo_url} alt={comment.author_name || 'Author'} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                              : <div className="w-6 h-6 rounded-full bg-brand text-black flex items-center justify-center text-[10px] font-bold flex-shrink-0">{authorInitial}</div>}
                            <div className="min-w-0">
                              <span className="font-semibold text-text-primary block truncate">{comment.author_name || comment.author_email || 'Unknown'}</span>
                              <span className="text-[10px] text-text-muted">{comment.created_at_wib}</span>
                            </div>
                          </div>
                          {canDeleteComment && (
                            <button type="button" onClick={() => void handleDeleteComment(comment.comment_id)} disabled={deletingCommentId === comment.comment_id}
                              className="text-[10px] text-brand hover:text-brand-light disabled:opacity-60 flex-shrink-0">
                              {deletingCommentId === comment.comment_id ? '…' : '✕'}
                            </button>
                          )}
                        </div>
                        <p className="text-text-primary font-body line-clamp-3">{comment.comment_text}</p>
                      </div>
                    );
                  }) : <p className="text-xs text-text-secondary font-body text-center py-4">No comments yet.</p>}
              </div>
              <div className="px-4 py-3 border-t border-surface-border/50 space-y-2">
                {canComment ? (
                  <>
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={2} placeholder="Add a comment…"
                      className="w-full rounded-lg bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary font-body resize-none outline-none ring-1 ring-surface-border focus:ring-brand/40" disabled={postingComment} />
                    <button type="button" onClick={() => void handlePostComment()} disabled={postingComment || commentText.trim().length === 0}
                      className="w-full h-7 rounded-lg bg-brand text-black text-xs font-headline font-bold disabled:opacity-60 transition-opacity">
                      {postingComment ? 'Posting…' : 'Post'}
                    </button>
                  </>
                ) : <p className="text-xs text-text-secondary font-body text-center">Comments are locked on published schedules.</p>}
              </div>
            </div>
          </div>
        </div>
        {canEdit && schedule.status !== 'published' && (
          <div className="flex gap-3 px-6 py-4 border-t border-surface-border">
            <button onClick={() => onPublish(schedule)} disabled={publishLoading}
              className="h-9 px-4 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60 text-xs font-body font-semibold transition-colors">
              {publishLoading ? 'Publishing...' : 'Publish Now'}
            </button>
            <button onClick={() => onDelete(schedule.id)} className="h-9 px-4 rounded-lg border border-brand/30 text-brand hover:bg-brand/10 text-xs font-body font-semibold transition-colors">Delete</button>
            <button onClick={() => onEdit(schedule)} className="flex-1 h-9 btn-primary text-xs">Edit Details</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────
const YELLOW_ACTIVE = '#f6b70a';

// Group items by date key for list view
const groupItemsByDate = (items: any[]) => {
  const groups: Record<string, any[]> = {};
  items.forEach(item => {
    const key = item.scheduled_at
      ? dayjs(item.scheduled_at).tz(TZ).format('YYYY-MM-DD')
      : '__unscheduled__';
    groups[key] = [...(groups[key] || []), item];
  });
  return groups;
};

const formatDateHeader = (dateKey: string) => {
  if (dateKey === '__unscheduled__') return 'Unscheduled';
  const d = dayjs(dateKey).tz(TZ);
  const today = dayjs().tz(TZ);
  if (d.isSame(today, 'day')) return 'Today';
  if (d.isSame(today.add(1, 'day'), 'day')) return `Tomorrow, ${d.format('D MMMM')}`;
  if (d.isSame(today.subtract(1, 'day'), 'day')) return `Yesterday, ${d.format('D MMMM')}`;
  if (d.isBefore(today)) return d.format('ddd, D MMMM YYYY');
  return d.format('ddd, D MMMM');
};

export default function ListPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams] = useSearchParams();
  const authCtx   = useContext(AuthContext);
  const user      = authCtx?.user;
  const roleName  = user?.roleName || user?.role_name;
  const canEdit   = ['marketing_staff', 'admin'].includes(roleName);

  const urlYear  = parseInt(searchParams.get('year')  ?? '', 10) || undefined;
  const urlMonth = parseInt(searchParams.get('month') ?? '', 10) || undefined;

  const {
    schedules, drafts, loading, error,
    loadMonth, addSchedule, editSchedule, removeSchedule, publishNow,
  } = useSchedule(urlYear, urlMonth);

  const [listTab,          setListTab]          = useState<'scheduled' | 'drafts'>('scheduled');
  const [modal,            setModal]            = useState(null);
  const [activeSchedule,   setActiveSchedule]   = useState(null);
  const [postFilter,       setPostFilter]       = useState('allpost');
  const [assets,           setAssets]           = useState([]);
  const [loadingAssets,    setLoadingAssets]    = useState(false);
  const [formLoading,      setFormLoading]      = useState(false);
  const [formError,        setFormError]        = useState(null);
  const [publishLoadingId, setPublishLoadingId] = useState(null);
  const [chatbotDrawerOpen,setChatbotDrawerOpen]= useState(false);
  const [mediaDeleting,    setMediaDeleting]    = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  // List view filter state
  const [listViewFilter, setListViewFilter] = useState<'day' | 'week' | 'month'>('month');
  const [listViewDate, setListViewDate] = useState(dayjs().tz('Asia/Jakarta').format('YYYY-MM-DD'));

  const { toast } = useNotification();
  const [tiktokStatus,  setTiktokStatus]  = useState(null);
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

  // Fetch list view data when filter or date changes
  useEffect(() => {
    const fetchListData = async () => {
      try {
        const response = await fetchSchedulesForList(listViewFilter, listViewDate);
        const data = response.data?.data || [];
        console.log('list', data); // Validation: log list data to console
        console.info(`[ListPage] List view loaded: filter=${listViewFilter}, date=${listViewDate}, count=${data.length}`);
      } catch (err) {
        console.error('[ListPage] Failed to fetch list view data:', err);
      }
    };
    fetchListData();
  }, [listViewFilter, listViewDate]);

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

  const handleGenerateIdea = () => navigate('/calendar/ideas');

  // Filter logic
  const filteredSchedules = schedules.filter(s => {
    if (postFilter === 'allpost') return true;
    if (postFilter === 'drafts') return false;
    if (postFilter === 'scheduled') return s.status === 'scheduled' || s.status === 'uploaded';
    if (postFilter === 'published') return s.status === 'published';
    return true;
  });
  const filteredDrafts = postFilter === 'allpost' || postFilter === 'drafts' ? drafts : [];

  const allPostCount = (() => {
    const ids = new Set([...schedules.map(s => s.id), ...drafts.map(s => s.id)]);
    return ids.size;
  })();
  const draftCount     = drafts.length;
  const scheduledCount = schedules.filter(s => s.status === 'scheduled' || s.status === 'uploaded').length;
  const publishedCount = schedules.filter(s => s.status === 'published').length;
  const currentFilter  = POST_FILTER_OPTIONS.find(i => i.key === postFilter) || POST_FILTER_OPTIONS[0];
  const currentFilterCount = currentFilter.key === 'allpost' ? allPostCount : currentFilter.key === 'drafts' ? draftCount : currentFilter.key === 'scheduled' ? scheduledCount : publishedCount;

  // List view items
  const listItems = listTab === 'scheduled' ? filteredSchedules : filteredDrafts;
  const groupedItems = groupItemsByDate(listItems);
  const sortedDateKeys = Object.keys(groupedItems).sort((a, b) => {
    if (a === '__unscheduled__') return -1;
    if (b === '__unscheduled__') return 1;
    return a.localeCompare(b);
  });

  // Draft stats
  const unscheduledDrafts = drafts.filter(d => !d.scheduled_at).length;
  const scheduledDrafts   = drafts.filter(d => !!d.scheduled_at).length;

  useEffect(() => {
    if (modal === 'detail' && activeSchedule) {
      setLoadingAssets(true);
      fetchMediaBySchedule(activeSchedule.id)
        .then(r => setAssets(r.data?.data?.assets || []))
        .catch(() => setAssets([]))
        .finally(() => setLoadingAssets(false));
    }
  }, [modal, activeSchedule?.id]);

  const handleCardClick = (schedule) => {
    setActiveSchedule(schedule);
    setAssets([]);
    setModal('detail');
  };

  const handleCreateSave = async (postsArray) => {
    setFormLoading(true); setFormError(null);
    let needReload = false;
    try {
      for (const { payload, files = [] } of postsArray) {
        const s = await addSchedule(payload);
        if (files.length > 0) { await uploadMedia(s.id, files, () => {}); needReload = true; }
      }
      if (needReload) loadMonth();
      setModal(null);
    } catch (err) { setFormError(err.response?.data?.message || 'Failed to create'); }
    finally { setFormLoading(false); }
  };

  const handleEditSave = async (payload, files = []) => {
    if (!activeSchedule) return;
    setFormLoading(true); setFormError(null);
    try {
      await editSchedule(activeSchedule.id, payload);
      if (files.length > 0) { await uploadMedia(activeSchedule.id, files, () => {}); loadMonth(); }
      setModal(null);
    } catch (err) { setFormError(err.response?.data?.message || 'Failed to update'); }
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
      if (activeSchedule?.id === schedule.id) setActiveSchedule(prev => prev ? { ...prev, status: 'published' } : prev);
    } else {
      toast.error(result.message || 'Failed to publish content');
      if (activeSchedule?.id === schedule.id) setActiveSchedule(prev => prev ? { ...prev, status: 'failed' } : prev);
    }
    setPublishLoadingId(null);
  };

  const handleMediaUpload = (newAssets) => { setAssets(prev => [...prev, ...newAssets]); loadMonth(); };
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
        .calendar-reframe aside h2 { color: #0f172a; font-size: 0.95rem; }
        .calendar-reframe aside p,
        .calendar-reframe aside span { color: #64748b; }
        .calendar-reframe aside [draggable='true'] { background: #f8fbff; border-color: #dbe7f3; }
        .calendar-reframe aside [draggable='true']:hover {
          border-color: #93c5fd;
          box-shadow: 0 8px 18px rgba(59, 130, 246, 0.12);
          transform: translateY(-1px);
        }
        .calendar-reframe .calendar-main { background: #f7f9fc; }
        .calendar-reframe .calendar-topbar {
          height: 72px;
          border-bottom: 1px solid #d7e0ea;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
        }
        .calendar-reframe .calendar-topbar .calendar-title { color: #111827; letter-spacing: 0.12em; }
        .calendar-reframe .calendar-topbar button,
        .calendar-reframe .calendar-topbar span,
        .calendar-reframe .calendar-topbar p { color: #334155; }
        .calendar-reframe .list-shell {
          margin: 14px;
          border: 1px solid #d7e0ea;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.07);
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
        .list-tab-active {
          color: #111827;
          border-bottom: 2px solid ${YELLOW_ACTIVE};
          font-weight: 700;
        }
        .list-tab-inactive {
          color: #64748b;
          border-bottom: 2px solid transparent;
        }
        .list-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .list-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
        }
        .list-date-header {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #374151;
          letter-spacing: 0.01em;
        }
        .list-stats-bar {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 20px;
          display: flex;
          gap: 32px;
          align-items: center;
        }
        .list-stats-val { font-size: 1.25rem; font-weight: 800; color: #111827; }
        .list-stats-lbl { font-size: 0.6875rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .list-stats-val.accent { color: ${YELLOW_ACTIVE}; }
      `}</style>

      {/* ── Left: Content Library Sidebar ── */}
      <ContentLibrarySidebar
        drafts={filteredDrafts}
        schedules={filteredSchedules}
        onEdit={s => { setActiveSchedule(s); setFormError(null); setModal('edit'); }}
        onDelete={handleDelete}
        onPublish={handlePublishNow}
        publishLoadingId={publishLoadingId}
      />

      {/* ── Right: Main area ── */}
      <div className="calendar-main flex-1 flex flex-col overflow-hidden">

        {/* Top nav bar — identical to CalendarPage */}
        <header className="calendar-topbar relative z-40 flex items-center gap-3 px-5 py-3 flex-shrink-0">
          <div className="flex items-center mr-2">
            <img src="/logo.png" alt="Krench Chicken" className="h-8 w-auto object-contain" />
          </div>
          <div className="hidden md:block">
            <p className="calendar-title text-xs font-body font-semibold uppercase tracking-[0.28em]">Marketing Calendar</p>
          </div>

          {/* Post filter dropdown */}
          <div className="relative z-50 ml-2" ref={filterDropdownRef}>
            <button type="button" onClick={() => setIsFilterDropdownOpen(prev => !prev)}
              className="toolbar-pill px-4 h-9 text-xs font-body font-semibold inline-flex items-center gap-2" title="Filter posts">
              <span>{currentFilter.label}</span>
              <span className="inline-flex min-w-4 h-4 px-1 rounded-full items-center justify-center text-[10px] bg-slate-100 text-slate-600">{currentFilterCount}</span>
              <svg className={`w-4 h-4 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
              </svg>
            </button>
            {isFilterDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 min-w-[160px] bg-white border border-slate-300 rounded-xl shadow-lg z-[70] overflow-hidden">
                {POST_FILTER_OPTIONS.map(item => {
                  const active = postFilter === item.key;
                  const count = item.key === 'allpost' ? allPostCount : item.key === 'drafts' ? draftCount : item.key === 'scheduled' ? scheduledCount : publishedCount;
                  return (
                    <button key={item.key} type="button" onClick={() => { setPostFilter(item.key); setIsFilterDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-body font-semibold flex items-center justify-between transition-colors ${active ? 'bg-amber-100 text-amber-800' : 'text-slate-700 hover:bg-slate-100'}`}>
                      <span>{item.label}</span>
                      <span className={`inline-flex min-w-4 h-4 px-1 rounded-full items-center justify-center text-[10px] ${active ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* List/Calendar view toggle */}
            <ViewModeToggle currentMode="list" onModeChange={mode => { if (mode === 'grid') navigate('/calendar'); }} />

            {/* TikTok connect */}
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

            {/* Generate ideas */}
            {canEdit && (
              <button onClick={handleGenerateIdea}
                className="h-9 px-4 rounded-full bg-[#f6b70a] border border-[#f6b70a] text-white text-xs font-headline font-bold transition-colors hover:bg-[#e2a700] shadow-[0_8px_16px_rgba(246,183,10,0.25)]"
                title="Generate ideas">
                Generate ideas
              </button>
            )}

            {/* New Post */}
            {canEdit && (
              <button onClick={() => { setFormError(null); setModal('create'); }}
                className="h-9 px-4 rounded-full bg-[#f6b70a] border border-[#f6b70a] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-[#e2a700] shadow-[0_8px_16px_rgba(246,183,10,0.25)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                New Post
              </button>
            )}

            {/* Profile */}
            <button onClick={() => navigate('/profile')}
              className="toolbar-pill w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors flex-shrink-0" title="Profile">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-body font-semibold">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        {/* List content */}
        <div className="list-shell flex-1 flex flex-col overflow-hidden">

          {/* Filter buttons: day/week/month */}
          <div className="flex items-center gap-2 px-6 pt-4 pb-3 bg-white border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
            {['day', 'week', 'month'].map((f) => (
              <button
                key={f}
                onClick={() => setListViewFilter(f as 'day' | 'week' | 'month')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  listViewFilter === f
                    ? 'bg-[#f6b70a] text-black shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Tabs: Scheduled | Drafts */}
          <div className="flex items-center gap-6 px-6 pt-4 pb-0 border-b border-slate-200 bg-white">
            <button onClick={() => setListTab('scheduled')}
              className={`pb-3 text-sm font-body transition-colors ${listTab === 'scheduled' ? 'list-tab-active' : 'list-tab-inactive hover:text-slate-700'}`}>
              Scheduled
              <span className="ml-2 inline-flex items-center justify-center px-1.5 h-4 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{scheduledCount}</span>
            </button>
            <button onClick={() => setListTab('drafts')}
              className={`pb-3 text-sm font-body transition-colors ${listTab === 'drafts' ? 'list-tab-active' : 'list-tab-inactive hover:text-slate-700'}`}>
              Drafts
              <span className="ml-2 inline-flex items-center justify-center px-1.5 h-4 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{draftCount}</span>
            </button>
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" />
              </div>
            )}

            {!loading && listTab === 'drafts' && (
              <div className="list-stats-bar">
                <div>
                  <div className="list-stats-val">{draftCount}</div>
                  <div className="list-stats-lbl">Total Drafts</div>
                </div>
                <div>
                  <div className="list-stats-val accent">{unscheduledDrafts}</div>
                  <div className="list-stats-lbl">Unscheduled</div>
                </div>
                <div>
                  <div className="list-stats-val">{scheduledDrafts}</div>
                  <div className="list-stats-lbl">Scheduled Drafts</div>
                </div>
              </div>
            )}

            {!loading && listItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="text-4xl">📭</div>
                <p className="text-slate-500 text-sm font-body">No content in this section yet</p>
                {canEdit && (
                  <button onClick={() => { setFormError(null); setModal('create'); }}
                    className="mt-2 h-9 px-5 rounded-full bg-[#f6b70a] text-white text-xs font-semibold hover:bg-[#e2a700] transition-colors">
                    + New Post
                  </button>
                )}
              </div>
            )}

            {!loading && sortedDateKeys.map(dateKey => {
              const items = groupedItems[dateKey];
              const headerLabel = formatDateHeader(dateKey);
              return (
                <div key={dateKey} className="space-y-3">
                  <p className="list-date-header">{headerLabel}</p>
                  {items.map(item => {
                    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                    const timeLabel = item.scheduled_at
                      ? dayjs(item.scheduled_at).tz(TZ).format('h:mm A')
                      : 'No time';
                    const timeSub = item.scheduled_at ? 'WIB' : null;
                    const createdAgo = item.created_at
                      ? dayjs(item.created_at).tz(TZ).fromNow()
                      : null;
                    const nameInitial = (item.created_by_name || 'K').trim().charAt(0).toUpperCase();

                    return (
                      <div key={item.id} className="list-card flex gap-0 cursor-pointer" onClick={() => handleCardClick(item)}>
                        {/* Left time column */}
                        <div className="flex flex-col items-center justify-start gap-1.5 px-4 py-4 min-w-[90px] border-r border-slate-100">
                          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{timeLabel}</span>
                          {timeSub && <span className="text-[10px] text-slate-400 font-body">{timeSub}</span>}
                          <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 px-4 py-4 min-w-0">
                          {/* Top: avatar + title */}
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {nameInitial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                                {item.custom_caption || item.title || 'Untitled'}
                              </p>
                              {item.created_by_name && (
                                <p className="text-[10px] text-slate-400 font-body mt-0.5">{item.created_by_name}</p>
                              )}
                            </div>
                          </div>

                          {/* Hashtags */}
                          {item.custom_hashtags && item.custom_hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2 ml-10">
                              {item.custom_hashtags.slice(0, 5).map((tag, i) => (
                                <span key={i} className="text-[11px] font-semibold" style={{ color: YELLOW_ACTIVE }}>{tag}</span>
                              ))}
                            </div>
                          )}

                          {/* Media type indicator */}
                          <div className="flex items-center gap-1 ml-10 mb-3">
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span className="text-[10px] text-slate-400 font-body">Photo</span>
                          </div>

                          {/* Bottom: created time + actions */}
                          <div className="flex items-center justify-between ml-10" onClick={e => e.stopPropagation()}>
                            <span className="text-[10px] text-slate-400 font-body">
                              {createdAgo ? `Created ${createdAgo}` : ''}
                            </span>
                            {canEdit && (
                              <div className="flex items-center gap-2">
                                {item.status !== 'published' && (
                                  <button
                                    onClick={() => handlePublishNow(item)}
                                    disabled={publishLoadingId === item.id}
                                    className="h-7 px-3 rounded-full text-[10px] font-bold border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-colors flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                                    {publishLoadingId === item.id ? '…' : 'Add to Queue'}
                                  </button>
                                )}
                                <button
                                  onClick={() => { setActiveSchedule(item); setFormError(null); setModal('edit'); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button
                                  onClick={() => { if (window.confirm('Delete this post?')) handleDelete(item.id); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right thumbnail placeholder */}
                        <div className="w-20 h-20 m-4 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          <span className="text-[10px] text-slate-400 font-body">photo</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'create' && canEdit && (
        <ScheduleModal mode="create" onClose={() => setModal(null)} onSave={handleCreateSave} loading={formLoading} error={formError} />
      )}
      {modal === 'edit' && activeSchedule && canEdit && (
        <ScheduleModal mode="edit" initial={activeSchedule} onClose={() => setModal('detail')} onSave={handleEditSave} loading={formLoading} error={formError} />
      )}
      {modal === 'detail' && activeSchedule && (
        <DetailModal schedule={activeSchedule} assets={assets} loadingAssets={loadingAssets}
          onClose={() => setModal(null)}
          onEdit={s => { setActiveSchedule(s); setFormError(null); setModal('edit'); }}
          onDelete={handleDelete}
          onPublish={handlePublishNow}
          publishLoading={publishLoadingId === activeSchedule.id}
          onMediaUpload={handleMediaUpload}
          onMediaDeleted={id => setAssets(prev => prev.filter(a => a.id !== id))}
          onMediaDelete={handleMediaDelete}
          canEdit={canEdit} />
      )}

      {/* ── AI Chatbot FAB ── */}
      <AIChatbot openOnMount={chatbotDrawerOpen} onOpenChange={setChatbotDrawerOpen} />
    </div>
  );
}
