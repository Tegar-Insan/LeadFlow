/**
 * chatbotService.js
 * API layer for the Gemini-powered AI chat assistant.
 * LeadFlow — UC Chatbot (AI Assistant)
 */

import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const authHeader = () => ({
  Authorization: `Bearer ${getAccessToken()}`,
});

/**
 * Send a conversation turn to the AI assistant.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @returns {Promise<{ reply: string, type: 'text'|'schedule_recommendation', schedule: object|null, model: string }>}
 */
export const sendChatMessage = async (messages) => {
  const res = await axios.post(
    `${API}/chatbot/message`,
    { messages },
    { headers: authHeader() }
  );
  return res.data.data;
};

/**
 * Approve a schedule recommendation — creates a real calendar entry.
 * @param {object} schedule — { title, caption, hashtags, scheduled_at, ... }
 * @returns {Promise<{ schedule: object }>}
 */
export const approveScheduleFromChat = async (schedule) => {
  const res = await axios.post(
    `${API}/chatbot/approve-schedule`,
    { schedule },
    { headers: authHeader() }
  );
  return res.data.data;
};

/**
 * Reject a schedule recommendation — returns an acknowledgement message.
 * @returns {Promise<{ reply: string, type: 'text' }>}
 */
export const rejectScheduleFromChat = async () => {
  const res = await axios.post(
    `${API}/chatbot/reject-schedule`,
    {},
    { headers: authHeader() }
  );
  return res.data.data;
};

/**
 * Fetch upcoming scheduled content cards for display in the chatbot drawer.
 * Pulls current + next month, filters to future items, sorts ascending, caps at 8.
 * @returns {Promise<Array>}
 */
export const fetchUpcomingSchedules = async () => {
  const now       = new Date();
  const year      = now.getFullYear();
  const month     = now.getMonth() + 1;
  const nextYear  = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const [curr, next] = await Promise.allSettled([
    axios.get(`${API}/calendar`, { params: { year, month },                        headers: authHeader() }),
    axios.get(`${API}/calendar`, { params: { year: nextYear, month: nextMonth },   headers: authHeader() }),
  ]);

  const nowISO  = now.toISOString();
  const extract = (r) => (r.status === 'fulfilled' ? r.value?.data?.data?.schedules : null) || [];

  return [...extract(curr), ...extract(next)]
    .filter(s => s.scheduled_at && s.scheduled_at > nowISO)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 8);
};
