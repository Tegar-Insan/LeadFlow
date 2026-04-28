// @ts-nocheck
import type { Request, Response } from 'express';
import { success, error } from '../utils/responseHelper.ts';
import { TIKTOK_CONFIG } from '../config/tiktok.ts';
import * as oauth from '../services/tiktokOAuthService.ts';
import * as tiktokPublishService from '../services/tiktokPublishService.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

function resolvePublishStatusCode(message = ''): number {
  const text = String(message).toLowerCase();
  if (text.includes('schedule not found')) return 404;
  if (text.includes('no media asset found')) return 400;
  if (text.includes('no tiktok account connected')) return 400;
  if (text.includes('tiktok account is not connected')) return 409;
  if (text.includes('refresh token is expired') || text.includes('reconnect tiktok account')) return 401;
  if (text.includes('no valid image url could be resolved')) return 400;
  if (text.includes('unaudited_client_can_only_post_to_private_accounts')) return 403;
  if (text.includes('content-sharing-guidelines')) return 403;
  if (text.includes('privacy_level_option_mismatch')) return 400;
  if (text.includes('url_ownership_unverified')) return 400;
  if (text.includes('scope_not_authorized')) return 403;
  if (text.includes('reached_active_user_cap') || text.includes('spam_risk_too_many_posts')) return 429;
  if (text.includes('token') || text.includes('authorization') || text.includes('scope')) return 502;
  return 500;
}

export const getAuthUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const url = oauth.buildAuthorizeUrl(authReq.user.userId);
    success(res, { message: 'Authorize URL generated', data: { url } });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[tiktok auth-url]', e.message);
    error(res, { message: 'Failed to build TikTok authorize URL', statusCode: 500 });
  }
};

export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, state, error: tiktokErr } = req.query as Record<string, string | undefined>;
  const redirect = (slug: string): void => {
    res.redirect(`${TIKTOK_CONFIG.frontendUrl}/tiktok/callback?tiktok=${slug}`);
  };

  if (tiktokErr) { redirect(`error&reason=${encodeURIComponent(tiktokErr)}`); return; }
  if (!code || !state) { redirect('error&reason=missing_params'); return; }

  let userId: string;
  let codeVerifier: string;

  try {
    ({ userId, codeVerifier } = oauth.verifyOAuthState(state));
  } catch {
    redirect('error&reason=invalid_state'); return;
  }

  try {
    const tokens = await oauth.exchangeCodeForTokens(code, codeVerifier);
    const userInfo = await oauth.fetchUserInfo(tokens.access_token as string);
    await oauth.upsertTiktokAccount(userId, tokens, userInfo);
    redirect('connected');
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string; error_description?: string } }; message?: string };
    const tiktokBody = e.response?.data;
    const reason = tiktokBody?.error ?? tiktokBody?.error_description ?? e.message ?? 'token_exchange_failed';
    redirect(`error&reason=${encodeURIComponent(reason)}`);
  }
};

export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const row = await oauth.getAccountStatusForUser(authReq.user.userId);
    success(res, { data: row });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[tiktok status]', e.message);
    error(res, { message: 'Failed to fetch TikTok status', statusCode: 500 });
  }
};

export const disconnect = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    await oauth.markDisconnected(authReq.user.userId, 'user_initiated');
    success(res, { message: 'TikTok disconnected' });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[tiktok disconnect]', e.message);
    error(res, { message: 'Failed to disconnect TikTok', statusCode: 500 });
  }
};

export const handleVideouploadCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received TikTok video upload callback:', JSON.stringify(req.body, null, 2));
    success(res, { message: 'Video upload callback received' });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[tiktok direct publish]', e.message);
    error(res, { message: 'Failed to direct publish', statusCode: 500 });
  }
};

export const directPublishBySchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params as { scheduleId?: string };
    if (!scheduleId) { error(res, { message: 'scheduleId is required', statusCode: 400 }); return; }

    const result = await tiktokPublishService.publishNowBySchedule(scheduleId) as {
      success?: boolean; statusCode?: number; message?: string; status?: string;
      mode?: string; publishId?: string; uploadUrl?: string;
    } | null;

    if (!result?.success) {
      const statusCode = result?.statusCode ?? resolvePublishStatusCode(result?.message);
      error(res, { message: result?.message ?? 'Failed to publish content', statusCode }); return;
    }

    success(res, {
      message: result.message ?? 'Content published successfully',
      data: {
        scheduleId,
        status: result.status ?? 'published',
        mode: result.mode ?? null,
        publishId: result.publishId ?? null,
        uploadUrl: result.uploadUrl ?? null,
      },
    });
  } catch (err: unknown) {
    const e = err as { response?: { data?: unknown }; message?: string };
    console.error('[tiktok direct publish]', e.response?.data ?? e.message);
    error(res, { message: 'Failed to publish content', statusCode: 500 });
  }
};
