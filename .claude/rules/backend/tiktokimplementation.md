# TikTok Integration — Implementation Rules & Resumption Doc

**Last updated:** 2026-04-19
**Scope:** Phase 1 = Login Kit OAuth connect flow. Phase 2+ (posting, cron, refresh worker) deferred.
**Goal:** Wire up TikTok OAuth so LeadFlow can link a TikTok account. Click button on `/calendar` → TikTok authorize → backend callback exchanges code for tokens → encrypted tokens stored in `tiktok_accounts` → redirect back with success toast.

Agent should read this file before touching any TikTok code. Existing scaffolding (schema, stub files, env keys) assumed — see "Existing Scaffolding" section.

---

## Decisions Locked

1. **Flow:** standard TikTok Login Kit v2 OAuth (authorization code, no PKCE — not required for web server apps per TikTok docs)
2. **Button:** compact custom component in CalendarPage header, LEFT of "New Post". Black background (bg-black), h-8, inline TikTok glyph (extract paths from `frontend/public/TikTok - Button SVG/Button_Black.svg`), text "Connect TikTok". When connected, swap to badge with green dot + display name + disconnect ×.
3. **CSRF state:** signed JWT containing `{ userId, nonce, type: 'tiktok_oauth_state' }` with 10-min TTL. Stateless — survives nodemon restart.
4. **Scopes at connect:** `user.info.basic,video.publish,video.upload` — granted up-front so Phase 2 posting doesn't need re-authorize. **Fallback:** if TikTok sandbox rejects `video.*` scopes for an unapproved app, strip back to `user.info.basic` only.
5. **Token encryption:** AES-256-GCM at application layer, key from `TIKTOK_TOKEN_ENCRYPTION_KEY` (64 hex chars / 32 bytes). Storage format `iv:authTag:ciphertext` (all hex).
6. **Auth on routes:** `/auth-url`, `/status`, `/disconnect` protected (JWT + role gate). `/callback` has NO auth — TikTok redirects the browser there without a bearer header; state JWT carries the user identity.
7. **Who can connect:** `marketing_staff` + `admin`. Matches existing `canEdit` gate at `CalendarPage.jsx:588`.
8. **Redirect after callback:** backend `res.redirect(${FRONTEND_BASE_URL}/calendar?tiktok=connected|error&reason=<slug>)`. Frontend strips query params after toast.

---

## TikTok API Reference (verified against official docs)

### Authorize endpoint
- `GET https://www.tiktok.com/v2/auth/authorize/`
- Query params (all required): `client_key`, `scope`, `response_type=code`, `redirect_uri`, `state`
- Optional: `disable_auto_auth` (0 or 1)
- **No PKCE** for web server apps

### Token exchange (code → tokens)
- `POST https://open.tiktokapis.com/v2/oauth/token/`
- Header: `Content-Type: application/x-www-form-urlencoded`
- Body fields: `client_key`, `client_secret`, `code`, `grant_type=authorization_code`, `redirect_uri`
- Response JSON: `{ open_id, scope, access_token, expires_in, refresh_token, refresh_expires_in, token_type: "Bearer" }`
- Error JSON: `{ error, error_description, log_id }`

### Refresh endpoint (Phase 2)
- Same URL. Body: `client_key, client_secret, grant_type=refresh_token, refresh_token`
- Note: returned `refresh_token` may differ from the one sent — always persist the new one.

### Userinfo endpoint
- `GET https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count`
- Header: `Authorization: Bearer <access_token>`

### Button pattern (TikTok official example)
```html
<a href='{SERVER_ENDPOINT_OAUTH}'>Continue with TikTok</a>
```
Our implementation uses `<button onClick>` + `window.location.href` — functionally equivalent, keeps state JWT fresh at click time.

---

## Existing Scaffolding (DO NOT DUPLICATE)

