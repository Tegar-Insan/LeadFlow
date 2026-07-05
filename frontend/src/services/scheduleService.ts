// src/services/scheduleService.js
// Content Calendar CRUD — LeadFlow Krench Chicken

import api from './authService';

export const fetchCalendarMonth = (year, month) =>
  api.get('/calendar', { params: { year, month } });

export const fetchDrafts = () =>
  api.get('/calendar/drafts');

export const fetchScheduleById = (id) =>
  api.get(`/calendar/${id}`);

export const createSchedule = (payload) =>
  api.post('/calendar', payload);

export const updateSchedule = (id, payload) =>
  api.put(`/calendar/${id}`, payload);

export const moveSchedule = (id, scheduledAt) =>
  api.patch(`/calendar/${id}/move`, { scheduled_at: scheduledAt });

// Draft-only: queues the content for the same WIB time tomorrow. Backend
// rejects (409) anything that isn't currently a draft.
export const addScheduleToQueue = (id) =>
  api.patch(`/calendar/${id}/add-to-queue`);

export const deleteSchedule = (id) =>
  api.delete(`/calendar/${id}`);

// TikTok publish is a genuinely long-running call server-side: media init,
// TikTok re-fetching the photo/video up to 3x, then status polling up to
// 6 attempts x 3s. The shared `api` instance's 15s default timeout was
// fine while every PULL_FROM_URL photo publish failed fast on TikTok's
// format check — now that publishes actually complete, they were exceeding
// 15s and showing a client-side timeout error even on a successful publish.
export const publishScheduleNow = (id) =>
  api.post(`/tiktok/publish/${id}`, undefined, { timeout: 60000 });

export const fetchSchedulesForList = (filter = 'month', date) =>
  api.get('/calendar/list', { params: { filter, date } });