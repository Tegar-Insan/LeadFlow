// src/services/profileService.js
import api from './authService';

export const getProfile     = ()     => api.get('/profile/me');
export const updateProfile  = (data) => api.put('/profile/me', data);
export const changePassword = (data) => api.put('/profile/me/password', data);

/**
 * Upload a profile photo.
 * Content-Type must be left undefined so axios auto-attaches the
 * multipart/form-data boundary — the default 'application/json' header set in
 * authService would otherwise break multer on the backend.
 */
export const uploadPhoto = (file) => {
  const form = new FormData();
  form.append('photo', file);
  return api.post('/profile/me/photo', form, {
    headers: { 'Content-Type': undefined },
  });
};

/** Delete the current active profile photo. */
export const deletePhoto = () => api.delete('/profile/me/photo');

/** Fetch full photo upload history for the logged-in user. */
export const getPhotoHistory = () => api.get('/profile/me/photos');
