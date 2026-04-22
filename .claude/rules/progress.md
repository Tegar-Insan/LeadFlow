# LeadFlow — Project Progress Tracker
**Last updated:** 2026-04-20 (session 3)
**Author:** Tegar Insan Tohaga (A22EC4043) | UTM Faculty of Computing
**Client:** Krench Chicken, Bogor, West Java, Indonesia

---

## What We Have Accomplished

### Database (17 migrations — complete schema)
All 13 core tables are defined and deployed to Supabase:
- `roles`, `users`, `otp_tokens`, `refresh_tokens` — auth foundation
- `user_profiles`, `user_photos` — profile + photo history with Supabase Storage
- `prompts`, `content_ideas`, `content_queue_schedules`, `content_assets` — content pipeline
- `publish_status_logs`, `tiktok_accounts` — TikTok integration
- `interaction_messages`, `classify_type_messages` — inbox + AI classification
- `weekly_dashboard_reports` — Business Owner analytics
- Storage bucket `leadflow-media` provisioned (migration 015)
- Default privileges locked in (migration 017) — no more "permission denied" surprises on new tables

### Backend — Fully Working
| Area | Route | Status |
|---|---|---|
| Auth | `POST /api/auth/register` | ✅ Done |
| Auth | `POST /api/auth/verify-otp` | ✅ Done |
| Auth | `POST /api/auth/login` | ✅ Done |
| Auth | `POST /api/auth/resend-otp` | ✅ Done |
| Auth | `POST /api/auth/refresh` | ✅ Done |
| Auth | `POST /api/auth/logout` | ✅ Done |
| Auth | `GET /api/auth/me` | ✅ Done |
| Profile | `GET /api/profile/me` | ✅ Done |
| Profile | `PUT /api/profile/me` | ✅ Done |
| Profile | `PUT /api/profile/me/password` | ✅ Done |
| Profile | `POST /api/profile/me/photo` | ✅ Done |
| Profile | `DELETE /api/profile/me/photo` | ✅ Done |
| Profile | `GET /api/profile/me/photos` | ✅ Done |
| Calendar | `GET /api/calendar` | ✅ Done |
| Calendar | `GET /api/calendar/drafts` | ✅ Done |
| Calendar | `GET /api/calendar/:id` | ✅ Done |
| Calendar | `POST /api/calendar` | ✅ Done |
| Calendar | `PUT /api/calendar/:id` | ✅ Done |
| Calendar | `DELETE /api/calendar/:id` | ✅ Done |
| Media | `POST /api/media/upload` | ✅ Done |
| Media | `GET /api/media/:scheduleId` | ✅ Done |
| Media | `DELETE /api/media/:id` | ✅ Done |
| Admin | `GET /api/admin/users` | ✅ Done |
| Admin | `PUT /api/admin/users/:id/role` | ✅ Done |
| Admin | `PUT /api/admin/users/:id/status` | ✅ Done |
| Chatbot | `POST /api/chatbot/message` | ✅ Done — Claude-powered, proxies to Python FastAPI |
| Chatbot | `POST /api/chatbot/approve-schedule` | ✅ Done — creates calendar entry from AI recommendation |
| Chatbot | `POST /api/chatbot/reject-schedule` | ✅ Done — returns acknowledgement |
| TikTok | `GET /api/tiktok/auth-url` | ✅ Done — PKCE + JWT state, scope=user.info.basic |
| TikTok | `GET /api/tiktok/callback` | ✅ Done — exchanges code, stores encrypted tokens, redirects to /tiktok/callback |
| TikTok | `GET /api/tiktok/status` | ✅ Done — queries tiktok_accounts, returns connected row or null |
| TikTok | `POST /api/tiktok/disconnect` | ✅ Done — marks connection_status=disconnected |

**Infrastructure done:**
- `authMiddleware` + `roleMiddleware` RBAC on all protected routes
- `responseHelper` used consistently (never raw `res.json()`)
- `jakartaTime.js` for all timestamps (store UTC, display WIB)
- `passwordHelper` bcrypt throughout
- `jwtHelper` access + refresh token rotation
- `emailService` Gmail SMTP for OTP delivery
- `rateLimiter`, `sanitizeInput`, `validateRequest` middleware
- `autoPublishJob.js` + `fetchInteractionJob.js` job stubs wired in
- `chatbotRoutes.js` mounted in `app.js` at `/api/chatbot`
- `tiktokRoutes.js` mounted in `app.js` at `/api/tiktok`
- `encryptionHelper.js` — AES-256-GCM encrypt/decrypt for TikTok token storage (verified round-trip)

