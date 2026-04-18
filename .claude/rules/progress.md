# LeadFlow — Project Progress Tracker
**Last updated:** 2026-04-17
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
| Chatbot | `POST /api/chatbot/message` | ✅ Done — Gemini-powered, proxies to Python FastAPI |
| Chatbot | `POST /api/chatbot/approve-schedule` | ✅ Done — creates calendar entry from AI recommendation |
| Chatbot | `POST /api/chatbot/reject-schedule` | ✅ Done — returns acknowledgement |

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
- `brightdataService.js` — Bright Data Dataset API fetch + 1-hr cache + `summarizePosts()`
- `geminiService.js` — thin Node.js proxy to Python AI microservice at port 8000

### Frontend — Structure + Auth Flow Working
All pages and components exist. Auth flow (register → OTP → login → JWT) is fully functional.

| Page | Route | State |
|---|---|---|
| Login | `/login` | ✅ Working |
| Register | `/register` | ✅ Working — Stitch "Digital Growth Login" design applied |
| OTP Verification | `/otp` | ✅ Working |
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
- All 9 service layer files + `adminService.js` + `chatbotService.js`
- All 5 hooks (`useAuth`, `useContentIdeas`, `useSchedule`, `useInteraction`, `useDashboard`)
- `appRoutes.jsx` with role-based redirect on login
- `TransitionLoader.jsx` — global page-transition glassmorphism loader wired in `App.jsx`

### Tests — Frontend + AI Only
- **Frontend:** 6 Vitest test files — login form, OTP, calendar view, drag-drop, login page, schedule queue page — **43/43 passing**
- **AI Analyzer:** 2 pytest files for classifier unit tests and `/analyze` route
- **Backend:** ❌ No Jest/Supertest tests written yet

### AI Analyzer — Python FastAPI (port 8000) — NOW IMPLEMENTED
All previously empty stubs are fully written:

| File | Status |
|---|---|
| `app/main.py` | ✅ FastAPI app, mounts analyze + chatbot routers, CORS, health check |
| `app/models/schemas.py` | ✅ Pydantic models: AnalyzeRequest/Response, ChatRequest/Response, ScheduleRecommendation, TikTokAnalysisResponse |
| `app/routers/analyze.py` | ✅ `POST /analyze` — Gemini classifier for UC011 |
| `app/routers/chatbot.py` | ✅ `POST /chatbot/message` + `POST /chatbot/analyze-tiktok` |
| `app/services/classifier.py` | ✅ Gemini-powered sentiment + priority classifier |
| `app/services/gemini_chatbot.py` | ✅ Full Gemini chat service — history conversion, schedule sentinel parsing, TikTok analysis |
| `app/services/brightdata_service.py` | ✅ Bright Data Dataset API fetch, 1-hr cache, `summarize_posts()` |
| `app/utils/logger.py` | ✅ Logging config |
| `requirements.txt` | ✅ `fastapi`, `uvicorn`, `google-generativeai==0.8.3`, `httpx`, `python-dotenv`, `pydantic` |
| `ai-analyzer/.env` | ✅ `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.0-flash`, `BRIGHTDATA_KEY`, `BRIGHTDATA_DATASET_ID` |

**⚠️ Python venv not yet created** — needs `sudo apt install python3.12-venv` then:
```bash
cd ai-analyzer
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## Current State (2026-04-17)

### What Actually Works End-to-End
1. Register → OTP email → verify → JWT login → protected routes
2. Profile: view, update name/phone, change password, upload/delete photo (Supabase Storage)
3. Calendar: CRUD, weekly/monthly view, draft management, drag-drop with thumbnail preservation, correct slot-card titles
4. Media: TikTok-compliant MP4/H.264 video + multi-photo carousel upload (50 MB); natural-dimension preview; thumbnails preserved after drag-drop
5. Content Schedule Queue (`/schedule`): working list view — month navigation, status filter, search, thumbnail, delete, navigate to calendar for edit/view
6. Admin panel: login as `tegarinsan49@gmail.com` → auto-redirect to `/admin` → 3 pages (All Accounts, Marketing Staff, Business Owners) with search, role change, active toggle — fully connected to Supabase
7. **UI Redesign (2026-04-15):** All red (`#e31837`) brand color replaced with orange (`#f6b70a`). Favicon updated to Krench Chicken logo. All "LeadFlow" user-visible strings replaced with "Krench Chicken". Past calendar dates marked "Not Available" and blocked.
8. **Page Transition Loader (2026-04-17):** `KineticLoader.jsx` redesigned to match Stitch "Minimalist Loading Desktop" — transparent `backdrop-blur` overlay (not solid black), glassmorphism 200×200 card, neon yellow glowing rounded square icon, `LOADING` spaced text, 12 particle stars. `TransitionLoader.jsx` duration trimmed to 380ms.
9. **AI Chatbot — Gemini + Bright Data (2026-04-17):** Full architecture implemented:
   - **Python FastAPI** (`ai-analyzer/`) owns all Gemini calls via `google-generativeai` SDK
   - `POST /chatbot/message` — Gemini chat with TikTok intelligence context
   - `POST /chatbot/analyze-tiktok` — triggers fresh Bright Data fetch + Gemini analysis
   - `POST /analyze` — UC011 interaction classifier (Gemini replaces OpenAI)
   - **Node.js** `geminiService.js` is now a thin HTTP proxy to the Python service
   - **Schedule recommendation flow:** Gemini embeds `%%SCHEDULE%%...%%END%%` sentinel; Python strips + returns structured `schedule` object; frontend shows Approve/Reject card
   - **Frontend `AIChatbot.jsx`:** Approve → `POST /api/chatbot/approve-schedule` → creates calendar entry; Reject → acknowledgement bubble; "Lihat di Kalender →" button after approval
   - **`chatbotService.js`:** `sendChatMessage`, `approveScheduleFromChat`, `rejectScheduleFromChat` — all use correct `/chatbot/*` paths (no double `/api/api/` bug)
   - **`BRIGHTDATA_DATASET_ID=sd_mo28xy1k1k9teb30s2`** configured in both `backend/.env` and `ai-analyzer/.env`
   - **`GEMINI_MODEL=gemini-2.0-flash`** — correct model ID (not display name)

