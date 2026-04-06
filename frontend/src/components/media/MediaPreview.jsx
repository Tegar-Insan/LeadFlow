/**
 * MediaPreview.jsx
 * Compact media asset preview for schedule detail view
 * LeadFlow – Krench Chicken
 */

import React, { useState } from 'react';

const ASSET_TYPE_ICON = {
  video:    '🎬',
  photo:    '📷',
  carousel: '🖼️',
};

const MediaPreview = ({ assets = [] }) => {
  const [selected, setSelected] = useState(null);

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

  const assetType = assets[0]?.asset_type;

  return (
    <>
      {/* Grid */}
      <div className={`grid gap-2 ${assets.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {assets.map((asset, i) => {
          const isVideo = asset.mime_type?.startsWith('video/');
          return (
            <button
              key={asset.id}
              onClick={() => setSelected(asset)}
              className="relative rounded-lg overflow-hidden bg-zinc-800 border border-white/10 hover:border-white/30 transition-colors group"
            >
              {isVideo ? (
                <div className="relative">
                  <video
                    src={asset.file_url}
                    className="w-full h-28 object-cover"
                    muted
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
                <img
                  src={asset.file_url}
                  alt={asset.file_name}
                  className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                />
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
            </button>
          );
        })}
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-sm">{ASSET_TYPE_ICON[assetType]}</span>
        <span className="text-xs text-zinc-400 capitalize">
          {assetType} · {assets.length} file{assets.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Lightbox modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          onClick={() => setSelected(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
            {selected.mime_type?.startsWith('video/') ? (
              <video
                src={selected.file_url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-xl"
              />
            ) : (
              <img
                src={selected.file_url}
                alt={selected.file_name}
                className="max-w-full max-h-[80vh] rounded-xl object-contain"
              />
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
