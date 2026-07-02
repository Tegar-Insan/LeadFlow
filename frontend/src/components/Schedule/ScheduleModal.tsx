/**
 * ScheduleModal.tsx
 * Create/Edit content schedule modal — shared by CalendarPage, ListPage, and
 * GeneratedIdeasPage so the form only exists in one place.
 * LeadFlow – Krench Chicken (UC007)
 */
import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { toDatetimeLocal, datetimeLocalToUTCiso, TZ } from '../../utils/formatDate';
import { fetchMediaBySchedule } from '../../services/mediaService';
import MediaPreview from '../media/MediaPreview';

dayjs.extend(utc);
dayjs.extend(timezone);

const EMPTY_POST_SLOT = () => ({
  title: '', caption: '', hashtags: '',
  mediaType: 'photo', mediaFiles: [], mediaPreviews: [], mediaDropOver: false,
});

const ScheduleModal = ({ mode, initial = {}, initialDate, initialHour, onClose, onSave, loading, error }: any) => {
  const defaultTime = initialHour != null
    ? `${initialDate}T${String(initialHour).padStart(2,'0')}:00`
    : initialDate ? `${initialDate}T10:00` : '';
  const fallbackScheduledTime = dayjs().tz(TZ).add(1, 'hour').format('YYYY-MM-DDTHH:mm');

  // ── Existing media (edit mode) ──────────────────────────────
  // Fetched here rather than by each host page (CalendarPage/ListPage/
  // GeneratedIdeasPage) — this modal already knows the schedule id, so it
  // can own showing what's already attached (real uploads AND the
  // AI-generated cover from idea approval) instead of always rendering a
  // blank dropzone regardless of existing content_assets rows.
  const [existingAssets, setExistingAssets] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !initial.id) return;
    let cancelled = false;
    setLoadingExisting(true);
    fetchMediaBySchedule(initial.id)
      .then((r) => { if (!cancelled) setExistingAssets(r.data?.data?.assets || []); })
      .catch(() => { if (!cancelled) setExistingAssets([]); })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, [mode, initial.id]);

  // ── Bulk count (create-only) ────────────────────────────────
  const [postCount, setPostCount] = useState(1);
  const [activeTab, setActiveTab] = useState(0);

  // ── Per-post state array ────────────────────────────────────
  // Falls back to the AI-original content_title/tiktok_caption/hashtag (from
  // the linked content_ideas row) only when no manual custom_* override has
  // ever been set — matches the same custom_caption || title convention
  // already used by LibraryCard/SlotCard.
  const [posts, setPosts] = useState(() => [
    mode === 'edit'
      ? {
          ...EMPTY_POST_SLOT(),
          title:    initial.custom_caption || initial.title || initial.content_title || '',
          caption:  initial.custom_caption || initial.tiktok_caption || '',
          hashtags: ((initial.custom_hashtags?.length ? initial.custom_hashtags : initial.hashtag) || []).join(' '),
        }
      : EMPTY_POST_SLOT(),
  ]);

  // ── Shared state ────────────────────────────────────────────
  const [shared, setShared] = useState({
    scheduled_at:  initial.scheduled_at ? toDatetimeLocal(initial.scheduled_at) : defaultTime,
    priority:      initial.priority_order || initial.priority || 0,
    auto_publish:  initial.auto_publish !== false,
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

        {/* Existing media already attached to this schedule (edit mode) —
            includes the AI-generated cover from idea approval, so it's not
            invisible just because no new files have been picked yet. */}
        {mode === 'edit' && (
          loadingExisting ? (
            <p className="text-[11px] text-text-muted font-body">Loading existing media…</p>
          ) : existingAssets.length > 0 ? (
            <div>
              <p className="text-[10px] font-body font-semibold text-text-muted uppercase tracking-widest mb-1.5">
                Currently attached
              </p>
              <MediaPreview assets={existingAssets} onDeleteAsset={undefined} />
            </div>
          ) : null
        )}

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

              <div>
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

export default ScheduleModal;
