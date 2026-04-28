// src/services/adminService.js
// Admin API call layer — all calls require admin role

import api from './authService';

export const getAllUsers = (params = {}) =>
  api.get('/admin/users', { params }).then((r) => r.data);

export const updateUserRole = (userId, roleName) =>
  api.put(`/admin/users/${userId}/role`, { roleName }).then((r) => r.data);

export const toggleUserStatus = (userId, isActive) =>
  api.put(`/admin/users/${userId}/status`, { isActive }).then((r) => r.data);

export const createUser = (payload) =>
  api.post('/admin/users', payload).then((r) => r.data);

export const deleteUser = (userId) =>
  api.delete(`/admin/users/${userId}`).then((r) => r.data);
