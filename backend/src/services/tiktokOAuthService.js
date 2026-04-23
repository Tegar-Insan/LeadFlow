// src/services/tiktokOAuthService.js
// TikTok Login Kit v2 — OAuth service layer

const axios  = require('axios');
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');

const { TIKTOK_CONFIG }      = require('../config/tiktok');
const { supabaseAdmin }      = require('../config/supabase');
const { encrypt }            = require('../utils/encryptionHelper');
const logger                 = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required for TikTok OAuth state signing');
  }
  return JWT_SECRET;
}

// ── PKCE helpers ───────────────────────────────────────────────
// TikTok requires PKCE even for web server apps (S256 method).
// Use hex verifier — only [0-9a-f], zero URL-encoding ambiguity,
// guaranteed to survive URLSearchParams and JWT round-trip unchanged.

function generateCodeVerifier() {
  // 43-128 chars required; 64 hex chars = 32 bytes, well within range
  return crypto.randomBytes(32).toString('hex'); // e.g. "a3f2b1..."
}

function generateCodeChallenge(verifier) {
  // HEX(SHA256(verifier)) — TikTok sandbox uses hex digest, not base64url
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('hex');
}

// ── OAuth State JWT ────────────────────────────────────────────
// Carries userId + PKCE code_verifier so the callback is fully stateless.

function signOAuthState(userId, codeVerifier) {
  return jwt.sign(
    { userId, codeVerifier, nonce: crypto.randomBytes(16).toString('hex'), type: 'tiktok_oauth_state' },
    getJwtSecret(),
    { expiresIn: '10m', issuer: 'leadflow-api', audience: 'leadflow-client' }
  );
}

function verifyOAuthState(state) {
  const payload = jwt.verify(state, getJwtSecret(), {
    issuer: 'leadflow-api',
    audience: 'leadflow-client',
  });
  if (payload.type !== 'tiktok_oauth_state') {
    throw new Error('Invalid state token type');
  }
  return { userId: payload.userId, codeVerifier: payload.codeVerifier };
}

// ── Authorize URL ──────────────────────────────────────────────

function buildAuthorizeUrl(userId) {
  const codeVerifier  = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state         = signOAuthState(userId, codeVerifier);

  const params = new URLSearchParams({
    client_key:             TIKTOK_CONFIG.clientKey,
    scope:                  TIKTOK_CONFIG.scopes,
    response_type:          'code',
    redirect_uri:           TIKTOK_CONFIG.redirectUri,
    state,
    code_challenge:         codeChallenge,
    code_challenge_method:  'S256',
  });
  return `${TIKTOK_CONFIG.authorizeUrl}?${params.toString()}`;
}

// ── Token Exchange ─────────────────────────────────────────────

async function exchangeCodeForTokens(code, codeVerifier) {
  // Build body manually using encodeURIComponent to guarantee correct percent-encoding.
  // URLSearchParams encodes '+' as '%2B' and spaces as '+', which can corrupt
  // TikTok auth codes that contain '*' and '!' characters.
  const rawBody = [
    `client_key=${encodeURIComponent(TIKTOK_CONFIG.clientKey)}`,
    `client_secret=${encodeURIComponent(TIKTOK_CONFIG.clientSecret)}`,
    `code=${encodeURIComponent(code)}`,
    `grant_type=authorization_code`,
    `redirect_uri=${encodeURIComponent(TIKTOK_CONFIG.redirectUri)}`,
    `code_verifier=${encodeURIComponent(codeVerifier)}`,
  ].join('&');

  logger.debug(
    `[tiktok token] exchanging authorization code (len=${String(code || '').length}) ` +
    `with verifier (len=${String(codeVerifier || '').length})`
  );

  const { data } = await axios.post(TIKTOK_CONFIG.tokenUrl, rawBody, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (data.error) {
    throw new Error(`TikTok token error: ${data.error} — ${data.error_description}`);
  }

  return data; // { access_token, refresh_token, expires_in, refresh_expires_in, open_id, scope, token_type }
}

// ── User Info ──────────────────────────────────────────────────

async function fetchUserInfo(accessToken) {
  // Only request fields covered by user.info.basic scope.
  // follower_count requires user.info.stats — not requested, so omitted.
  const { data } = await axios.get(
    `${TIKTOK_CONFIG.userInfoUrl}?fields=open_id,display_name,avatar_url`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const user = data?.data?.user || data?.user || data;
  return {
    open_id:        user.open_id,
    display_name:   user.display_name,
    avatar_url:     user.avatar_url,
    follower_count: 0,
  };
}

// ── DB Upsert ──────────────────────────────────────────────────

async function upsertTiktokAccount(userId, tokens, userInfo) {
  const now = new Date();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('tiktok_accounts')
    .select('id, owner_user_id')
    .eq('tiktok_open_id', userInfo.open_id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing && existing.owner_user_id !== userId) {
    throw new Error('This TikTok account is already linked to another LeadFlow user');
  }

  const row = {
    owner_user_id:              userId,
    tiktok_open_id:             userInfo.open_id,
    tiktok_account_name:        userInfo.display_name || userInfo.open_id,
    tiktok_display_name:        userInfo.display_name,
    tiktok_avatar_url:          userInfo.avatar_url,
    tiktok_follower_count:      userInfo.follower_count || 0,
    access_token_encrypted:     encrypt(tokens.access_token),
    refresh_token_encrypted:    encrypt(tokens.refresh_token),
    token_scope:                tokens.scope ? tokens.scope.split(',') : [],
    access_token_expires_at:    new Date(now.getTime() + tokens.expires_in * 1000).toISOString(),
    refresh_token_expires_at:   new Date(now.getTime() + tokens.refresh_expires_in * 1000).toISOString(),
    connection_status:          'connected',
    last_token_refresh_at:      now.toISOString(),
    connected_at:               now.toISOString(),
    updated_at:                 now.toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('tiktok_accounts')
    .upsert(row, { onConflict: 'tiktok_open_id' });

  if (error) throw error;
}

// ── Status ─────────────────────────────────────────────────────

async function getAccountStatusForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('tiktok_accounts')
    .select(
      'id, tiktok_open_id, tiktok_account_name, tiktok_display_name, tiktok_avatar_url, ' +
      'tiktok_follower_count, token_scope, connection_status, access_token_expires_at, ' +
      'refresh_token_expires_at, connected_at, last_sync_at'
    )
    .eq('owner_user_id', userId)
    .eq('connection_status', 'connected')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data; // null if not connected
}

async function getConnectedAccountForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('tiktok_accounts')
    .select('id, owner_user_id, connection_status, access_token_encrypted')
    .eq('owner_user_id', userId)
    .eq('connection_status', 'connected')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ── Disconnect ─────────────────────────────────────────────────

async function markDisconnected(userId, reason) {
  const { error } = await supabaseAdmin
    .from('tiktok_accounts')
    .update({
      connection_status:  'disconnected',
      disconnect_reason:  reason,
      updated_at:         new Date().toISOString(),
    })
    .eq('owner_user_id', userId)
    .eq('connection_status', 'connected');

  if (error) throw error;
}

module.exports = {
  buildAuthorizeUrl,
  verifyOAuthState,
  exchangeCodeForTokens,
  fetchUserInfo,
  upsertTiktokAccount,
  getAccountStatusForUser,
  getConnectedAccountForUser,
  markDisconnected,
};
