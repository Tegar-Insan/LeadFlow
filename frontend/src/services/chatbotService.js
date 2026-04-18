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
