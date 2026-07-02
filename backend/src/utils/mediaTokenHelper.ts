// src/utils/mediaTokenHelper.ts
// Signs/verifies short-lived tokens for /tiktok/public/media/:assetId.
// That route now sits behind a permanently-verified TikTok "URL property"
// domain (leadflowuploadimage.my.id) instead of a throwaway Cloudflare
// tunnel, so it can no longer rely on obscurity — anyone who guesses an
// asset UUID could otherwise fetch arbitrary schedule media. Mirrors the
// signOAuthState/verifyOAuthState pattern in tiktokOAuthService.ts (same
// JWT_SECRET, type-tagged payload, short TTL).

import jwt from 'jsonwebtoken';

const ISSUER = 'leadflow-api';
const AUDIENCE = 'leadflow-client';
const TOKEN_TYPE = 'tiktok_media_pull';
// TikTok's PULL_FROM_URL fetch timing after /content/init/ isn't documented,
// so this is generous rather than matching our own short status-poll window.
const DEFAULT_TTL = '30m';

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET is required for media token signing');
  return secret;
}

export function signMediaToken(assetId: string): string {
  return jwt.sign(
    { assetId, type: TOKEN_TYPE },
    getJwtSecret(),
    { expiresIn: DEFAULT_TTL, issuer: ISSUER, audience: AUDIENCE } as jwt.SignOptions,
  );
}

export function verifyMediaToken(token: string, assetId: string): void {
  const payload = jwt.verify(token, getJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  }) as jwt.JwtPayload & { type?: string; assetId?: string };

  if (payload.type !== TOKEN_TYPE) throw new Error('Invalid media token type');
  if (payload.assetId !== assetId) throw new Error('Media token does not match requested asset');
}
