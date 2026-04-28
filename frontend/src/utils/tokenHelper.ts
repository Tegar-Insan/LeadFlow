// src/utils/tokenHelper.js
// localStorage helpers for JWT token + user session
// LeadFlow – Krench Chicken

const ACCESS_TOKEN_KEY  = 'lf_access_token';
const USER_KEY          = 'lf_user';

// ── Access Token ──────────────────────────────────────────────
export const getAccessToken  = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const setAccessToken  = (token) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
export const removeAccessToken = () => localStorage.removeItem(ACCESS_TOKEN_KEY);

// ── User object ───────────────────────────────────────────────
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const setStoredUser   = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const removeStoredUser = () => localStorage.removeItem(USER_KEY);

// ── Clear everything ──────────────────────────────────────────
export const clearAuthStorage = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};