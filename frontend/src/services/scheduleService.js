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

export const deleteSchedule = (id) =>
  api.delete(`/calendar/${id}`);