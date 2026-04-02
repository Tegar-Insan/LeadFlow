// src/config/tiktok.js
// TikTok Business API configuration constants

const TIKTOK_CONFIG = {
    appId:       process.env.TIKTOK_APP_ID       || '',
    appSecret:   process.env.TIKTOK_APP_SECRET    || '',
    redirectUri: process.env.TIKTOK_REDIRECT_URI  || 'http://localhost:5000/api/tiktok/callback',
    // TikTok Business API base URLs
    authBaseUrl: 'https://www.tiktok.com/v2/auth/authorize',
    apiBaseUrl:  'https://business-api.tiktok.com/open_api/v1.3',
    tokenUrl:    'https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/',
    // Scopes required for LeadFlow
    scopes: [
      'user.info.basic',
      'video.publish',
      'video.list',
      'comment.list',
    ].join(','),
  };
  
  function validateTikTokConfig() {
    if (!TIKTOK_CONFIG.appId || !TIKTOK_CONFIG.appSecret) {
      console.warn('[TikTok] TIKTOK_APP_ID or TIKTOK_APP_SECRET not set — TikTok features disabled');
      return false;
    }
    return true;
  }
  
  module.exports = { TIKTOK_CONFIG, validateTikTokConfig };
  