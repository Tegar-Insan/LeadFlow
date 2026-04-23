// src/config/tiktok.js
// TikTok Login Kit v2 — OAuth configuration

const TIKTOK_CONFIG = {
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:5000/api/tiktok/callback',
  frontendUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  mediaPublicBaseUrl: process.env.TIKTOK_MEDIA_PUBLIC_BASE_URL || '',

  authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',

  // Content Posting API
  publishVideoInitUrl: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
  publishInboxVideoInitUrl: 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
  publishPhotoInitUrl: 'https://open.tiktokapis.com/v2/post/publish/content/init/',
  publishStatusFetchUrl: 'https://open.tiktokapis.com/v2/post/publish/status/fetch/',

  scopes: 'user.info.basic,video.publish,video.upload,video.list',
};

function validateTikTokConfig() {
  const missing = [];
  if (!TIKTOK_CONFIG.clientKey) missing.push('TIKTOK_CLIENT_KEY');
  if (!TIKTOK_CONFIG.clientSecret) missing.push('TIKTOK_CLIENT_SECRET');
  if (!process.env.TIKTOK_TOKEN_ENCRYPTION_KEY) missing.push('TIKTOK_TOKEN_ENCRYPTION_KEY');
  if (!TIKTOK_CONFIG.mediaPublicBaseUrl) missing.push('TIKTOK_MEDIA_PUBLIC_BASE_URL');

  if (missing.length) {
    throw new Error(`Missing TikTok env vars: ${missing.join(', ')}`);
  }
}

module.exports = { TIKTOK_CONFIG, validateTikTokConfig };