### Backend — already exists
- `backend/src/config/tiktok.js` — needs REWRITE (wrong env keys, wrong endpoints for Login Kit)
- `backend/src/routes/tiktokRoutes.js` — empty stub (0 lines), needs FILL
- `backend/src/controllers/tiktokController.js` — empty stub, needs FILL
- `backend/src/services/tiktok0AuthService.js` — typo stub (zero, not O) — **DELETE**, create `tiktokOAuthService.js` instead
- `backend/src/services/tiktokPublishService.js` — empty stub, **DO NOT TOUCH** (Phase 2)
- `backend/src/jobs/autoPublishJob.js` — empty stub, **DO NOT TOUCH** (Phase 2)
- `backend/.env` has (values are placeholders): `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`
- `backend/src/utils/encryptionHelper.js` — does NOT exist, must CREATE

### Frontend — already exists
- `frontend/src/services/tiktokService.js` — empty stub, needs FILL
- `frontend/src/pages/tiktok/TikTokConnectPage.jsx.jsx` — empty stub (note double extension typo) — ignore, unused
- `frontend/public/TikTok - Button SVG/` — contains `Button_Black.svg` (315×44, black bg `#121212`, official logo + "Log in with TikTok" text). Extract glyph paths for the compact button.
- `frontend/src/pages/schedule/CalendarPage.jsx` — line 802-810 has the "New Post" button. Insert TikTok button IMMEDIATELY BEFORE that `{canEdit && (` block.

### Database — migration 009 already deployed
Table `tiktok_accounts` (full schema in `database/migrations/009_create_tiktok_accounts.sql`):
- `id UUID PK`, `owner_user_id UUID FK users(id) ON DELETE CASCADE`
- `tiktok_open_id VARCHAR UNIQUE`, `tiktok_account_name VARCHAR`, `tiktok_display_name VARCHAR`, `tiktok_avatar_url TEXT`, `tiktok_follower_count INT`
- `access_token_encrypted TEXT`, `refresh_token_encrypted TEXT`, `token_scope TEXT[]`
- `access_token_expires_at TIMESTAMPTZ`, `refresh_token_expires_at TIMESTAMPTZ`
- `connection_status tiktok_connection_status_enum DEFAULT 'connected'` (values include `connected`, `disconnected`)
- `last_token_refresh_at`, `disconnect_reason`, `preferred_music_type`, `default_privacy DEFAULT 'PUBLIC_TO_EVERYONE'`
- `api_version DEFAULT 'v2'`, `last_sync_at`, `connected_at`, `updated_at`

View `v_tiktok_account_status` (safe for frontend): exposes `connection_status`, `token_scope`, `tiktok_display_name`, `tiktok_account_name`, `access_token_valid` (bool derived from expiry), `connected_at_wib`, `owner_name` — but NOT raw encrypted tokens. Use this view for `GET /status`.

RLS is enabled — backend uses service role key, bypasses RLS. No policy changes needed.

**NO MIGRATIONS REQUIRED** for Phase 1 — schema already supports everything.

---

## Project Conventions (enforce strictly)

