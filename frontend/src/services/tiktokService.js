// src/services/tiktokService.js
// TikTok Login Kit v2 — API call layer

import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${getAccessToken()}` });

export const getTikTokAuthUrl = async () => {
  const res = await axios.get(`${API}/tiktok/auth-url`, { headers: authHeader() });
  return res.data.data; // { url }
};

export const getTikTokStatus = async () => {
  const res = await axios.get(`${API}/tiktok/status`, { headers: authHeader() });
  return res.data.data; // connected row or null
};

export const disconnectTikTok = async () => {
  const res = await axios.post(`${API}/tiktok/disconnect`, {}, { headers: authHeader() });
  return res.data.data;
};