### Frontend — Structure + Auth Flow Working
| Page | Route | State |
|---|---|---|
| Login | `/login` | ✅ Working + animated redirect loading overlay (2.6s progress bar + step checklist) |
| Register | `/register` | ✅ Working |
| OTP Verification | `/otp` | ✅ Working |
| Profile | `/profile` | ✅ Working |
| Calendar | `/calendar` | ✅ Working + TikTok connect button in header |
| TikTok Status | `/tiktok/callback` | ✅ Working — success/error UI with 4s countdown redirect |
| Admin — All Accounts | `/admin` | ✅ Working end-to-end |
| Admin — Marketing Staff | `/admin/marketing-staff` | ✅ Working end-to-end |
| Admin — Business Owners | `/admin/business-owners` | ✅ Working end-to-end |
| Content Schedule Queue | `/schedule` | ✅ Working — list view wired to calendar API |
| Prompt Input | `/content/prompt` | ⚠️ UI exists, backend stub |
| Generated Ideas | `/content/ideas` | ⚠️ UI exists, backend stub |
| Idea Validation | `/content/validate` | ⚠️ UI exists, backend stub |
| Media Upload | `/media` | ✅ UI exists, backend connected |
| Publish Status | `/publish` | ⚠️ UI exists, backend stub |
| Interaction Inbox | `/interaction` | ⚠️ UI exists, backend stub |
| Weekly Dashboard | `/dashboard` | ⚠️ UI exists, backend stub |

**Frontend infrastructure done:**
- `AuthContext` + `NotificationContext` providers
- `ProtectedRoute` + `GuestRoute` with role guard
- All service layer files including `tiktokService.js`
- `TikTokLoginButton.jsx` — compact connect/connected badge, real glyph from SVG
- `appRoutes.jsx` with `/tiktok/callback` route registered

### Tests — Frontend + AI Only
- **Frontend:** 6 Vitest test files — **43/43 passing**
- **AI Analyzer:** 2 pytest files for classifier unit tests and `/analyze` route
- **Backend:** ❌ No Jest/Supertest tests written yet

### AI Analyzer — Python FastAPI (port 8000) — IMPLEMENTED
- `POST /analyze` — UC011 classifier (5 sentiment types × 3 priority levels)
- `POST /chatbot/message` — Claude chat with Apify TikTok intelligence
- `POST /chatbot/analyze-tiktok` — on-demand TikTok data summary
- `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` + Apify dataset `aliZEoRdATltr61eI`

---

## TikTok Integration — Phase 1 COMPLETE (2026-04-20)

### What Was Built
| File | Status |
|---|---|
| `backend/src/config/tiktok.js` | ✅ Rewritten — Login Kit v2 endpoints, `scopes: user.info.basic,video.publish,video.upload` (updated after TikTok app approval) |
| `backend/src/utils/encryptionHelper.js` | ✅ AES-256-GCM, `iv:authTag:ciphertext` format |
| `backend/src/services/tiktokOAuthService.js` | ✅ Full OAuth + PKCE (hex SHA256 challenge) |
| `backend/src/controllers/tiktokController.js` | ✅ 4 endpoints wired |
| `backend/src/routes/tiktokRoutes.js` | ✅ Mounted in app.js |
| `frontend/src/services/tiktokService.js` | ✅ 3 exports: authUrl, status, disconnect |
| `frontend/src/components/common/TikTokLoginButton.jsx` | ✅ Connect/connected badge |
| `frontend/src/pages/auth/TikTokStatusPage.jsx` | ✅ Success/error callback page |

