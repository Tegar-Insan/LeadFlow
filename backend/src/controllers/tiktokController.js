// src/controllers/tiktokController.js
// TikTok Login Kit v2 — OAuth endpoints

const { success, error } = require('../utils/responseHelper');
const { TIKTOK_CONFIG } = require('../config/tiktok');
const oauth = require('../services/tiktokOAuthService');
const tiktokPublishService = require('../services/tiktokPublishService');

function resolvePublishStatusCode(message = '') {
  const text = String(message).toLowerCase();

  if (text.includes('schedule not found')) return 404;
  if (text.includes('no media asset found')) return 400;
  if (text.includes('no tiktok account connected')) return 400;
  if (text.includes('tik tok account is not connected') || text.includes('tiktok account is not connected')) return 409;
  if (text.includes('no valid image url could be resolved')) return 400;
  if (text.includes('unaudited_client_can_only_post_to_private_accounts')) return 403;
  if (text.includes('privacy_level_option_mismatch')) return 400;
  if (text.includes('url_ownership_unverified')) return 400;
  if (text.includes('scope_not_authorized')) return 403;
  if (text.includes('reached_active_user_cap') || text.includes('spam_risk_too_many_posts')) return 429;
  if (text.includes('token') || text.includes('authorization') || text.includes('scope')) return 502;

  return 500;
}

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

  let userId;
  let codeVerifier;

  try {
    ({ userId, codeVerifier } = oauth.verifyOAuthState(state));
  } catch {
    return redirect('error&reason=invalid_state');
  }

  try {
    const tokens = await oauth.exchangeCodeForTokens(code, codeVerifier);
    const userInfo = await oauth.fetchUserInfo(tokens.access_token);
    await oauth.upsertTiktokAccount(userId, tokens, userInfo);
    return redirect('connected');
  } catch (err) {
    const tiktokBody = err?.response?.data;
    const reason =
      tiktokBody?.error || tiktokBody?.error_description || err.message || 'token_exchange_failed';
    return redirect(`error&reason=${encodeURIComponent(reason)}`);
  }
};

exports.getStatus = async (req, res) => {
  try {
    const row = await oauth.getAccountStatusForUser(req.user.userId);
    return success(res, { data: row });
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

exports.handleVideouploadCallback = async (req, res) => {
  try{
    console.log('Received TikTok video upload callback:', JSON.stringify(req.body, null, 2));
    return success(res, { message: 'Video upload callback received' });
  } catch (err) {
    console.error('[tiktok direct publish]', err.message);
    return error(res, { message: 'Failed to direct publish', statusCode: 500 });
  }
};

exports.directPublishBySchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    if (!scheduleId) {
      return error(res, { message: 'scheduleId is required', statusCode: 400 });
    }

    const result = await tiktokPublishService.publishScheduledContent(scheduleId);
    if (!result?.success) {
      const statusCode = result?.statusCode || resolvePublishStatusCode(result?.message);
      return error(res, {
        message: result?.message || 'Failed to publish content',
        statusCode,
      });
    }

    return success(res, {
      message: result?.message || 'Content published successfully',
      data: {
        scheduleId,
        status: result?.status || 'published',
        mode: result?.mode || null,
        publishId: result?.publishId || null,
        uploadUrl: result?.uploadUrl || null,
      },
    });
  } catch (err) {
    console.error('[tiktok direct publish]', err?.response?.data || err.message);
    return error(res, { message: 'Failed to publish content', statusCode: 500 });
  }
};