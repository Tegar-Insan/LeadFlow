/**
 * MediaUploader.jsx
 * File upload component — photos + videos for TikTok content
 * Supports: single photo, carousel (multi-photo), single video
 * LeadFlow – Krench Chicken
 */

import React, { useRef, useState, useCallback } from 'react';
import { uploadMedia, deleteMediaAsset } from '../../services/mediaService';

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi';
const MAX_SIZE_MB = 200;

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FilePreviewItem = ({ file, url, index, onRemove }) => {
  const isVideo = file?.type?.startsWith('video/');
  return (
    <div className="relative group rounded-lg overflow-hidden bg-zinc-800 border border-white/10">
      {isVideo ? (
        <video
          src={url}
          className="w-full h-28 object-cover"
          muted
          onMouseEnter={e => e.target.play()}
          onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
        />
      ) : (
        <img src={url} alt={`upload-${index}`} className="w-full h-28 object-cover" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          onClick={() => onRemove(index)}
          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* File info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 px-2 py-1">
        <p className="text-[10px] text-white truncate">{file?.name}</p>
        {isVideo && <span className="text-[9px] text-zinc-400">🎬 Video</span>}
        <span className="text-[9px] text-zinc-400 ml-1">{formatBytes(file?.size)}</span>
      </div>

      {/* Slide order badge */}
      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-[10px] text-white font-bold">
        {index + 1}
      </div>
    </div>
  );
};

const ExistingAssetItem = ({ asset, onDelete }) => {
  const isVideo = asset.mime_type?.startsWith('video/');
  return (
    <div className="relative group rounded-lg overflow-hidden bg-zinc-800 border border-white/10">
      {isVideo ? (
        <video src={asset.file_url} className="w-full h-28 object-cover" muted />
      ) : (
        <img src={asset.file_url} alt={asset.file_name} className="w-full h-28 object-cover" />
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          onClick={() => onDelete(asset.id)}
          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 px-2 py-1">
        <p className="text-[10px] text-white truncate">{asset.file_name}</p>
      </div>
      {asset.is_primary && (
        <div className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] font-bold px-1 rounded">
          PRIMARY
        </div>
      )}
    </div>
  );
};

const MediaUploader = ({
  scheduleId,
  existingAssets = [],
  onUploadComplete,
  onAssetDeleted,
  disabled = false,
}) => {
  const inputRef        = useRef(null);
  const [files,         setFiles]         = useState([]);  // pending File objects
  const [previews,      setPreviews]       = useState([]);  // object URLs
  const [uploading,     setUploading]      = useState(false);
  const [progress,      setProgress]       = useState(0);
  const [uploadError,   setUploadError]    = useState(null);
  const [isDragOver,    setIsDragOver]     = useState(false);

  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`${f.name} exceeds the ${MAX_SIZE_MB} MB size limit`);
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
    const newPreviews = valid.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const removeFile = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!files.length || !scheduleId) return;
    setUploading(true);
    setUploadError(null);
    setProgress(0);
    try {
      const res = await uploadMedia(scheduleId, files, setProgress);
      // Clear pending files
      previews.forEach(url => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviews([]);
      setProgress(100);
      onUploadComplete?.(res.data.data.assets);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteExisting = async (assetId) => {
    if (!confirm('Delete this media file?')) return;
    try {
      await deleteMediaAsset(assetId);
      onAssetDeleted?.(assetId);
    } catch {
      alert('Failed to delete media. Please try again.');
    }
  };

  return (
    <div className="space-y-4">

      {/* Existing assets grid */}
      {existingAssets.length > 0 && (
        <div>
          <p className="text-[10px] font-headline font-bold text-text-secondary uppercase tracking-widest mb-2">
            Uploaded Media
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {existingAssets.map(asset => (
              <ExistingAssetItem
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteExisting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      {!disabled && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
            transition-all duration-200
            ${isDragOver
              ? 'border-brand bg-brand/[0.08]'
              : 'border-white/[0.12] hover:border-brand/50 hover:bg-white/[0.03]'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">
              {isDragOver ? '⬇️' : '📁'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isDragOver ? 'Drop files here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Photos (JPG, PNG, WEBP) or Videos (MP4, MOV) · Max {MAX_SIZE_MB} MB each
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Multiple images = Carousel post
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending files preview */}
      {files.length > 0 && (
        <div>
          <p className="text-[10px] font-headline font-bold text-text-secondary uppercase tracking-widest mb-2">
            Ready to Upload ({files.length} file{files.length > 1 ? 's' : ''})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {files.map((file, i) => (
              <FilePreviewItem
                key={i}
                file={file}
                url={previews[i]}
                index={i}
                onRemove={removeFile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {uploadError && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
          {uploadError}
        </p>
      )}

      {/* Upload button */}
      {files.length > 0 && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full h-10 rounded-xl bg-brand hover:bg-brand-dark text-black text-sm font-headline font-bold transition-all hover:shadow-[0_0_20px_rgba(246,183,10,0.3)]"
        >
          Upload {files.length} File{files.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
};

export default MediaUploader;
