import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { TIKTOK_CONFIG } from "../config/tiktok.js";
import { supabaseAdmin } from "../config/supabase.js";
import { encrypt } from "../utils/encryptionHelper.js";
import logger from "../utils/logger.js";
function getJwtSecret() {
    const secret = process.env['JWT_SECRET'];
    if (!secret)
        throw new Error('JWT_SECRET is required for TikTok OAuth state signing');
    return secret;
}
function getRedirectUri() {
    const redirectUri = String(TIKTOK_CONFIG.redirectUri ?? '').trim();
    if (!redirectUri)
        throw new Error('TIKTOK_REDIRECT_URI is required for TikTok OAuth');
    return redirectUri;
}
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('hex');
}
function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier, 'ascii').digest('hex');
}
function signOAuthState(userId, codeVerifier) {
    return jwt.sign({ userId, codeVerifier, nonce: crypto.randomBytes(16).toString('hex'), type: 'tiktok_oauth_state' }, getJwtSecret(), { expiresIn: '10m', issuer: 'leadflow-api', audience: 'leadflow-client' });
}
export function verifyOAuthState(state) {
    const payload = jwt.verify(state, getJwtSecret(), {
        issuer: 'leadflow-api',
        audience: 'leadflow-client',
    });
    if (payload.type !== 'tiktok_oauth_state')
        throw new Error('Invalid state token type');
    return { userId: payload.userId, codeVerifier: payload.codeVerifier };
}
export function buildAuthorizeUrl(userId) {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = signOAuthState(userId, codeVerifier);
    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
        client_key: TIKTOK_CONFIG.clientKey,
        scope: TIKTOK_CONFIG.scopes,
        response_type: 'code',
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });
    return `${TIKTOK_CONFIG.authorizeUrl}?${params.toString()}`;
}
export async function exchangeCodeForTokens(code, codeVerifier) {
    const redirectUri = getRedirectUri();
    const rawBody = [
        `client_key=${encodeURIComponent(TIKTOK_CONFIG.clientKey)}`,
        `client_secret=${encodeURIComponent(TIKTOK_CONFIG.clientSecret)}`,
        `code=${encodeURIComponent(code)}`,
        `grant_type=authorization_code`,
        `redirect_uri=${encodeURIComponent(redirectUri)}`,
        `code_verifier=${encodeURIComponent(codeVerifier)}`,
    ].join('&');
    logger.debug(`[tiktok token] exchanging code (len=${String(code ?? '').length})`);
    const { data } = await axios.post(TIKTOK_CONFIG.tokenUrl, rawBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (data['error']) {
        throw new Error(`TikTok token error: ${String(data['error'])} — ${String(data['error_description'] ?? '')}`);
    }
    return data;
}
export async function fetchUserInfo(accessToken) {
    const { data } = await axios.get(`${TIKTOK_CONFIG.userInfoUrl}?fields=open_id,display_name,avatar_url`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const user = data?.data?.user ?? data?.user ?? data;
    return {
        open_id: user['open_id'],
        display_name: user['display_name'],
        avatar_url: user['avatar_url'],
        follower_count: 0,
    };
}
export async function upsertTiktokAccount(userId, tokens, userInfo) {
    const now = new Date();
    const { data: existing, error: existingError } = await supabaseAdmin
        .from('tiktok_accounts')
        .select('id, owner_user_id')
        .eq('tiktok_open_id', userInfo['open_id'])
        .maybeSingle();
    if (existingError)
        throw existingError;
    const existingRow = existing;
    if (existingRow && existingRow.owner_user_id !== userId) {
        throw new Error('This TikTok account is already linked to another LeadFlow user');
    }
    const row = {
        owner_user_id: userId,
        tiktok_open_id: userInfo['open_id'],
        tiktok_account_name: userInfo['display_name'] ?? userInfo['open_id'],
        tiktok_display_name: userInfo['display_name'],
        tiktok_avatar_url: userInfo['avatar_url'],
        tiktok_follower_count: userInfo['follower_count'] ?? 0,
        access_token_encrypted: encrypt(tokens['access_token']),
        refresh_token_encrypted: encrypt(tokens['refresh_token']),
        token_scope: typeof tokens['scope'] === 'string' ? tokens['scope'].split(',') : [],
        access_token_expires_at: new Date(now.getTime() + tokens['expires_in'] * 1000).toISOString(),
        refresh_token_expires_at: new Date(now.getTime() + tokens['refresh_expires_in'] * 1000).toISOString(),
        connection_status: 'connected',
        last_token_refresh_at: now.toISOString(),
        connected_at: now.toISOString(),
        updated_at: now.toISOString(),
    };
    const { error } = await supabaseAdmin
        .from('tiktok_accounts')
        .upsert(row, { onConflict: 'tiktok_open_id' });
    if (error)
        throw error;
}
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
function isTokenExpired(isoDate) {
    const expiresAt = new Date(isoDate ?? '').getTime();
    if (Number.isNaN(expiresAt))
        return true;
    return expiresAt <= Date.now() + TOKEN_EXPIRY_BUFFER_MS;
}
export async function getAccountStatusForUser(userId) {
    const { data, error } = await supabaseAdmin
        .from('tiktok_accounts')
        .select('id, tiktok_open_id, tiktok_account_name, tiktok_display_name, tiktok_avatar_url, ' +
        'tiktok_follower_count, token_scope, connection_status, access_token_expires_at, ' +
        'refresh_token_expires_at, connected_at, last_sync_at')
        .eq('owner_user_id', userId)
        .eq('connection_status', 'connected')
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        return null;
    const row = data;
    const accessExpired = isTokenExpired(row['access_token_expires_at']);
    const refreshExpired = isTokenExpired(row['refresh_token_expires_at']);
    return {
        ...row,
        needs_reconnect: accessExpired && refreshExpired,
    };
}
export async function getConnectedAccountForUser(userId) {
    const { data, error } = await supabaseAdmin
        .from('tiktok_accounts')
        .select('id, owner_user_id, connection_status, access_token_encrypted, ' +
        'refresh_token_encrypted, token_scope, access_token_expires_at, refresh_token_expires_at')
        .eq('owner_user_id', userId)
        .eq('connection_status', 'connected')
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    return data ?? null;
}
export async function markDisconnected(userId, reason) {
    const { error } = await supabaseAdmin
        .from('tiktok_accounts')
        .update({
        connection_status: 'disconnected',
        disconnect_reason: reason,
        updated_at: new Date().toISOString(),
    })
        .eq('owner_user_id', userId)
        .eq('connection_status', 'connected');
    if (error)
        throw error;
}
//# sourceMappingURL=tiktokOAuthService.js.map