### Backend
- `utils/responseHelper.js`: use `success(res, { message, data, statusCode })` and `error(res, { message, statusCode })`. **Never** raw `res.json()`.
- `middleware/authMiddleware.js`: sets `req.user = { userId, roleName, ... }` from JWT.
- `middleware/roleMiddleware.js`: `roleMiddleware(['marketing_staff', 'admin'])`.
- `utils/jwtHelper.js`: exports `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `decodeToken`. For OAuth state, we can call `signAccessToken` with custom payload + short TTL, or add a tiny `signOAuthState/verifyOAuthState` pair that uses the same `JWT_SECRET` with payload type `'tiktok_oauth_state'` to prevent cross-token confusion.
- Routes MUST be mounted in `backend/src/app.js` BEFORE the 404 catch-all — unmounted routes are silently dead (lesson from progress.md).
- All timestamps stored UTC (DB `TIMESTAMPTZ`). Compute token expiries: `new Date(Date.now() + expires_in * 1000).toISOString()`.
- Tokens AES-256 encrypted BEFORE DB insert. Never log raw tokens.

### Frontend
- `VITE_API_BASE_URL` already ends in `/api`. Service paths MUST be `/tiktok/*`, never `/api/tiktok/*` (lesson: chatbot double-prefix 404 bug).
- Service pattern (see `chatbotService.js:7-14` for exact shape):
  ```js
  import axios from 'axios';
  import { getAccessToken } from '../utils/tokenHelper';
  const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const authHeader = () => ({ Authorization: `Bearer ${getAccessToken()}` });
  export const getTikTokAuthUrl = async () => {
    const res = await axios.get(`${API}/tiktok/auth-url`, { headers: authHeader() });
    return res.data.data;  // { url }
  };
  ```
  (Not a shared `api.js` wrapper — each service file builds its own axios calls.)
- Notifications: `useNotification()` from `context/NotificationContext.jsx` → `{ toast }`. Call `toast.success('msg')` / `toast.error('msg')`.
- Auth: `useAuth()` from `context/AuthContext.jsx` → `{ user, token, isAuthenticated, ... }`. Role via `user?.roleName || user?.role_name`.
- Tailwind tokens: `brand: #f6b70a` (yellow), `surface.raised`, `surface.border`, `text.primary/secondary/muted`. Dark theme.

---

## File-by-File Implementation Plan

### [1] `backend/src/config/tiktok.js` — REWRITE

```js
const TIKTOK_CONFIG = {
  clientKey:    process.env.TIKTOK_CLIENT_KEY    || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri:  process.env.TIKTOK_REDIRECT_URI  || 'http://localhost:5000/api/tiktok/callback',
  frontendUrl:  process.env.FRONTEND_BASE_URL    || 'http://localhost:5173',

  authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  tokenUrl:     'https://open.tiktokapis.com/v2/oauth/token/',
  userInfoUrl:  'https://open.tiktokapis.com/v2/user/info/',

  scopes: 'user.info.basic,video.publish,video.upload',
};

function validateTikTokConfig() {
  const missing = [];
  if (!TIKTOK_CONFIG.clientKey)    missing.push('TIKTOK_CLIENT_KEY');
  if (!TIKTOK_CONFIG.clientSecret) missing.push('TIKTOK_CLIENT_SECRET');
  if (missing.length) throw new Error(`Missing TikTok env vars: ${missing.join(', ')}`);
}

module.exports = { TIKTOK_CONFIG, validateTikTokConfig };
```

### [2] `backend/src/utils/encryptionHelper.js` — NEW

```js
const crypto = require('crypto');
const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.TIKTOK_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('TIKTOK_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc    = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decrypt(blob) {
  const [ivHex, tagHex, encHex] = String(blob).split(':');
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid encrypted blob');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encrypt, decrypt };
```

### [3] `backend/src/services/tiktokOAuthService.js` — NEW (delete typo `tiktok0AuthService.js`)

Required exports:
- `buildAuthorizeUrl(userId)` → returns full TikTok authorize URL with signed JWT state
- `verifyOAuthState(state)` → verifies JWT, asserts `type === 'tiktok_oauth_state'`, returns `userId`
- `exchangeCodeForTokens(code)` → POST to `tokenUrl` with `application/x-www-form-urlencoded` via `axios`. Use `URLSearchParams` to encode body.
- `fetchUserInfo(accessToken)` → GET userinfo with Bearer
- `upsertTiktokAccount(userId, tokens, userInfo)` → Supabase upsert on `tiktok_open_id` conflict. Uses `encrypt()` on both tokens. Writes:
  - `owner_user_id: userId`
  - `tiktok_open_id: userInfo.open_id`
  - `tiktok_account_name: userInfo.display_name || userInfo.open_id`
  - `tiktok_display_name: userInfo.display_name`
  - `tiktok_avatar_url: userInfo.avatar_url`
  - `tiktok_follower_count: userInfo.follower_count || 0`
  - `access_token_encrypted: encrypt(tokens.access_token)`
  - `refresh_token_encrypted: encrypt(tokens.refresh_token)`
  - `token_scope: tokens.scope.split(',')` (PG TEXT[] — pass as JS array; supabase-js handles the conversion)
  - `access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()`
  - `refresh_token_expires_at: new Date(Date.now() + tokens.refresh_expires_in * 1000).toISOString()`
  - `connection_status: 'connected'`
  - `last_token_refresh_at: new Date().toISOString()`
- `getAccountStatusForUser(userId)` → SELECT from `v_tiktok_account_status` via supabase query filtered to the caller's account. (The view exposes `owner_name` but the underlying table column is `owner_user_id` — may need to query the base table OR add `owner_user_id` to the view if not present. During impl, read the view DDL in migration 009 to confirm — if `owner_user_id` is missing from the view, query `tiktok_accounts` directly and exclude token columns in the SELECT list.)
- `markDisconnected(userId, reason)` → UPDATE `connection_status='disconnected', disconnect_reason=?, updated_at=NOW()`

JWT state helpers — can live inline in this service OR in `utils/jwtHelper.js` as `signOAuthState`/`verifyOAuthState`. Prefer in `jwtHelper` for reuse. Payload: `{ userId, nonce, type: 'tiktok_oauth_state' }`. TTL: `10m`.

### [4] `backend/src/controllers/tiktokController.js` — FILL

```js
const { success, error } = require('../utils/responseHelper');
const { TIKTOK_CONFIG }  = require('../config/tiktok');
const oauth              = require('../services/tiktokOAuthService');

exports.getAuthUrl = async (req, res) => {
  try {
    const url = oauth.buildAuthorizeUrl(req.user.userId);
    return success(res, { message: 'Authorize URL generated', data: { url } });
  } catch (err) {
    console.error('[tiktok auth-url]', err);
    return error(res, { message: 'Failed to build TikTok authorize URL', statusCode: 500 });
  }
};

exports.handleCallback = async (req, res) => {
  const { code, state, error: tiktokErr } = req.query;
  const redirect = (slug) => res.redirect(`${TIKTOK_CONFIG.frontendUrl}/calendar?tiktok=${slug}`);
  if (tiktokErr) return redirect(`error&reason=${encodeURIComponent(tiktokErr)}`);
  if (!code || !state) return redirect('error&reason=missing_params');

  let userId;
  try { userId = oauth.verifyOAuthState(state); }
  catch { return redirect('error&reason=invalid_state'); }

  try {
    const tokens   = await oauth.exchangeCodeForTokens(code);
    const userInfo = await oauth.fetchUserInfo(tokens.access_token);
    await oauth.upsertTiktokAccount(userId, tokens, userInfo);
    return redirect('connected');
  } catch (err) {
    console.error('[tiktok callback]', err?.response?.data || err);
    return redirect('error&reason=token_exchange_failed');
  }
};

exports.getStatus = async (req, res) => {
  try {
    const row = await oauth.getAccountStatusForUser(req.user.userId);
    return success(res, { data: row });   // null if not connected
  } catch (err) {
    console.error('[tiktok status]', err);
    return error(res, { message: 'Failed to fetch TikTok status', statusCode: 500 });
  }
};

exports.disconnect = async (req, res) => {
  try {
    await oauth.markDisconnected(req.user.userId, 'user_initiated');
    return success(res, { message: 'TikTok disconnected' });
  } catch (err) {
    console.error('[tiktok disconnect]', err);
    return error(res, { message: 'Failed to disconnect TikTok', statusCode: 500 });
  }
};
```

### [5] `backend/src/routes/tiktokRoutes.js` — FILL

```js
const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/tiktokController');

router.get ('/auth-url',   authMiddleware, roleMiddleware(['marketing_staff', 'admin']), ctrl.getAuthUrl);
router.get ('/callback',                                                                 ctrl.handleCallback);
router.get ('/status',     authMiddleware,                                               ctrl.getStatus);
router.post('/disconnect', authMiddleware, roleMiddleware(['marketing_staff', 'admin']), ctrl.disconnect);

module.exports = router;
```

### [6] `backend/src/app.js` — mount BEFORE the 404 catch-all

Add alongside other `app.use('/api/...')` lines (currently at lines 79–84):
```js
const tiktokRoutes = require('./routes/tiktokRoutes');
// ...
app.use('/api/tiktok', tiktokRoutes);
```

### [7] `backend/.env` + `backend/.env.example` — add

```
TIKTOK_CLIENT_KEY=<from TikTok sandbox console>
TIKTOK_CLIENT_SECRET=<from TikTok sandbox console>
TIKTOK_REDIRECT_URI=http://localhost:5000/api/tiktok/callback
TIKTOK_TOKEN_ENCRYPTION_KEY=<generate via: openssl rand -hex 32>
FRONTEND_BASE_URL=http://localhost:5173
```

The redirect URI must be registered BYTE-FOR-BYTE in the TikTok sandbox console or authorize requests are rejected.

### [8] `frontend/src/services/tiktokService.js` — NEW

```js
import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const authHeader = () => ({ Authorization: `Bearer ${getAccessToken()}` });

export const getTikTokAuthUrl = async () => {
  const res = await axios.get(`${API}/tiktok/auth-url`, { headers: authHeader() });
  return res.data.data;   // { url }
};

export const getTikTokStatus = async () => {
  const res = await axios.get(`${API}/tiktok/status`, { headers: authHeader() });
  return res.data.data;   // row or null
};

export const disconnectTikTok = async () => {
  const res = await axios.post(`${API}/tiktok/disconnect`, {}, { headers: authHeader() });
  return res.data.data;
};
```

### [9] `frontend/src/components/common/TikTokLoginButton.jsx` — NEW

```jsx
import React from 'react';

// Extract exact paths from frontend/public/TikTok - Button SVG/Button_Black.svg
// Placeholder below — replace with pixel-perfect glyph during implementation.
const TikTokGlyph = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M22.5 7.5c.3 2.4 1.7 4.3 4 4.9v3.3c-1.5 0-3-.3-4.3-1v7.1c0 4.3-3.2 7.5-7.3 7.5a7.3 7.3 0 0 1-7.4-7.4c0-4.1 3.3-7.4 7.4-7.4.4 0 .8 0 1.2.1v3.6a3.9 3.9 0 1 0 2.7 3.7V4.9h3.7Z" fill="#25F4EE" transform="translate(-1.5 1.5)"/>
    <path d="M22.5 7.5c.3 2.4 1.7 4.3 4 4.9v3.3c-1.5 0-3-.3-4.3-1v7.1c0 4.3-3.2 7.5-7.3 7.5a7.3 7.3 0 0 1-7.4-7.4c0-4.1 3.3-7.4 7.4-7.4.4 0 .8 0 1.2.1v3.6a3.9 3.9 0 1 0 2.7 3.7V4.9h3.7Z" fill="#FE2C55" transform="translate(1.5 -1.5)"/>
    <path d="M22.5 7.5c.3 2.4 1.7 4.3 4 4.9v3.3c-1.5 0-3-.3-4.3-1v7.1c0 4.3-3.2 7.5-7.3 7.5a7.3 7.3 0 0 1-7.4-7.4c0-4.1 3.3-7.4 7.4-7.4.4 0 .8 0 1.2.1v3.6a3.9 3.9 0 1 0 2.7 3.7V4.9h3.7Z" fill="#FFFFFF"/>
  </svg>
);

export default function TikTokLoginButton({ connected, accountName, onConnect, onDisconnect, loading }) {
  if (connected) {
    return (
      <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-black border border-white/10 text-white text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden />
        <TikTokGlyph />
        <span className="truncate max-w-[120px]" title={accountName}>{accountName || 'Connected'}</span>
        <button
          type="button"
          onClick={onDisconnect}
          title="Disconnect TikTok"
          className="ml-1 w-4 h-4 flex items-center justify-center rounded text-text-muted hover:text-brand hover:bg-white/[0.06] transition-colors"
        >×</button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={loading}
      className="flex items-center gap-2 px-3 h-8 rounded-lg bg-black hover:bg-zinc-900 border border-white/10 text-white text-xs font-semibold transition-colors disabled:opacity-60"
    >
      <TikTokGlyph />
      {loading ? 'Connecting…' : 'Connect TikTok'}
    </button>
  );
}
```

### [10] `frontend/src/pages/schedule/CalendarPage.jsx` — MODIFY

Three changes:

**A. Imports** — add near existing imports:
```jsx
import { useSearchParams } from 'react-router-dom';
import TikTokLoginButton from '../../components/common/TikTokLoginButton';
import { useNotification } from '../../context/NotificationContext';
import { getTikTokAuthUrl, getTikTokStatus, disconnectTikTok } from '../../services/tiktokService';
```

**B. State + effects** — inside `CalendarPage`, alongside other `useState` calls (around line 600):
```jsx
const { toast } = useNotification();
const [searchParams, setSearchParams] = useSearchParams();
const [tiktokStatus, setTiktokStatus] = useState(null);     // null=unknown, object=connected, false=not connected
const [tiktokLoading, setTiktokLoading] = useState(false);

useEffect(() => {
  if (!canEdit) return;
  getTikTokStatus()
    .then(r => setTiktokStatus(r || false))
    .catch(() => setTiktokStatus(false));
}, [canEdit]);

useEffect(() => {
  const flag = searchParams.get('tiktok');
  if (!flag) return;
  if (flag === 'connected') {
    toast.success('Successfully integrated with TikTok');
    getTikTokStatus().then(r => setTiktokStatus(r || false)).catch(() => {});
  } else if (flag === 'error') {
    const reason = searchParams.get('reason');
    toast.error(`TikTok connection failed${reason ? `: ${reason}` : ''}`);
  }
  const next = new URLSearchParams(searchParams);
  next.delete('tiktok'); next.delete('reason');
  setSearchParams(next, { replace: true });
}, []);  // once on mount

const handleConnectTikTok = async () => {
  setTiktokLoading(true);
  try {
    const { url } = await getTikTokAuthUrl();
    window.location.href = url;
  } catch {
    toast.error('Failed to start TikTok login');
    setTiktokLoading(false);
  }
};

const handleDisconnectTikTok = async () => {
  if (!confirm('Disconnect TikTok account?')) return;
  try {
    await disconnectTikTok();
    setTiktokStatus(false);
    toast.success('TikTok disconnected');
  } catch {
    toast.error('Failed to disconnect');
  }
};
```

**C. Markup** — insert immediately BEFORE the `{canEdit && ( <button...>New Post</button> )}` block at line 802:
```jsx
{canEdit && (
  <TikTokLoginButton
    connected={!!tiktokStatus}
    accountName={tiktokStatus?.tiktok_display_name || tiktokStatus?.tiktok_account_name}
    onConnect={handleConnectTikTok}
    onDisconnect={handleDisconnectTikTok}
    loading={tiktokLoading}
  />
)}
```

`canEdit` is already defined at `CalendarPage.jsx:588` as `['marketing_staff','admin'].includes(roleName)` — matches backend role gate exactly.

---

## Manual Verification Checklist

1. `grep -E '^TIKTOK_|^FRONTEND_BASE_URL' backend/.env` → 5 lines present
2. Register `http://localhost:5000/api/tiktok/callback` in TikTok sandbox console (verbatim)
3. Start: `cd backend && npm run dev` + `cd frontend && npm run dev`
4. `curl -i http://localhost:5000/api/tiktok/status` → 401 (not 404 — confirms route mounted)
5. Log in as marketing_staff → `/calendar` → click "Connect TikTok" → tiktok.com → approve → land on `/calendar?tiktok=connected` → green toast → badge flips to "Connected · <name>"
6. DB: `SELECT tiktok_open_id, connection_status, access_token_expires_at FROM tiktok_accounts;` → row present, status=`connected`, expiry in future
7. Encryption: `SELECT LEFT(access_token_encrypted, 30) FROM tiktok_accounts;` → looks like `ab12cd...:ef34...:...` (three hex parts, colon-separated), not plaintext
8. Error path: `curl -i "http://localhost:5000/api/tiktok/callback?state=bogus&code=bogus"` → 302 to `/calendar?tiktok=error&reason=invalid_state`
9. Refresh `/calendar` → status persists (status fetch on mount)
10. Click × on connected badge → confirm → flips back to "Connect TikTok"; DB row `connection_status='disconnected'`

---

## Implementation Order (task list)

1. Rewrite `backend/src/config/tiktok.js`
2. Create `backend/src/utils/encryptionHelper.js`
3. Delete typo stub `backend/src/services/tiktok0AuthService.js`, create `backend/src/services/tiktokOAuthService.js`
4. Fill `backend/src/controllers/tiktokController.js`
5. Fill `backend/src/routes/tiktokRoutes.js`
6. Mount in `backend/src/app.js`
7. Update `backend/.env` + `backend/.env.example`
8. Create `frontend/src/services/tiktokService.js`
9. Create `frontend/src/components/common/TikTokLoginButton.jsx`
10. Wire into `frontend/src/pages/schedule/CalendarPage.jsx` (imports + state + markup)
11. Manual verification per checklist
12. Update `.claude/rules/progress.md` with the new `/api/tiktok/*` routes and the Login Kit connect status

---

## Out of Scope (Phase 2 — future session)

- Content posting to TikTok (`POST /v2/post/publish/video/init/` etc.)
- `autoPublishJob.js` cron implementation — poll `scheduled_at`, publish when due
- Access-token auto-refresh worker (TikTok access tokens expire ~24h; refresh tokens ~365 days)
- Multi-account support (current plan assumes one TikTok account per user)
- Backend Jest/Supertest tests mocking TikTok HTTP
- Replacing native `confirm()` with a proper modal for disconnect

---

## Open Risk — Sandbox Scope Grant

If TikTok sandbox rejects `video.publish`/`video.upload` for an unapproved app, the authorize screen will fail. Mitigation: change `scopes` in `config/tiktok.js` to just `'user.info.basic'`, re-test connect flow, and defer the publish scopes until the app is approved for Content Posting API. User will need to re-authorize once Phase 2 lands.

---

## Cross-references

- Plan file (detailed design notes): `/home/tegarinsaan/.claude/plans/let-us-focusing-on-calm-whisper.md`
- Progress tracker: `.claude/rules/progress.md` — update when Phase 1 lands
- Schema: `database/migrations/009_create_tiktok_accounts.sql`
- Existing auth middleware pattern: `backend/src/middleware/authMiddleware.js`, `backend/src/middleware/roleMiddleware.js`
- Response helpers: `backend/src/utils/responseHelper.js`
- JWT helper (reuse for OAuth state): `backend/src/utils/jwtHelper.js`
- Frontend service template: `frontend/src/services/chatbotService.js`
- Notification API: `frontend/src/context/NotificationContext.jsx`
- New Post button (insertion point): `frontend/src/pages/schedule/CalendarPage.jsx:802