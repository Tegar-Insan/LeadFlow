// src/services/profileService.js
import api from './authService';

export const getProfile      = ()       => api.get('/profile/me');
export const updateProfile   = (data)   => api.put('/profile/me', data);
export const changePassword  = (data)   => api.put('/profile/me/password', data);