### What Is Wired Up but Blocked on Backend Stubs
- Content idea generation (Gemini) — frontend UI ready, controller/service empty
- Idea validation (approve/reject) — frontend UI ready, no backend logic
- TikTok OAuth connect — frontend UI ready, no OAuth flow
- Interaction inbox (DM + comments) — frontend UI ready, no TikTok fetch logic
- Weekly dashboard — frontend UI ready, no aggregation queries
- Publish status — frontend UI ready, no TikTok publish integration
- **AI microservice** — code complete but venv not created (needs `sudo apt install python3.12-venv`)

---

## Next Steps (Priority Order)

### Immediate — Unblock AI service
1. Run `sudo apt install python3.12-venv` in a terminal with sudo access
2. `cd ai-analyzer && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
3. `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
4. Verify: `curl http://127.0.0.1:8000/health`

### Phase 1 — Core Content Pipeline (UC004–UC006)
5. **Backend: Prompt → Gemini → Content Ideas**
   - Implement `promptController.js` + `promptRoutes.js`
   - Implement `contentIdeaController.js` + `contentIdeaService.js`
   - Call Python AI service or Gemini directly to generate exactly 3 ideas per prompt
   - Save to `prompts` and `content_ideas` (status = `pending_validation`)
6. **Backend: Idea Validation (approve/reject)**
   - Implement `IdeaValidationController.js`
   - Approve → auto-create draft row in `content_queue_schedules`
   - Reject → update status to `rejected`
7. **Mount all stub routes in `app.js`**

### Phase 2 — TikTok Integration (UC009–UC012)
8. TikTok OAuth flow — `tiktokRoutes.js`, `tiktokOAuthService.js`, token encryption in DB
9. Publish to TikTok — `publishService.js`, write to `publish_status_logs`
10. Fetch interactions — `fetchInteractionJob.js` implementation
11. Interaction inbox — view, reply (push to TikTok), delete

### Phase 3 — Weekly Dashboard (UC013)
12. Weekly dashboard backend — aggregation queries (current/last/2 weeks ago), restrict to `business_owner`
13. Wire up `WeeklyDashboardPage.jsx`

### Phase 4 — Testing + CI/CD
14. Backend tests — Jest + Supertest covering full auth flow, calendar CRUD, media validation
15. GitHub Actions — `.github/workflows/ci-backend.yml`, `ci-frontend.yml`, `ci-ai.yml`
16. Move `/github/` folder to `/.github/` (currently in wrong location — CI never triggers)

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
| `Cannot find module 'openai'` on startup | Top-level `require('openai')` crashes server if pkg missing | Use lazy `getOpenAI()` with try/catch |
| `@apply` variant prefix error in CSS | Tailwind `@apply` can't use `hover:` etc. inside `@layer components` | Move pseudo-class states to raw CSS |
| Vitest tests fail after past-date blocking | Hardcoded April 2026 dates are now `isPast=true` | Use future dates (May 2026+) in test mocks |
| `Route not found: POST /api/api/chatbot/message` | `VITE_API_BASE_URL=http://localhost:5000/api` already has `/api`; service added `/api/` again | Remove `/api` prefix from chatbot service paths — use `/chatbot/*` not `/api/chatbot/*` |
| `GEMINI_MODEL=Gemini 2.0 Flash` invalid | Display name used instead of API model ID | Use `gemini-2.0-flash` (lowercase, hyphenated) |
| Python venv creation fails | `python3.12-venv` package not installed on Ubuntu | `sudo apt install python3.12-venv` before `python3 -m venv venv` |
