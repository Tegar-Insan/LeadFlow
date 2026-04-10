// src/services/profileService.js
import api from './authService';

export const getProfile     = ()     => api.get('/profile/me');
export const updateProfile  = (data) => api.put('/profile/me', data);
export const changePassword = (data) => api.put('/profile/me/password', data);

export const uploadPhoto = (file) => {
  const form = new FormData();
  form.append('photo', file);
  return api.post('/profile/me/photo', form);
};
