// src/services/analyticsService.ts
// Analytics API client for Business Owner Dashboard

import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

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

export interface OwnerAnalytics {
  totalPublishedContent: number;
  tiktokPublishedCount: number;
  totalScheduledContent: number;
  totalDraftContent: number;
}

export const getOwnerAnalytics = async (): Promise<OwnerAnalytics> => {
  const { data } = await api.get('/analytics/owner-summary');
  return data.data.analytics;
};

export default api;
