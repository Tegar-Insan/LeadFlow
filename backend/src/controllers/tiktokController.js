// src/controllers/tiktokController.js
// TikTok Login Kit v2 — OAuth endpoints

const { success, error } = require('../utils/responseHelper');
const { TIKTOK_CONFIG }  = require('../config/tiktok');
const oauth              = require('../services/tiktokOAuthService');

exports.getAuthUrl = async (req, res) => {
  try {
    const url = oauth.buildAuthorizeUrl(req.user.userId);
    return success(res, { message: 'Authorize URL generated', data: { url } });
  } catch (err) {
    console.error('[tiktok auth-url]', err.message);
    return error(res, { message: 'Failed to build TikTok authorize URL', statusCode: 500 });
  }
};

exports.handleCallback = async (req, res) => {
  const { code, state, error: tiktokErr } = req.query;
  const redirect = (slug) =>
    res.redirect(`${TIKTOK_CONFIG.frontendUrl}/tiktok/callback?tiktok=${slug}`);

  if (tiktokErr) return redirect(`error&reason=${encodeURIComponent(tiktokErr)}`);
  if (!code || !state) return redirect('error&reason=missing_params');

  let userId, codeVerifier;
  try {
    ({ userId, codeVerifier } = oauth.verifyOAuthState(state));
  } catch {
    return redirect('error&reason=invalid_state');
  }

  try {
    const tokens   = await oauth.exchangeCodeForTokens(code, codeVerifier);
    const userInfo = await oauth.fetchUserInfo(tokens.access_token);
    await oauth.upsertTiktokAccount(userId, tokens, userInfo);
    return redirect('connected');
  } catch (err) {
    const tiktokBody = err?.response?.data;
    console.error('[tiktok callback] HTTP status:', err?.response?.status);
    console.error('[tiktok callback] TikTok response body:', JSON.stringify(tiktokBody, null, 2));
    console.error('[tiktok callback] Error message:', err.message);
    const reason = tiktokBody?.error || tiktokBody?.error_description || err.message || 'token_exchange_failed';
    return redirect(`error&reason=${encodeURIComponent(reason)}`);
  }
};

exports.getStatus = async (req, res) => {
  try {
    const row = await oauth.getAccountStatusForUser(req.user.userId);
    return success(res, { data: row }); // null if not connected
  } catch (err) {
    console.error('[tiktok status]', err.message);
    return error(res, { message: 'Failed to fetch TikTok status', statusCode: 500 });
  }
};

exports.disconnect = async (req, res) => {
  try {
    await oauth.markDisconnected(req.user.userId, 'user_initiated');
    return success(res, { message: 'TikTok disconnected' });
  } catch (err) {
    console.error('[tiktok disconnect]', err.message);
    return error(res, { message: 'Failed to disconnect TikTok', statusCode: 500 });
  }
};
