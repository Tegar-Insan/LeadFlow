// src/utils/tokenHelper.js
// Access token storage and retrieval helpers

import { STORAGE_KEYS } from './constants';

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setAccessToken(token) {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export function removeAccessToken() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function clearAuthStorage() {
  removeAccessToken();
  removeStoredUser();
  localStorage.removeItem(STORAGE_KEYS.PENDING_EMAIL);
}

/** Decode JWT payload without verification (client-side only, not for security checks) */
export function decodeTokenPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Check if a token is expired (client-side estimate only) */
export function isTokenExpired(token) {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

