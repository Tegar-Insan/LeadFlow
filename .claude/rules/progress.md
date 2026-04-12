# LeadFlow — Project Progress Tracker
**Last updated:** 2026-04-12
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
| Profile | `POST /api/profile/me/photo` | ✅ Done (fixed bucket + grant bugs) |
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
| **Admin** | **`GET /api/admin/users`** | **✅ Done (today)** |
| **Admin** | **`PUT /api/admin/users/:id/role`** | **✅ Done (today)** |
| **Admin** | **`PUT /api/admin/users/:id/status`** | **✅ Done (today)** |

**Infrastructure done:**
- `authMiddleware` + `roleMiddleware` RBAC on all protected routes
- `responseHelper` used consistently (never raw `res.json()`)
- `jakartaTime.js` for all timestamps (store UTC, display WIB)
- `passwordHelper` bcrypt throughout
- `jwtHelper` access + refresh token rotation
- `emailService` Gmail SMTP for OTP delivery
- `rateLimiter`, `sanitizeInput`, `validateRequest` middleware
- `autoPublishJob.js` + `fetchInteractionJob.js` job stubs wired in

### Frontend — Structure + Auth Flow Working
All pages and components exist. Auth flow (register → OTP → login → JWT) is fully functional.

| Page | Route | State |
|---|---|---|
| Login | `/login` | ✅ Working (redirect race-condition fixed today) |
| Register | `/register` | ✅ Working |
| OTP Verification | `/verify-otp` | ✅ Working |
| Profile | `/profile` | ✅ Working (photo upload fixed) |
| Calendar | `/calendar` | ✅ UI exists, backend connected |
| **Admin — All Accounts** | **`/admin`** | **✅ Working end-to-end (today)** |
| **Admin — Marketing Staff** | **`/admin/marketing-staff`** | **✅ Working end-to-end (today)** |
| **Admin — Business Owners** | **`/admin/business-owners`** | **✅ Working end-to-end (today)** |
| Content Schedule Queue | `/schedule` | ⚠️ UI exists, backend stub |
| Prompt Input | `/content/prompt` | ⚠️ UI exists, backend stub |
| Generated Ideas | `/content/ideas` | ⚠️ UI exists, backend stub |
| Idea Validation | `/content/validate` | ⚠️ UI exists, backend stub |
| Media Upload | `/media` | ✅ UI exists, backend connected |
| Publish Status | `/publish` | ⚠️ UI exists, backend stub |
| Interaction Inbox | `/interaction` | ⚠️ UI exists, backend stub |
| Weekly Dashboard | `/dashboard` | ⚠️ UI exists, backend stub |
| TikTok Connect | `/tiktok/connect` | ⚠️ UI exists, backend stub |

**Frontend infrastructure done:**
- `AuthContext` + `NotificationContext` providers
- `ProtectedRoute` + `GuestRoute` with role guard (GuestRoute added today to login/register)
- All 9 service layer files (API call layer) + `adminService.js` added today
- All 5 hooks (`useAuth`, `useContentIdeas`, `useSchedule`, `useInteraction`, `useDashboard`)
- `appRoutes.jsx` with role-based redirect on login (race-condition fixed today)

### Tests — Frontend + AI Only
- **Frontend:** 6 Vitest test files for login form, OTP, calendar view, drag-drop, login page, schedule queue page
- **AI Analyzer:** 2 pytest files for classifier unit tests and `/analyze` route
- **Backend:** ❌ No Jest/Supertest tests written yet

### AI Analyzer (FastAPI)
- Project structure exists (`app/`, `routers/`, `services/`, `utils/`)
- `requirements.txt` present
- All service files (`classifier.py`, `sentiment.py`, `preprocessor.py`) are **empty stubs**
- `openai_client.py` utility exists

---

## What Was Built Today (2026-04-12)

### UC003 — Admin User Management (complete)

#### Backend
- **`backend/src/controllers/roleController.js`** — 3 handlers:
  - `getAllUsers` — lists all users (email, role, phone, is_active, email_verified, joined date); supports `?role=` filter + pagination
  - `updateUserRole` — validates new role, blocks self-role-change, updates `role_id` in DB
  - `toggleUserStatus` — activates/deactivates an account; blocks self-deactivation
- **`backend/src/routes/roleRoutes.js`** — all routes stacked with `authMiddleware → roleMiddleware(['admin'])`
- **`backend/src/app.js`** — mounted `adminRoutes` at `/api/admin`

#### Frontend
- **`frontend/src/services/adminService.js`** — `getAllUsers`, `updateUserRole`, `toggleUserStatus`
- **`frontend/src/components/dashboard/AdminLayout.jsx`** — shared shell (Sidebar + Navbar + 3-page sub-navigation tabs) used by all 3 admin pages
- **`frontend/src/components/dashboard/AdminUserTable.jsx`** — reusable table component with search, role-change dropdown, active toggle switch, Apply button; used by all 3 pages
- **`frontend/src/pages/dashboard/AdminAllUsersPage.jsx`** → `/admin` — all registered accounts + stat cards
- **`frontend/src/pages/dashboard/AdminMarketingStaffPage.jsx`** → `/admin/marketing-staff` — marketing staff filtered view
- **`frontend/src/pages/dashboard/AdminBusinessOwnersPage.jsx`** → `/admin/business-owners` — business owners filtered view

#### Database seed
- **`database/seeds/seed_tegar_admin.sql`** — assigns `tegarinsan49@gmail.com` as admin; handles both "already registered" and "not yet registered" cases with `DO $$ ... END $$` block

