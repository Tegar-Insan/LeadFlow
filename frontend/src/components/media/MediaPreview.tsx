/**
 * MediaPreview.jsx
 * Compact media asset preview for schedule detail view
 * LeadFlow – Krench Chicken
 */

import React, { useEffect, useMemo, useState } from 'react';

const ASSET_TYPE_ICON = {
  video:    '🎬',
  photo:    '📷',
  carousel: '🖼️',
};

const getAssetUrl = (asset) => asset?.preview_url
  || asset?.file_url
  || asset?.url
  || asset?.signed_url
  || '';

const getAssetKind = (asset) => {
  const mimeType = String(asset?.mime_type || '').toLowerCase();
  const contentType = String(asset?.content_type || asset?.asset_type || '').toLowerCase();
  const sourceName = String(asset?.file_name || asset?.name || asset?.url || asset?.file_url || asset?.preview_url || '').toLowerCase();

  if (
    mimeType.startsWith('video/')
    || contentType === 'short_video'
    || contentType === 'video'
    || /\.(mp4|mov|webm|avi)$/i.test(sourceName)
  ) {
    return 'video';
  }

  if (contentType === 'carousel' || Array.isArray(asset?.items)) {
    return 'carousel';
  }

  if (
    mimeType.startsWith('image/')
    || contentType === 'poster_photo'
    || contentType === 'photo'
    || /\.(jpe?g|png|webp|gif)$/i.test(sourceName)
  ) {
    return 'photo';
  }

  return 'photo';
};

const getAssetLabel = (asset) => asset?.file_name || asset?.name || 'Untitled media';

const getPreviewKind = (assets) => {
  if (!assets.length) return 'photo';
  const firstKind = getAssetKind(assets[0]);
  if (assets.length > 1 && firstKind !== 'video') return 'carousel';
  return firstKind;
};

const MediaPreview = ({ assets = [], onDeleteAsset }) => {
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [brokenAssets, setBrokenAssets] = useState([]);

  useEffect(() => {
    setBrokenAssets([]);
  }, [assets]);

  const selectedUrl = selected ? getAssetUrl(selected) : '';
  const selectedKind = selected ? getAssetKind(selected) : 'photo';
  const selectedBroken = selected ? brokenAssets.includes(selected.id) : false;
  const previewKind = useMemo(() => getPreviewKind(assets), [assets]);

  if (!assets.length) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl bg-zinc-800/50 border border-dashed border-zinc-600">
        <div className="text-center">
          <p className="text-2xl">📷</p>
          <p className="text-xs text-zinc-500 mt-1">No media uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Grid */}
      <div className={`grid gap-2 ${assets.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {assets.map((asset, i) => {
          const url = getAssetUrl(asset);
          const kind = getAssetKind(asset);
          const isBroken = !url || brokenAssets.includes(asset.id);
          const showVideo = kind === 'video' && !isBroken;
          return (
            <div
              key={asset.id}
              className="relative rounded-lg overflow-hidden bg-zinc-800 border border-white/10 hover:border-white/30 transition-colors group"
            >
              <button
                type="button"
                onClick={() => setSelected(asset)}
                className="block w-full text-left"
              >
                {showVideo ? (
                  <div className="relative">
                    <video
                      src={url}
                      className="w-full h-28 object-cover"
                      muted
                      playsInline
                      onError={() => setBrokenAssets(prev => (prev.includes(asset.id) ? prev : [...prev, asset.id]))}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  isBroken ? (
                    <div className="w-full h-28 flex flex-col items-center justify-center gap-1 px-2 bg-zinc-900 text-center">
                      <span className="text-xl">{ASSET_TYPE_ICON[kind] || '📄'}</span>
                      <span className="text-[10px] text-zinc-500 truncate w-full">Preview unavailable</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={getAssetLabel(asset)}
                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={() => setBrokenAssets(prev => (prev.includes(asset.id) ? prev : [...prev, asset.id]))}
                      loading="lazy"
                      decoding="async"
                    />
                  )
                )}
              </button>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2 pt-6 pb-1 pointer-events-none">
                <p className="text-[10px] text-white truncate font-medium">
                  {getAssetLabel(asset)}
                </p>
              </div>

              {onDeleteAsset && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm('Delete this media file?');
                    if (!confirmed) return;
                    try {
                      setDeletingId(asset.id);
                      await onDeleteAsset(asset);
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                  disabled={deletingId === asset.id}
                  className="absolute bottom-1 right-1 z-10 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-70 disabled:cursor-not-allowed text-white text-[11px] font-bold flex items-center justify-center shadow-lg transition-colors"
                  title="Delete media"
                >
                  {deletingId === asset.id ? '…' : '×'}
                </button>
              )}

              {asset.is_primary && (
                <div className="absolute top-1 left-1 bg-amber-500 text-black text-[9px] font-bold px-1 rounded">
                  COVER
                </div>
              )}
              {assets.length > 1 && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </div>
              )}
              {isBroken && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <span className="sr-only">Broken preview</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-sm">{ASSET_TYPE_ICON[previewKind]}</span>
        <span className="text-xs text-zinc-400 capitalize">
          {previewKind} · {assets.length} file{assets.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Lightbox modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          onClick={() => setSelected(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
            {selectedKind === 'video' && selectedUrl && !selectedBroken ? (
              <video
                src={selectedUrl}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-xl"
                onError={() => setBrokenAssets(prev => (prev.includes(selected.id) ? prev : [...prev, selected.id]))}
              />
            ) : (
              selectedUrl && !selectedBroken ? (
                <img
                  src={selectedUrl}
                  alt={getAssetLabel(selected)}
                  className="max-w-full max-h-[80vh] rounded-xl object-contain"
                  onError={() => setBrokenAssets(prev => (prev.includes(selected.id) ? prev : [...prev, selected.id]))}
                />
              ) : (
                <div className="w-[min(92vw,48rem)] h-[min(80vh,28rem)] rounded-xl border border-white/10 bg-zinc-900 flex flex-col items-center justify-center text-center px-6">
                  <span className="text-5xl mb-4">{ASSET_TYPE_ICON[selectedKind] || '📄'}</span>
                  <p className="text-white font-semibold">Preview unavailable</p>
                  <p className="text-zinc-400 text-sm mt-1 break-all">{getAssetLabel(selected)}</p>
                </div>
              )
            )}
            <button
              onClick={() => setSelected(null)}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaPreview;
