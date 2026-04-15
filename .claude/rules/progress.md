# LeadFlow — Project Progress Tracker
**Last updated:** 2026-04-15
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
| Login | `/login` | ✅ Working |
| Register | `/register` | ✅ Working |
| OTP Verification | `/verify-otp` | ✅ Working |
| Profile | `/profile` | ✅ Working |
| Calendar | `/calendar` | ✅ UI exists, backend connected |
| Admin — All Accounts | `/admin` | ✅ Working end-to-end |
| Admin — Marketing Staff | `/admin/marketing-staff` | ✅ Working end-to-end |
| Admin — Business Owners | `/admin/business-owners` | ✅ Working end-to-end |
| Content Schedule Queue | `/schedule` | ✅ Working — list/queue view wired to calendar API |
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
- `ProtectedRoute` + `GuestRoute` with role guard
- All 9 service layer files + `adminService.js`
- All 5 hooks (`useAuth`, `useContentIdeas`, `useSchedule`, `useInteraction`, `useDashboard`)
- `appRoutes.jsx` with role-based redirect on login

### Tests — Frontend + AI Only
- **Frontend:** 6 Vitest test files — login form, OTP, calendar view, drag-drop, login page, schedule queue page — **43/43 passing**
- **AI Analyzer:** 2 pytest files for classifier unit tests and `/analyze` route
- **Backend:** ❌ No Jest/Supertest tests written yet

### AI Analyzer (FastAPI)
- Project structure exists (`app/`, `routers/`, `services/`, `utils/`)
- `requirements.txt` present
- All service files (`classifier.py`, `sentiment.py`, `preprocessor.py`) are **empty stubs**
- `openai_client.py` utility exists

---

## Current State

### What Actually Works End-to-End
1. Register → OTP email → verify → JWT login → protected routes
2. Profile: view, update name/phone, change password, upload/delete photo (Supabase Storage)
3. Calendar: CRUD, weekly/monthly view, draft management, drag-drop with thumbnail preservation, correct slot-card titles
4. Media: TikTok-compliant MP4/H.264 video + multi-photo carousel upload (50 MB); natural-dimension preview; thumbnails preserved after drag-drop
5. Content Schedule Queue (`/schedule`): working list view — month navigation, status filter, search, thumbnail, delete, navigate to calendar for edit/view
6. Admin panel: login as `tegarinsan49@gmail.com` → auto-redirect to `/admin` → 3 pages (All Accounts, Marketing Staff, Business Owners) with search, role change, active toggle — fully connected to Supabase
7. **UI Redesign (2026-04-15):** All red (`#e31837`) brand color replaced with orange (`#f6b70a`) across all components, pages, CSS, and Tailwind config. Favicon updated to Krench Chicken logo. All "LeadFlow" user-visible strings replaced with "Krench Chicken". Past calendar dates marked "Not Available" and blocked from schedule creation and drag-drop (both monthly CalendarView and weekly DragDropSlot). Past-date block logic added to `CalendarPage.jsx` `handleSlotClick` and `handleDrop`.

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
4. **TikTok OAuth flow** — `tiktokRoutes.js`, `tiktokOAuthService.js`, token encryption in DB
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
| RLS policy inconsistency | Used `auth.uid()` instead of project's custom `get_caller_user_id()` | All RLS policies must use `get_caller_role()` and `get_caller_user_id()` from migration 001 |
| Supabase grant vs RLS confusion | `service_role` bypasses RLS but NOT table-level GRANTs — two independent layers | Table GRANT = PostgreSQL privilege; RLS Policy = row filter. Both needed. |
| Login redirects to wrong page | `navigate()` called before React state update settled | Use `useEffect` watching `isAuthenticated` to trigger navigation after state confirms |
| `dashboardPath` stale in async handler | Closure captured `dashboardPath` before login state updated | `login()` returns `redirectTo` from fresh API response; `useEffect` reads live state |
| Thumbnails vanish after drag-drop | `dragDrop` replaced state with raw API response missing computed fields | Added `schedulesRef` + `draftsRef` via `useRef`; merge computed fields back after API response |
| Slot card titles always blank | `ScheduleQueueCard.jsx` rendered `schedule.title` but DB column is `custom_caption` | Use `schedule.custom_caption \|\| schedule.title \|\| 'Untitled'` |
| Test import paths broke on Linux | Imported from lowercase `schedule/` but folder is `Schedule/` (case-sensitive FS) | Match import paths exactly to filesystem casing |