### Auth Bugs Fixed Today

| Bug | Root Cause | Fix |
|---|---|---|
| Admin redirected to `/calendar` after login | `AuthContext.dashboardPath` returned `/admin/dashboard` (non-existent route) | Changed to `/admin` |
| Admin redirected to `/calendar` after login (2nd cause) | React render race: `navigate()` fired before `dispatch(LOGIN_SUCCESS)` settled; `ProtectedRoute` saw stale `isAuthenticated = false` and bounced | `LoginPage` now uses `useEffect` watching `isAuthenticated && loginDone` — navigates only after state is confirmed settled |
| Authenticated user could revisit `/login` | No `GuestRoute` on login/register routes | Wrapped `/login` and `/register` with `GuestRoute` in `appRoutes.jsx` |
| Admin saw "Create Post" button (irrelevant) | No role check on sidebar button | Hidden when `roleName === 'admin'` |

---

## Current State

### What Actually Works End-to-End
1. Register → OTP email → verify → JWT login → protected routes
2. Profile: view, update name/phone, change password, upload/delete photo (Supabase Storage)
3. Calendar: CRUD, monthly view, draft management
4. Media: upload PNG/JPG/MP4/MOV ≤50MB, server-side validation
5. **Admin panel: login as `tegarinsan49@gmail.com` → auto-redirect to `/admin` → 3 pages (All Accounts, Marketing Staff, Business Owners) with search, role change, active toggle — fully connected to Supabase**

### What Is Wired Up but Blocked on Backend Stubs
- Content idea generation (GPT-4o) — frontend UI ready, controller/service empty
- Idea validation (approve/reject) — frontend UI ready, no backend logic
- TikTok OAuth connect — frontend UI ready, no OAuth flow
- Interaction inbox (DM + comments) — frontend UI ready, no TikTok fetch logic
- Weekly dashboard — frontend UI ready, no aggregation queries
- Publish status — frontend UI ready, no TikTok publish integration

---

## Next Steps (Priority Order)

### Phase 1 — Core Content Pipeline (UC004–UC006)
These are the heart of the product. Do these first.

1. **Backend: Prompt → GPT-4o → Content Ideas**
   - Implement `promptController.js` + `promptRoutes.js`
   - Implement `contentIdeaController.js` + `contentIdeaService.js`
   - Wire OpenAI GPT-4o to generate exactly 3 ideas per prompt
   - Save to `prompts` and `content_ideas` (status = `pending_validation`)

2. **Backend: Idea Validation (approve/reject)**
   - Implement `IdeaValidationController.js`
   - Approve → auto-create draft row in `content_queue_schedules`
   - Reject → update status to `rejected`

3. **Mount all stub routes in `app.js`** (currently they do nothing)

### Phase 2 — TikTok Integration (UC009–UC012)
4. **TikTok OAuth flow** — `tiktokRoutes.js`, `tiktok0AuthService.js`, token encryption in DB
5. **Publish to TikTok** — `publishService.js`, `tiktokPublishService.js`, write to `publish_status_logs`
6. **Fetch interactions** — `fetchInteractionJob.js` implementation, write to `interaction_messages`
7. **Interaction inbox** — view, reply (push to TikTok), delete

### Phase 3 — AI Classifier (UC011)
8. **FastAPI classifier** — implement `classifier.py` + `sentiment.py` using GPT-4o
9. **`/analyze` endpoint** — accept `{text, channel_type}`, return `{sentiment_type, priority_level}`
10. **Backend job** — forward unclassified rows to FastAPI, flip status to `classified`

### Phase 4 — Weekly Dashboard (UC013)
11. **Weekly dashboard backend** — aggregation queries (current/last/2 weeks ago), restrict to `business_owner`
12. **Wire up `WeeklyDashboardPage.jsx`** — currently empty stub, connect to `/api/dashboard/weekly`

### Phase 5 — Testing + CI/CD
13. **Backend tests** — Jest + Supertest covering full auth flow, calendar CRUD, media validation, cron trigger, admin CRUD
14. **GitHub Actions** — implement `.github/workflows/ci-backend.yml`, `ci-frontend.yml`, `ci-ai.yml`
15. **Move `/github/` folder to `/.github/`** (currently in wrong location — CI will never trigger)

---

## Lessons Learned (Do Not Repeat)

| Bug | Root Cause | Fix |
|---|---|---|
| `permission denied for table` | New tables created via raw SQL don't auto-inherit Supabase's default privileges | Always include `GRANT` in every `CREATE TABLE` migration; migration 017 sets `ALTER DEFAULT PRIVILEGES` for future tables |
| `Bucket not found` | Storage bucket must be provisioned separately from table schema | Create bucket via `storage.buckets` insert in a migration (015) |
| RLS policy inconsistency | Used `auth.uid()` instead of project's custom `get_caller_user_id()` | All RLS policies in this project must use `get_caller_role()` and `get_caller_user_id()` from migration 001 |
| Supabase grant vs RLS confusion | service_role bypasses RLS but NOT table-level GRANTs — two independent layers | Table GRANT = PostgreSQL privilege; RLS Policy = row filter. Both needed. |
| Login redirects to wrong page | `navigate()` called before React state update settled — `ProtectedRoute` saw stale `isAuthenticated = false` | Use `useEffect` watching `isAuthenticated` to trigger navigation after state confirms; never call `navigate()` immediately after async dispatch |
| `dashboardPath` stale in async handler | Closure captured `dashboardPath` before login state updated | `login()` now returns `redirectTo` computed from fresh API response; `useEffect` reads live `dashboardPath` from settled state |