### PKCE — Lessons Learned
- TikTok requires PKCE even for web server apps (not optional in sandbox)
- `code_verifier`: `crypto.randomBytes(32).toString('hex')` — 64 hex chars
- `code_challenge`: `SHA256(verifier).digest('hex')` — **hex, not base64url** (TikTok sandbox quirk)
- `code_challenge_method`: `S256`
- Verifier embedded in signed JWT state (`type: 'tiktok_oauth_state'`, 10-min TTL) — stateless
- Token exchange body built with `encodeURIComponent()` — NOT `URLSearchParams` (TikTok auth codes contain `*` and `!`)

### Scopes — Lessons Learned
- `video.publish` and `video.upload` require TikTok Content Posting API approval
- Including unapproved scopes causes `scope_not_authorized` on token exchange
- **Current scope: `user.info.basic,video.publish,video.upload`** — TikTok app approved for all three (2026-04-20)
- `follower_count` field in `/user/info` requires separate `user.info.stats` scope — **omitted from fetchUserInfo**, field hardcoded to `0` until that scope is approved

---

## Current State (2026-04-20)

### What Actually Works End-to-End
1. Register → OTP email → verify → JWT login → protected routes
2. Profile: view, update name/phone, change password, upload/delete photo
3. Calendar: CRUD, weekly/monthly view, drag-drop, draft management
4. Media: MP4/H.264 video + multi-photo carousel upload (50 MB cap)
5. Content Schedule Queue: list view, month navigation, status filter, search, delete
6. Admin panel: 3 pages, search, role change, active toggle — fully connected
7. AI Chatbot: Claude + Apify TikTok intelligence, schedule approval card
8. **TikTok OAuth connect: full flow working** — button in calendar header → TikTok authorize → callback → encrypted tokens in DB → success page with countdown → badge shows connected account

### What Is Wired Up but Blocked on Backend Stubs
- Content idea generation (UC004–UC005) — frontend UI ready, Node controller/service empty
- Idea validation approve/reject (UC006) — frontend UI ready, no backend logic
- Interaction inbox (UC010–UC012) — frontend UI ready, no TikTok fetch logic
- Weekly dashboard (UC013) — frontend UI ready, no aggregation queries
- Publish status (UC009) — frontend UI ready, no TikTok publish integration

---

## Next Steps (Priority Order)

### Phase 1 — Core Content Pipeline (UC004–UC006) ← NEXT
1. **Backend: Prompt input** — `promptController.js` + `promptRoutes.js`, save to `prompts` table
2. **Backend: Content idea generation** — `contentIdeaController.js` + `contentIdeaService.js`, call Python FastAPI to generate exactly 3 ideas, save to `content_ideas` with `status=pending_validation`
3. **Backend: Idea validation** — `IdeaValidationController.js`, approve → auto-create draft in `content_queue_schedules` (DB trigger in migration 006 handles this), reject → status=rejected
4. **Mount all three route groups in `app.js`**
5. **Wire frontend pages**: `/content/prompt`, `/content/ideas`, `/content/validate`

### Phase 2 — TikTok Publish + Interactions (UC009–UC012)
6. Publish to TikTok — `publishService.js`, write to `publish_status_logs` (requires Content Posting API approval first)
7. Fetch interactions — `fetchInteractionJob.js` implementation
8. Interaction inbox — view, reply (push to TikTok), delete

### Phase 3 — Weekly Dashboard (UC013)
9. Weekly dashboard backend — aggregation queries (current/last/2 weeks ago), restrict to `business_owner`
10. Wire up `WeeklyDashboardPage.jsx`

### Phase 4 — Testing + CI/CD
11. Backend tests — Jest + Supertest covering full auth flow, calendar CRUD, media validation
12. GitHub Actions — `.github/workflows/ci-backend.yml`, `ci-frontend.yml`, `ci-ai.yml`
13. Move `/github/` folder to `/.github/` (currently in wrong location — CI never triggers)

---

## Lessons Learned (Do Not Repeat)

