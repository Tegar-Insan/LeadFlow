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
 * Send a single conversation turn to the AI assistant. History is owned by
 * the backend (chatbot_sessions/chatbot_messages) — only the new message is
 * sent; the server loads prior context from the DB.
 * @param {string|null} sessionId — null/undefined resumes (or creates) the caller's active session
 * @param {string} message
 * @returns {Promise<{ session_id: string, reply: string, type: 'text'|'schedule_recommendation', schedules: object[], model: string }>}
 */
export const sendChatMessage = async (sessionId, message) => {
  const res = await axios.post(
    `${API}/chatbot/message`,
    { session_id: sessionId ?? undefined, message },
    { headers: authHeader() }
  );
  return res.data.data;
};

/**
 * List the caller's chat sessions, most recently active first.
 * @returns {Promise<Array<{ id: string, title: string|null, last_message_at: string }>>}
 */
export const getChatSessions = async () => {
  const res = await axios.get(`${API}/chatbot/sessions`, { headers: authHeader() });
  return res.data.data.sessions;
};

/**
 * Fetch the full message history for one session (oldest first).
 * @param {string} sessionId
 * @returns {Promise<Array<{ id: string, role: 'user'|'assistant', content: string, message_type: string, schedules: object[]|null, created_at: string }>>}
 */
export const getChatSessionMessages = async (sessionId) => {
  const res = await axios.get(`${API}/chatbot/sessions/${sessionId}/messages`, { headers: authHeader() });
  return res.data.data.messages;
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
 * AI agent flow (non-chat): generate and create a schedule in one backend call.
 * @param {string} brief
 * @returns {Promise<{ schedule: object, recommendation: object, reply: string, model: string }>}
 */
export const generateScheduleWithAgent = async (brief) => {
  const res = await axios.post(
    `${API}/chatbot/agent/generate-schedule`,
    { brief },
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
