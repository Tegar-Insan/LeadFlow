/**
 * chatbotService.js
 * Sends chat messages to the LeadFlow AI assistant backend.
 * LeadFlow — UC Chatbot (AI Assistant)
 */

import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Send a conversation to the AI assistant.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @returns {Promise<{reply: string, model: string, usage: object}>}
 */
export const sendChatMessage = async (messages) => {
  const token = localStorage.getItem('token');
  const res = await axios.post(
    `${API}/api/chatbot/message`,
    { messages },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.data; // { reply, role, model, usage }
};
