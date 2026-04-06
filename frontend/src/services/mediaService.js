// src/services/mediaService.js
// Media Upload (UC008) — LeadFlow Krench Chicken

import api from './authService';

export const uploadMedia = (scheduleId, files, onProgress) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return api.post(`/media/upload/${scheduleId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
};

export const fetchMediaBySchedule = (scheduleId) =>
  api.get(`/media/${scheduleId}`);

export const deleteMediaAsset = (assetId) =>
  api.delete(`/media/${assetId}`);