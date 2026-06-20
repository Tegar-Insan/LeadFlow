// src/services/adminService.ts
// Admin API call layer — all calls require admin role (CRUD for users)

import api from './authService';

// ─────────────────── READ ───────────────────

/**
 * Fetch all registered users (Business Owners, Marketing Staff, Admins)
 * @param params - query params (limit, offset, search, role_filter)
 * @returns { success, data: { users: [...] } }
 */
export const getAllUsers = (params = {}) =>
  api.get('/admin/users', { params }).then((r) => r.data);

/**
 * Fetch a single user by ID
 * @param userId - user UUID
 * @returns { success, data: user }
 */
export const getUserById = (userId: string) =>
  api.get(`/admin/users/${userId}`).then((r) => r.data);

// ─────────────────── CREATE ───────────────────

/**
 * Create a new user account (admin action)
 * @param payload - { email, full_name, phone, role_name, password }
 * @returns { success, data: user }
 */
export const createUser = (payload: {
  email: string;
  full_name: string;
  phone?: string;
  role_name: 'business_owner' | 'marketing_staff';
  password: string;
}) => api.post('/admin/users', payload).then((r) => r.data);

// ─────────────────── UPDATE ───────────────────

/**
 * Update user profile details (name, email, phone)
 * @param userId - user UUID
 * @param payload - { full_name?, email?, phone? }
 * @returns { success, data: user }
 */
export const updateUserDetails = (
  userId: string,
  payload: {
    full_name?: string;
    email?: string;
    phone?: string;
  }
) => api.put(`/admin/users/${userId}`, payload).then((r) => r.data);

/**
 * Change user role (business_owner ↔ marketing_staff)
 * @param userId - user UUID
 * @param roleName - 'business_owner' or 'marketing_staff'
 * @returns { success, data: user }
 */
export const updateUserRole = (
  userId: string,
  roleName: 'business_owner' | 'marketing_staff'
) => api.put(`/admin/users/${userId}/role`, { roleName }).then((r) => r.data);

/**
 * Toggle user active/inactive status
 * @param userId - user UUID
 * @param isActive - true or false
 * @returns { success, data: user }
 */
export const toggleUserStatus = (userId: string, isActive: boolean) =>
  api.put(`/admin/users/${userId}/status`, { isActive }).then((r) => r.data);

/**
 * Reset user password (admin-initiated)
 * @param userId - user UUID
 * @param newPassword - new password
 * @returns { success, message }
 */
export const resetUserPassword = (userId: string, newPassword: string) =>
  api.put(`/admin/users/${userId}/password`, { password: newPassword }).then(
    (r) => r.data
  );

// ─────────────────── DELETE ───────────────────

/**
 * Delete a user account permanently
 * @param userId - user UUID
 * @returns { success, message }
 */
export const deleteUser = (userId: string) =>
  api.delete(`/admin/users/${userId}`).then((r) => r.data);