| Bug | Root Cause | Fix |
|---|---|---|
| `permission denied for table` | New tables don't auto-inherit Supabase default privileges | Always include `GRANT` in every `CREATE TABLE` migration |
| `Bucket not found` | Storage bucket must be provisioned separately | Create bucket via `storage.buckets` insert in migration (015) |
| RLS policy inconsistency | Used `auth.uid()` instead of project's custom function | All RLS must use `get_caller_role()` and `get_caller_user_id()` from migration 001 |
| Login redirects to wrong page | `navigate()` called before React state update settled | Use `useEffect` watching `isAuthenticated` |
| Thumbnails vanish after drag-drop | `dragDrop` replaced state missing computed fields | Added `schedulesRef` + `draftsRef` via `useRef`; merge computed fields back |
| Slot card titles always blank | Rendered `schedule.title` but DB column is `custom_caption` | Use `schedule.custom_caption \|\| schedule.title \|\| 'Untitled'` |
| Test import paths broke on Linux | Lowercase import but folder is `Schedule/` (case-sensitive FS) | Match import paths exactly to filesystem casing |
| `@apply` variant prefix error in CSS | Tailwind `@apply` can't use `hover:` etc. inside `@layer components` | Move pseudo-class states to raw CSS |
| Vitest tests fail after past-date blocking | Hardcoded April 2026 dates are now `isPast=true` | Use future dates (May 2026+) in test mocks |
| `Route not found: POST /api/api/chatbot/message` | `VITE_API_BASE_URL` already ends in `/api`; service added `/api/` again | Use `/chatbot/*` not `/api/chatbot/*` in service paths |
| `GEMINI_MODEL=Gemini 2.0 Flash` invalid | Display name used instead of API model ID | Use `gemini-2.0-flash` (lowercase, hyphenated) |
| TikTok `code_challenge` required | TikTok requires PKCE even for web server apps | Add `code_challenge` + `code_challenge_method=S256` to authorize URL |
| TikTok PKCE `invalid_request` | TikTok sandbox expects HEX digest, not base64url | Use `.digest('hex')` not `.digest('base64url')` for code_challenge |
| TikTok code body encoding | `URLSearchParams` corrupts `*` and `!` chars in TikTok auth codes | Use manual `encodeURIComponent()` body construction |
| TikTok `scope_not_authorized` on token exchange | `video.publish`/`video.upload` require Content Posting API approval | Use `user.info.basic` only until TikTok app is approved for posting |
| TikTok `scope_not_authorized` 401 on `/user/info` | `follower_count` field requires `user.info.stats` scope, not covered by `user.info.basic` | Remove `follower_count` from `fetchUserInfo` fields query; hardcode to `0` |

## Session 3 Update (2026-04-20) — Publish Automation + UI Cleanup

### Backend — Publish Automation (UC007/UC009) ✅
- Implemented `autoPublishJob.js` with `node-cron` scheduling in **WIB** (`Asia/Jakarta`).
- Cron window locked to **2026 only**, **08:00–22:00 WIB**.
- Added Supabase pre-check function in job flow:
  - count due rows in `content_queue_schedules` before executing batch.
- Added resilient startup behavior:
  - if `node-cron` is missing, server does not hard-crash and logs install hint.
- Completed `publishService.js` error handling:
  - `getDueSchedules()` now throws on Supabase error.
  - filters by `isScheduleTimeReached(...)`.
  - updates schedule status to `published/failed`.
  - writes logs into `publish_status_logs`.

### Backend — TikTok Direct Publish (Content Posting API) ✅
- Implemented `tiktokPublishService.publishScheduledContent(scheduleId)`:
  - fetches schedule + linked TikTok account + media asset.
  - resolves media URL from Supabase storage (signed URL/public URL fallback).
  - builds caption from idea/caption/hashtags.
  - submits direct publish to TikTok endpoint:
    - `/v2/post/publish/video/init/`
  - optionally fetches publish status:
    - `/v2/post/publish/status/fetch/`
- Added token validity/refresh handling before publish.
- Added manual trigger endpoint support:
  - `POST /api/tiktok/publish/:scheduleId` (route already wired in `tiktokRoutes.js`).

### Frontend — Loader / Navbar Cleanup ✅
- `KineticLoader.jsx` simplified to **loader-only** (glass card removed).
- Loading text kept below square/dot loader with class:
  - `className="StringLoading"`.
- `Navbar.jsx` search bar removed (affects all pages using Navbar, including Profile page).

### Frontend — Admin User Removal (prepared) ⚠️
- Prepared dashboard-side remove flow:
  - remove action button + loading state + service call pattern.
- Backend delete route still required for full end-to-end if not yet present:
  - `DELETE /api/admin/users/:id`.
