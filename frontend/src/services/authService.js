// src/services/authService.js
// Auth API call layer — frontend ↔ backend

import axios from 'axios';
import { getAccessToken, setAccessToken, clearAuthStorage } from '../utils/tokenHelper';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let queue = [];
const processQueue = (err, token = null) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry && !orig.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then((token) => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); });
      }
      orig._retry  = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        orig.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(orig);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthStorage();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth API calls ────────────────────────────────────────────
export const registerInitiate = (payload) =>
  api.post('/auth/register', payload).then((r) => r.data);

export const registerVerifyOTP = (payload) =>
  api.post('/auth/verify-otp', payload).then((r) => r.data);

export const loginUser = (payload) =>
  api.post('/auth/login', payload).then((r) => r.data);

export const logoutUser = () =>
  api.post('/auth/logout').then((r) => r.data);

export const getMe = () =>
  api.get('/auth/me').then((r) => r.data);

export const resendOTP = (payload) =>
  api.post('/auth/resend-otp', payload).then((r) => r.data);

export const getRoles = () =>
  api.get('/auth/roles').then((r) => r.data);

export default api;
