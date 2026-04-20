// src/config/tiktok.js
// TikTok Login Kit v2 — OAuth configuration

const TIKTOK_CONFIG = {
  clientKey:    process.env.TIKTOK_CLIENT_KEY    || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri:  process.env.TIKTOK_REDIRECT_URI  || 'http://localhost:5000/api/tiktok/callback',
  frontendUrl:  process.env.FRONTEND_BASE_URL    || 'http://localhost:5173',

  authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  tokenUrl:     'https://open.tiktokapis.com/v2/oauth/token/',
  userInfoUrl:  'https://open.tiktokapis.com/v2/user/info/',

  // video.publish + video.upload require TikTok Content Posting API approval (Phase 2)
  scopes: 'user.info.basic',
};

function validateTikTokConfig() {
  const missing = [];
  if (!TIKTOK_CONFIG.clientKey)    missing.push('TIKTOK_CLIENT_KEY');
  if (!TIKTOK_CONFIG.clientSecret) missing.push('TIKTOK_CLIENT_SECRET');
  if (missing.length) throw new Error(`Missing TikTok env vars: ${missing.join(', ')}`);
}

module.exports = { TIKTOK_CONFIG, validateTikTokConfig };
