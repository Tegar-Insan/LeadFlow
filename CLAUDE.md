# CLAUDE.md — LeadFlow: TikTok Marketing Management System

This file provides **complete guidance** to Claude when working on the LeadFlow codebase.
It is synthesized from the official SDS (Software Design Specification), SRS (Software
Requirements Specification), and STD (Software Testing Documentation) for Krench Chicken.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Product Name** | LeadFlow |
| **Client** | Krench Chicken — Fried chicken restaurant, Bogor, West Java, Indonesia |
| **Business Owner** | Dadang Hermawan |
| **Academic Context** | Bachelor of Computer Science (Software Engineering), UTM Faculty of Computing |
| **Author** | Tegar Insan Tohaga (A22EC4043) |
| **SDS Version** | v3 (30 Jan 2026) |
| **SRS Version** | v3 (30 Jan 2026) |
| **STD Version** | v3 (30 Jan 2026) |

LeadFlow is a **web-based TikTok marketing management platform** that replaces Krench
Chicken's manual, fragmented TikTok workflow with a structured, AI-assisted system
covering content planning, scheduling, auto-publishing, and customer interaction handling.

---

## 2. System Scope

### The system WILL:
- Allow users to register, log in, and manage their profiles (with OTP email verification)
- Enable Marketing Staff to input prompt ideas and generate TikTok content ideas via AI (GPT-4o)
- Allow Marketing Staff to validate AI content ideas (approve → auto-added to calendar as draft; reject → discarded)
- Allow Marketing Staff to manage a content calendar queue (create, edit, delete, drag-and-drop, filter by day/week/month)
- Allow Marketing Staff to upload content assets (poster photos and short-form videos) attached to calendar slots
- Auto-publish scheduled content to TikTok via TikTok Business API at the user-specified GMT+7 time
- Notify Marketing Staff of publish success or failure
- Fetch TikTok interaction data (comments + DMs) into a unified inbox
- Classify interactions using AI (GPT-4o via Python FastAPI) by sentiment and priority
- Allow Marketing Staff to manage, reply to, and delete interactions
- Provide Business Owner with a weekly dashboard (total posts, total interactions, response rate, engagement trends), filterable by this week / last week / two weeks ago
- Enforce Role-Based Access Control (RBAC) for three roles: Admin, Business Owner, Marketing Staff

### The system will NOT:
- Create or edit video content automatically
- Manage marketing for platforms other than TikTok
- Handle sales transactions, order management, or customer delivery
- Support multi-restaurant usage or third-party restaurant onboarding
- Manage influencer contracts or paid TikTok Ads campaigns
- Handle order processing, POS, or payment features

---

## 3. Architecture Overview

LeadFlow follows **MVC (Model-View-Controller)** architecture, split into three independent
services that communicate over HTTP.

```
leadflow/
├── frontend/       → ReactJS 18 + Vite + Tailwind CSS (View layer)
├── backend/        → Node.js + Express.js MVC (Controller + Model layer)
├── ai-analyzer/    → Python FastAPI (AI intent classifier — isolated microservice)
└── database/       → PostgreSQL via Supabase (migrations + seeds)
```

### Communication pattern
- Frontend ↔ Backend: RESTful API over HTTPS, JSON payloads, JWT Bearer tokens, `withCredentials: true`
- Backend → AI Analyzer: HTTP POST to FastAPI `/analyze` endpoint
- Backend → TikTok Business API: HTTPS + OAuth 2.0 access tokens
- Backend → OpenAI GPT-4o: HTTPS + API key (for content idea generation)
- All timestamps: **WIB (Asia/Jakarta, GMT+7)** — use `dayjs` with timezone plugins in backend (`jakartaTime.js`) and `formatDate.js` in frontend

---

## 4. Tech Stack — Exact Versions (Do Not Deviate)

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | ReactJS | 18 |
| Frontend build | Vite | latest |
| Frontend styling | Tailwind CSS | latest |
| Frontend testing | Vitest | latest |
| Backend runtime | Node.js | v25.2.1 |
| Backend package manager | NPM | v11.6.4 |
| Backend framework | Express.js | latest |
| Backend testing | Supertest + Jest | latest |
| Database | PostgreSQL (via Supabase) | v18.x |
| BaaS | Supabase | v2.90.1 |
| AI language model | OpenAI GPT-4o | latest API |
| TikTok integration | TikTok Business API | v2 |
| AI microservice | Python FastAPI | latest |
| CI/CD | GitHub Actions | latest |
| IDE | VS Code / Cursor | latest |
| Version control | Git | 2.52.0 |

**FORBIDDEN:** Do not introduce any framework, language, or tool not listed above.
The tech stack is fixed and documented in the SDS. Adding unapproved dependencies
violates the project spec.

---

## 5. Folder Structure (Strict — Do Not Deviate)

Every file must be placed exactly as defined. Audit against this structure before
creating any new file.

```
leadflow/
│
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   └── index.html                  # MUST be at frontend root, not inside public/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   └── krench-logo.png
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   ├── Toast.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   ├── RegisterForm.jsx
│   │   │   │   └── OTPVerification.jsx
│   │   │   ├── content/
│   │   │   │   ├── ContentIdeaCard.jsx
│   │   │   │   ├── IdeaValidationPanel.jsx
│   │   │   │   ├── PromptInputForm.jsx
│   │   │   │   └── GeneratedIdeasList.jsx
│   │   │   ├── schedule/
│   │   │   │   ├── CalendarView.jsx
│   │   │   │   ├── ScheduleQueueCard.jsx
│   │   │   │   ├── DragDropSlot.jsx
│   │   │   │   └── ScheduleFilterBar.jsx
│   │   │   ├── media/
│   │   │   │   ├── MediaUploader.jsx
│   │   │   │   └── MediaPreview.jsx
│   │   │   ├── interaction/
│   │   │   │   ├── InteractionInbox.jsx
│   │   │   │   ├── CommentCard.jsx
│   │   │   │   ├── DMCard.jsx
│   │   │   │   └── ReplyBox.jsx
│   │   │   ├── publish/
│   │   │   │   ├── PublishStatusBadge.jsx
│   │   │   │   └── PublishNotification.jsx
│   │   │   └── dashboard/
│   │   │       ├── WeeklyReport.jsx
│   │   │       ├── EngagementChart.jsx
│   │   │       └── WeeklyFilterBar.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   └── OTPPage.jsx
│   │   │   ├── profile/
│   │   │   │   └── ProfilePage.jsx
│   │   │   ├── content/
│   │   │   │   ├── PromptPage.jsx
│   │   │   │   ├── GeneratedIdeasPage.jsx
│   │   │   │   └── IdeaValidationPage.jsx
│   │   │   ├── schedule/
│   │   │   │   ├── CalendarPage.jsx
│   │   │   │   └── ContentScheduleQueuePage.jsx
│   │   │   ├── media/
│   │   │   │   └── MediaUploadPage.jsx
│   │   │   ├── publish/
│   │   │   │   └── PublishStatusPage.jsx
│   │   │   ├── interaction/
│   │   │   │   └── InteractionMessagePage.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── WeeklyDashboardPage.jsx
│   │   │   ├── tiktok/
│   │   │   │   └── TikTokConnectPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useContentIdeas.js
│   │   │   ├── useSchedule.js
│   │   │   ├── useInteraction.js
│   │   │   ├── usePublishStatus.js
│   │   │   └── useDashboard.js
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── contentService.js
│   │   │   ├── scheduleService.js
│   │   │   ├── mediaService.js
│   │   │   ├── interactionService.js
│   │   │   ├── publishService.js
│   │   │   ├── dashboardService.js
│   │   │   └── tiktokService.js
│   │   │
│   │   ├── utils/
│   │   │   ├── formatDate.js           # GMT+7 Jakarta timezone handler (dayjs)
│   │   │   ├── tokenHelper.js          # localStorage token read/write
│   │   │   ├── roleGuard.js
│   │   │   └── constants.js
│   │   │
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                   # Tailwind base import
│   │
│   ├── tests/
│   │   ├── components/
│   │   │   ├── LoginForm.test.jsx
│   │   │   ├── OTPVerification.test.jsx
│   │   │   ├── CalendarView.test.jsx
│   │   │   └── DragDropSlot.test.jsx
│   │   └── pages/
│   │       ├── LoginPage.test.jsx
│   │       └── ScheduleQueuePage.test.jsx
│   │
│   ├── .env
│   ├── .env.example
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js               # REQUIRED — Tailwind won't apply without this
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                   # Supabase admin client — re-exported as supabaseAdmin
│   │   │   ├── supabase.js
│   │   │   ├── openai.js               # GPT-4o client
│   │   │   ├── tiktok.js               # TikTok Business API config
│   │   │   └── env.js
│   │   │
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Role.js
│   │   │   ├── UserProfile.js
│   │   │   ├── Prompt.js
│   │   │   ├── ContentIdea.js
│   │   │   ├── ContentQueueSchedule.js
│   │   │   ├── ContentAsset.js         # Handles both PosterAsset and VideoAsset
│   │   │   ├── PublishStatusLog.js
│   │   │   ├── TikTokAccount.js
│   │   │   ├── InteractionMessage.js
│   │   │   ├── ClassifyTypeMessage.js
│   │   │   └── WeeklyDashboardReport.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js       # Register, Login, OTP, Logout
│   │   │   ├── profileController.js
│   │   │   ├── roleController.js
│   │   │   ├── promptController.js
│   │   │   ├── contentIdeaController.js
│   │   │   ├── ideaValidationController.js
│   │   │   ├── contentScheduleQueueController.js
│   │   │   ├── calendarController.js
│   │   │   ├── mediaController.js
│   │   │   ├── publishStatusController.js
│   │   │   ├── interactionMessageController.js
│   │   │   ├── interactionCommentController.js
│   │   │   ├── tiktokController.js     # OAuth connect, publish
│   │   │   └── dashboardController.js
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── profileRoutes.js
│   │   │   ├── roleRoutes.js
│   │   │   ├── promptRoutes.js
│   │   │   ├── contentIdeaRoutes.js
│   │   │   ├── scheduleRoutes.js
│   │   │   ├── calendarRoutes.js
│   │   │   ├── mediaRoutes.js
│   │   │   ├── publishRoutes.js
│   │   │   ├── interactionRoutes.js
│   │   │   ├── tiktokRoutes.js
│   │   │   └── dashboardRoutes.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js       # JWT verification → attaches req.user
│   │   │   ├── roleMiddleware.js       # RBAC: roleMiddleware(['admin'])
│   │   │   ├── rateLimiter.js          # Brute-force protection
│   │   │   ├── errorHandler.js         # Global error handler
│   │   │   ├── validateRequest.js      # Joi/Zod schema validation
│   │   │   └── sanitizeInput.js        # XSS/injection sanitizer
│   │   │
│   │   ├── services/
│   │   │   ├── authService.js          # OTP generation, JWT signing
│   │   │   ├── otpService.js           # OTP email dispatch (Gmail SMTP)
│   │   │   ├── contentIdeaService.js   # OpenAI prompt → idea generation
│   │   │   ├── scheduleService.js      # Queue management logic
│   │   │   ├── publishService.js       # Auto-publish at GMT+7 time
│   │   │   ├── tiktokOAuthService.js   # TikTok OAuth 2.0 flow
│   │   │   ├── tiktokPublishService.js # Push content to TikTok API
│   │   │   ├── interactionService.js   # Fetch DMs + Comments from TikTok
│   │   │   └── dashboardService.js     # Weekly stats aggregation
│   │   │
│   │   ├── jobs/
│   │   │   ├── autoPublishJob.js       # node-cron: trigger publish in GMT+7
│   │   │   └── fetchInteractionJob.js  # Periodic TikTok interaction fetch
│   │   │
│   │   ├── validators/
│   │   │   ├── authValidator.js
│   │   │   ├── contentValidator.js
│   │   │   ├── scheduleValidator.js
│   │   │   └── interactionValidator.js
│   │   │
│   │   ├── utils/
│   │   │   ├── jwtHelper.js
│   │   │   ├── passwordHelper.js       # bcrypt hashing
│   │   │   ├── jakartaTime.js          # Dayjs GMT+7 timezone util
│   │   │   ├── responseHelper.js       # ALWAYS use success()/error() — never raw res.json()
│   │   │   └── logger.js               # Winston logger
│   │   │
│   │   └── app.js                      # Express app entry point
│   │
│   ├── tests/
│   │   ├── auth.test.js
│   │   ├── contentIdea.test.js
│   │   ├── schedule.test.js
│   │   ├── publish.test.js
│   │   ├── interaction.test.js
│   │   └── dashboard.test.js
│   │
│   ├── server.js                       # Entry: validates env → tests Supabase → starts Express
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── ai-analyzer/
│   ├── app/
│   │   ├── main.py                     # FastAPI app entry point
│   │   ├── routers/
│   │   │   └── analyze.py              # POST /analyze endpoint
│   │   ├── services/
│   │   │   ├── classifier.py           # Intent classification (GPT-4o)
│   │   │   ├── sentiment.py            # Sentiment scoring
│   │   │   └── preprocessor.py         # Text cleaning & normalization
│   │   ├── models/
│   │   │   └── schemas.py              # Pydantic request/response schemas
│   │   └── utils/
│   │       ├── openai_client.py        # GPT-4o integration
│   │       └── logger.py
│   │
│   ├── tests/
│   │   ├── test_classifier.py
│   │   └── test_analyze_route.py
│   │
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
│
├── database/
│   ├── migrations/
│   │   ├── 001_create_roles.sql
│   │   ├── 002_create_users.sql
│   │   ├── 003_create_user_profiles.sql
│   │   ├── 004_create_prompts.sql
│   │   ├── 005_create_content_ideas.sql
│   │   ├── 006_create_content_queue_schedule.sql
│   │   ├── 007_create_content_assets.sql
│   │   ├── 008_create_publish_status_log.sql
│   │   ├── 009_create_tiktok_accounts.sql
│   │   ├── 010_create_interaction_messages.sql
│   │   ├── 011_create_classify_type_message.sql
│   │   └── 012_create_weekly_dashboard_report.sql
│   └── seeds/
│       ├── seed_roles.sql
│       └── seed_admin.sql
│
├── .github/workflows/
│   ├── ci-frontend.yml                 # Vitest
│   ├── ci-backend.yml                  # Supertest
│   └── ci-ai.yml                       # pytest
│
├── docs/
│   ├── SDS.md
│   ├── API_ENDPOINTS.md
│   └── SETUP_GUIDE.md
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 6. Commands

### Backend
```bash
cd backend
npm run dev       # nodemon watch mode (port 5000)
npm start         # production
npm test          # Jest --runInBand (serial)
```

### Frontend
```bash
cd frontend
npm run dev       # Vite dev server (port 5173)
npm run build     # production build
npm test          # vitest run (single run)
npx vitest run tests/components/LoginForm.test.jsx  # single file
```

### AI Analyzer
```bash
cd ai-analyzer
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database (Supabase)
- Use **SQLTools + PostgreSQL driver in VS Code/Cursor**
- Connection: Session Pooler `aws-0-ap-southeast-1.pooler.supabase.com`, port `6543`
- Username format: `postgres.[project-ref]`
- Run `MASTER_RUN_ALL.sql` to execute all migrations in order

---

## 7. Environment Variables

### Backend `.env` (required)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
OPENAI_API_KEY=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=      # Gmail requires App Password, NOT account password
PORT=5000
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000
VITE_DEBUG_AUTH=false    # Set true to enable mock mode for frontend-only testing
```

### AI Analyzer `.env`
```
OPENAI_API_KEY=
PORT=8000
```

---

## 8. Database Schema (Canonical — All Column Names)

**CRITICAL:** Always verify column names against migration files before writing any
model or query. Using wrong column names is the #1 source of bugs.

### `roles`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `name` | VARCHAR | `admin`, `business_owner`, `marketing_staff` |

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `role_id` | INT | FK → roles.id |
| `email` | VARCHAR | unique |
| `password_hash` | VARCHAR | bcrypt — NOT `password` |
| `created_at` | TIMESTAMP | |

### `user_profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `user_id` | INT | FK → users.id |
| `full_name` | VARCHAR | |
| `phone` | VARCHAR | |
| `email` | VARCHAR | |

### `pending_registrations`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `role_name` | TEXT | CHECK constraint — NOT FK to roles |
| `email` | VARCHAR | |
| `otp_code` | VARCHAR | |
| `expires_at` | TIMESTAMP | |

> `pending_registrations` is a TEMPORARY table. It must NOT have FK dependencies on `roles`.
> Use `role_name TEXT` with a CHECK constraint. Role ID is resolved via `Role.findByName()` at
> account creation time.

### `prompts`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `user_id` | INT | FK → users.id |
| `prompt_text` | VARCHAR | |
| `created_at` | TIMESTAMP | |

### `content_ideas`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `prompt_id` | INT | FK → prompts.id |
| `idea_title` | VARCHAR | |
| `hook` | VARCHAR | |
| `caption` | VARCHAR | |
| `hashtags` | VARCHAR | |
| `status` | VARCHAR | `pending_validation`, `approved`, `rejected` |
| `created_at` | TIMESTAMP | |

### `content_queue_schedules`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `idea_id` | INT | FK → content_ideas.id |
| `created_by` | INT | FK → users.id |
| `priority_order` | INT | |
| `content_status` | VARCHAR | `draft`, `scheduled`, `uploaded`, `published`, `failed` |
| `scheduled_at` | TIMESTAMP WITH TIME ZONE | **Always GMT+7** |
| `auto_publish` | BOOLEAN | |
| `hashtag_type` | VARCHAR | |
| `caption_type` | VARCHAR | |
| `music_type` | VARCHAR | |
| `tiktok_account_id` | INT | FK → tiktok_accounts.id |
| `created_at` | TIMESTAMP | |

### `content_assets`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `queue_calendar_id` | INT | FK → content_queue_schedules.id |
| `content_type` | VARCHAR | `poster_photo` or `short_video` |
| `file_name` | VARCHAR | |
| `file_size` | INT | bytes — max 50MB for video |
| `uploaded_at` | TIMESTAMP | |

### `publish_status_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `queue_calendar_id` | INT | FK → content_queue_schedules.id |
| `status_code` | VARCHAR | |
| `status_message` | VARCHAR | |
| `created_at` | TIMESTAMP | |

### `tiktok_accounts`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `tiktok_id` | VARCHAR | |
| `tiktok_name` | VARCHAR | |
| `token_ref` | VARCHAR | OAuth access token reference |
| `music_type` | VARCHAR | |
| `connected_at` | TIMESTAMP | |

### `interaction_messages`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `tiktok_account_id` | INT | FK → tiktok_accounts.id |
| `interaction_type_id` | INT | FK → classify_type_messages.id |
| `type_name` | VARCHAR | |
| `message_text` | TEXT | |
| `channel_type` | VARCHAR | `comment` or `dm` |
| `amount_message_sent` | INT | |
| `send_message_status` | VARCHAR | |
| `created_at` | TIMESTAMP | |

### `classify_type_messages`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `sentiment_type_name` | VARCHAR | e.g. `purchase_intent`, `complaint`, `general` |
| `priority_level` | VARCHAR | `high`, `medium`, `low` |

### `weekly_dashboard_reports`
| Column | Type | Notes |
|---|---|---|
| `id` | INT | PK |
| `tiktok_account_id` | INT | FK → tiktok_accounts.id |
| `queue_calendar_id` | INT | FK → content_queue_schedules.id |
| `week_start` | DATE | |
| `week_end` | DATE | |
| `total_posts` | INT | |
| `total_interactions` | INT | |
| `created_at` | TIMESTAMP | |

---

## 9. User Roles & Access Control

Three roles are seeded into the `roles` table:

| Role | DB Value | Access Level |
|---|---|---|
| Admin | `admin` | Manage all user accounts, roles, permissions |
| Business Owner | `business_owner` | Weekly dashboard, manage permission roles |
| Marketing Staff | `marketing_staff` | Full content + interaction workflow |

### RBAC enforcement:
- `authMiddleware.js` — verifies JWT, attaches `req.user`
- `roleMiddleware.js` — checks `req.user.role` against allowed roles array
- Usage: `router.get('/admin-only', authMiddleware, roleMiddleware(['admin']), controller)`

---

## 10. Authentication Flow (OTP + JWT)

1. User fills registration form (name, email, phone, password, role)
2. System validates inputs (unique email, unique phone, password strength)
3. System saves pending registration to `pending_registrations` (role stored as `role_name TEXT`)
4. System sends OTP code to user's email via **Gmail SMTP with App Password**
5. User enters OTP on `/otp` page
6. System validates OTP (check code + expiry)
7. System creates real account in `users` + `user_profiles`, resolving `role_id` via `Role.findByName()`
8. System deletes `pending_registrations` record
9. On login: system verifies email + bcrypt password_hash, returns JWT access token
10. Token stored in `localStorage` via `tokenHelper.js`
11. Axios in `authService.js` auto-attaches Bearer token; handles 401 → token refresh

**Security requirements:**
- Passwords stored as bcrypt hashes only — never plain text
- JWT secret loaded from env; never hardcoded
- All API communication over HTTPS
- Rate limiter on auth endpoints (brute-force protection)
- Input sanitization (XSS/injection) on all endpoints
- OTP has an expiry time; expired OTPs are rejected

---

## 11. Use Cases (All 13 — From SRS)

### UC001 — Register Account
- Any user registers with: name, email, phone, password, role
- System validates inputs, sends OTP email, stores in `pending_registrations`
- On OTP success: creates `users` + `user_profiles` records
- Error handling: duplicate email → toast "Email already exist"; duplicate phone → toast; weak password → highlight field; empty fields → block submission

### UC002 — Authenticate User
- User logs in with email + password
- System verifies, creates session, redirects to role-based dashboard
- Logout: clears JWT from localStorage, redirects to login
- Error: "Incorrect email or password"

### UC003 — Manage Account (Admin only)
- Admin views list of all user accounts
- Admin can update: name, email, role, account status
- Admin can search users by name or email
- Changes saved to `users` + `user_profiles`

### UC004 — Input Prompt Idea
- Marketing Staff navigates to AI Chatbot page
- Enters or selects a quick prompt template
- System validates and saves prompt to `prompts` table with status `draft`

### UC005 — Generate Content Idea
- System sends prompt to OpenAI GPT-4o
- AI returns structured content ideas (title, hook, caption, hashtags)
- System stores ideas in `content_ideas` with status `pending_validation`
- Displays 3 ideas to user; supports regeneration
- Error: display notification if AI service unavailable

### UC006 — Validate AI Content Ideas
- Marketing Staff reviews each generated idea
- **Approve** → status → `approved`; system **automatically creates a Draft entry** in `content_queue_schedules` linked to the idea
- **Reject** → status → `rejected`; idea removed from UI; NOT added to calendar
- Calendar draft entry is initially unscheduled

### UC007 — Manage Content Schedule Queue
- Marketing Staff can view calendar (day / week / month filter)
- Create new schedule slot manually via "+" button in calendar
- Edit existing draft: update title, caption, hashtags, publish date/time
- Delete draft or scheduled item
- **Drag and drop** content items to different calendar date/time slots
- Set preferred publish date/time (WIB GMT+7)
- System validates schedule time
- Status flow: `draft` → `scheduled` → `published` | `failed`
- At scheduled time: system auto-triggers TikTok publish via cron job (`autoPublishJob.js`)
- Marketing Staff receives publish status notification

### UC008 — Upload Content Feed in Calendar
- Marketing Staff selects a scheduled slot
- Uploads either **poster photo** (PNG/JPG) or **short-form video** (MP4/MOV)
- Video size limit: **50 MB max** — system blocks and notifies if exceeded
- Supports multiple photos (select with Ctrl); one video per slot
- Replace: re-upload overwrites existing asset
- Status updates to `uploaded_for_publishing`

### UC009 — Notify Publish Status
- After auto-publish attempt: system receives result from TikTok Business API
- Logs result in `publish_status_logs`
- Updates `content_queue_schedules.content_status`
- Displays notification to Marketing Staff (success or failure + reason)

### UC010 — Fetch Data Interaction
- Marketing Staff clicks "Refresh Data" in Interaction page
- System calls TikTok Business API to fetch latest comments + DMs
- Stores in `interaction_messages` with status `unclassified`
- Displays fetched interactions in unified inbox

### UC011 — Classify Interaction Message
- System (automated) sends unclassified interactions to Python FastAPI AI Analyzer
- FastAPI `/analyze` endpoint uses GPT-4o to classify: sentiment type + priority level
- Results stored in `classify_type_messages`
- `interaction_messages.interaction_type_id` updated
- Status updated to `classified`
- Inbox refreshes with classification labels

### UC012 — Manage Interaction Message
- Marketing Staff views unified inbox (DMs + Comments, sorted by priority)
- Filter by: channel type (DM / comment)
- Select interaction → view details + AI classification result
- Send reply: reply saved and pushed to TikTok; status updated
- Delete sent message or reply
- Dashboard interaction counters updated

### UC013 — View Weekly Dashboard (Business Owner)
- Business Owner views weekly performance metrics:
  - Total posts published
  - Total interactions received
  - Response rate
  - Engagement trends
- Filter options: **This week / Last week / Two weeks ago**
- Data displayed in graphical + numerical format
- Empty state: "No data available" if no records for selected period

---

## 12. Backend Coding Rules

### Response format — ALWAYS use `responseHelper.js`
```js
// ✅ Correct
res.json(success({ data: user, message: 'User created' }));
res.json(error('Validation failed', 400));

// ❌ Wrong
res.json({ user });
res.status(200).json({ success: true });
```

### Model queries — always verify column names against migration files
```js
// ✅ Correct (matches migration)
const user = await supabaseAdmin
  .from('users')
  .select('id, role_id, email, password_hash')

// ❌ Wrong (legacy names — will cause silent 400s)
.select('userid, roleid, password, role_name')
```

### All timestamp operations — use `jakartaTime.js` (dayjs GMT+7)
```js
import { nowJakarta, toJakarta } from '../utils/jakartaTime.js';
const scheduleTime = toJakarta(req.body.scheduled_at);
```

### Route mounting — all routes MUST be mounted in `app.js`
New route files in `src/routes/` do nothing until added to `app.js`. Check before testing.

### Password hashing
```js
// Always bcrypt — never store plain text
import { hashPassword, comparePassword } from '../utils/passwordHelper.js';
```

### JWT
```js
import { signToken, verifyToken } from '../utils/jwtHelper.js';
```

---

## 13. Frontend Coding Rules

### State management
- `AuthContext` (useReducer) — user, token, role state; wraps entire app in `main.jsx`
- `NotificationContext` — toast notifications; wraps entire app in `main.jsx`

### Routing
- All routes defined in `src/routes/AppRoutes.jsx`
- Protected routes use `<ProtectedRoute allowedRoles={[...]}>`
- All dashboard paths redirect to `/calendar` by default

### API calls
- All API calls go through service files in `src/services/`
- Axios instance in `authService.js` auto-attaches Bearer token
- Handles 401 → transparent token refresh

### Token storage
- Access token: `localStorage` via `tokenHelper.js`
- User object: `localStorage` for session restoration on page reload

### Env vars
- All frontend env vars use `VITE_` prefix (e.g. `VITE_API_URL`)
- Debug mock mode: `VITE_DEBUG_AUTH=true`

### Tailwind design system
Use only semantic tokens defined in `tailwind.config.js`:
- **Colors:** `brand` (brand red `#E63946`), `gold`, `surface.*`, `text.primary`, `text.secondary`, `text.muted`, `success`
- **Fonts:** `font-display` (Syne — display), `font-body` (DM Sans — body), `font-mono`
- **Animations:** `animate-fade-in`, `animate-slide-up`, `animate-slide-up-fade`, `animate-shake`
- **Theme:** Dark theme throughout

### Import/export hygiene — CRITICAL
Named exports vs default exports mismatch causes runtime failures.
Always verify at file creation:
```jsx
// ✅ Named export + named import
export const AuthContext = createContext();
import { AuthContext } from '../context/AuthContext';

// ✅ Default export + default import
export default function LoginForm() {}
import LoginForm from '../components/auth/LoginForm';
```

---

## 14. AI Analyzer (Python FastAPI) Rules

### Entry point
```python
# ai-analyzer/app/main.py
uvicorn app.main:app --reload
# Runs on port 8000
```

### Main endpoint
```
POST /analyze
Body: { "text": "...", "channel_type": "comment"|"dm" }
Response: { "sentiment_type": "...", "priority_level": "high|medium|low", "classified_by": "gpt-4o" }
```

### Schema validation
- All request/response models defined in `app/models/schemas.py` using **Pydantic**

### Classification logic (`classifier.py`)
- Calls GPT-4o with a structured prompt
- Returns: sentiment category + priority level
- Categories include: `purchase_intent`, `complaint`, `general_inquiry`, `compliment`, `spam`

### Preprocessing (`preprocessor.py`)
- Clean text before sending to GPT-4o
- Handle Indonesian + English mixed text (Krench Chicken audience)
- Remove noise, normalize whitespace

### Python testing
```bash
cd ai-analyzer
pytest tests/
```

---

## 15. TikTok Business API Integration

### OAuth 2.0 flow (`tiktokOAuthService.js`)
1. Redirect user to TikTok authorization URL
2. TikTok redirects back with `code`
3. Exchange `code` for `access_token`
4. Store token reference in `tiktok_accounts.token_ref`

### Auto-publishing (`tiktokPublishService.js` + `autoPublishJob.js`)
- `node-cron` job runs every minute in GMT+7
- Queries `content_queue_schedules` for records where `scheduled_at <= now()` AND `content_status = 'scheduled'` AND `auto_publish = true`
- Calls TikTok API to publish; updates status to `published` or `failed`
- Creates record in `publish_status_logs`
- Sends notification to Marketing Staff

### Interaction fetching (`interactionService.js` + `fetchInteractionJob.js`)
- Periodic cron job fetches latest comments and DMs from TikTok API
- Stores in `interaction_messages` with status `unclassified`
- Triggers AI classification pipeline

---

## 16. Cron Jobs (`backend/src/jobs/`)

| File | Trigger | Action |
|---|---|---|
| `autoPublishJob.js` | Every minute (GMT+7) | Find scheduled content → publish to TikTok → log result |
| `fetchInteractionJob.js` | Periodic (configurable) | Fetch TikTok DMs + comments → store → classify via AI |

All cron times expressed in WIB (Asia/Jakarta). Use `jakartaTime.js` for comparisons.

---

## 17. Security Requirements (NFR-001)

- All passwords: bcrypt hashed — never stored plain
- All sensitive fields (API tokens, JWT secret): environment variables only — never hardcoded
- All API communication: HTTPS
- JWT access tokens: Bearer header; verified by `authMiddleware.js` on every protected route
- RBAC: enforced by `roleMiddleware.js` — each route explicitly declares allowed roles
- Rate limiting: `rateLimiter.js` on auth endpoints
- Input sanitization: `sanitizeInput.js` on all endpoints (XSS/injection protection)
- Request validation: `validateRequest.js` with Joi/Zod schemas
- OTP expiry: enforced; expired OTPs rejected
- Gmail SMTP: requires **App Password** — never the Gmail account password
- TikTok OAuth tokens: stored as references; never exposed in API responses

---

## 18. Reliability Requirements (NFR-002)

- System handles TikTok API failures gracefully — no data loss, clear error messages
- System handles OpenAI API failures — display notification; do not crash
- Failed publish attempts: logged in `publish_status_logs`, status = `failed`, notification sent
- All external API calls: wrapped in try/catch with meaningful error responses
- Database connection errors: logged via Winston (`logger.js`); system maintains previous state

---

## 19. Content Upload Rules

| Asset Type | Allowed Formats | Max Size |
|---|---|---|
| Poster Photo | PNG, JPG, JPEG | Reasonable limit |
| Short Video | MP4, MOV | **50 MB max** |

- Multiple photos allowed per slot (Ctrl+click)
- One video per slot
- Replacing existing media: system overwrites old asset
- File validated on upload: format + size checked before storage

---

## 20. Testing Strategy

### Frontend — Vitest
Location: `frontend/tests/`
- `LoginForm.test.jsx` — UC002 login form validation
- `OTPVerification.test.jsx` — UC001 OTP entry
- `CalendarView.test.jsx` — UC007 calendar rendering
- `DragDropSlot.test.jsx` — UC007 drag-and-drop behavior

### Backend — Supertest + Jest
Location: `backend/tests/`
- `auth.test.js` — TC001, TC002 (register + login)
- `contentIdea.test.js` — TC004, TC005, TC006
- `schedule.test.js` — TC007, TC008
- `publish.test.js` — TC009
- `interaction.test.js` — TC010, TC011, TC012
- `dashboard.test.js` — TC013

### AI Analyzer — pytest
Location: `ai-analyzer/tests/`
- `test_classifier.py`
- `test_analyze_route.py`

### CI/CD — GitHub Actions
- `.github/workflows/ci-frontend.yml` — runs Vitest on PR
- `.github/workflows/ci-backend.yml` — runs Supertest on PR
- `.github/workflows/ci-ai.yml` — runs pytest on PR

---

## 21. Test Cases Reference (from STD)

Key test cases per module:

**TC001 — Register Account**
- TC001_01: Valid registration → success message
- TC001_02: Invalid email format → highlight email field
- TC001_03: Existing email → "Email already exist"
- TC001_04: Empty fields → block submission

**TC002 — Authenticate User**
- TC002_01: Valid login → redirect to dashboard
- TC002_02: Invalid email format → warning message
- TC002_03: Empty password → fill out warning
- TC002_04: Wrong password → "Incorrect password"
- TC002_05: Unregistered email → register new email prompt
- TC002_06: Logout → redirect to login page

**TC007 — Manage Content Schedule Queue**
- TC007_01: View calendar → displays calendar
- TC007_02: Create schedule slot → displays new slot
- TC007_03: Edit slot → updates with new details
- TC007_04: Remove slot → removes from calendar
- TC007_05: Drag and drop → content moves to new date
- TC007_06: Filter (Day/Week/Month) → displays filtered view

**TC008 — Upload Content**
- TC008_01: Upload single poster → success
- TC008_02: Upload multiple posters (Ctrl+click) → success
- TC008_03: Upload video → success
- TC008_04: Upload video >50MB → size exceeded notification

---

## 22. Non-Functional Requirements Summary

| ID | Category | Requirement |
|---|---|---|
| NFR-001 | Security | JWT auth, RBAC, bcrypt, HTTPS, OTP, rate limiting, input sanitization |
| NFR-002 | Reliability | Graceful API failure handling, no data loss, actionable error messages |

Additional design constraints:
- **Browser compatibility:** Google Chrome, Microsoft Edge (latest 2 versions)
- **OS:** Windows 10+, macOS Monterey+, Linux Ubuntu 24.04
- **Min hardware:** 8GB RAM, dual-core, SSD
- **Timezone:** All scheduled operations in WIB (Asia/Jakarta, GMT+7)
- **Agile dev practices:** Git version control, sprint-based incremental delivery

---

## 23. Critical Lessons Learned (Known Bug Patterns)

These have caused real bugs in this project. Always check before coding:

### 1. Column name consistency
Models must use exact column names from migration SQL files.
Common wrong/old names that break things:
```
❌ userid    → ✅ id
❌ roleid    → ✅ role_id
❌ password  → ✅ password_hash
❌ role_name (on users) → ✅ joined from roles table
```

### 2. `pending_registrations` — no FK to roles
This table stores `role_name` as `TEXT` with CHECK constraint.
Never add a foreign key from this table to the `roles` table.
The role ID is resolved at account creation via `Role.findByName()`.

### 3. Named vs default export mismatches
Every new component/context must use consistent export style.
Mismatches (`export default` vs `export const`) cause silent `undefined` errors.
Always verify at file creation time.

### 4. `index.html` placement
Must be at `frontend/` root level — NOT inside `frontend/public/`.

### 5. `postcss.config.js` must exist
Without it, Tailwind CSS does not apply styles. Never omit this file.

### 6. Gmail SMTP
Use an **App Password** generated from Google Account settings.
Never use the Gmail account login password — it will be rejected.

### 7. Forward-reference in migrations
Migrations run in numbered order (001 → 012). A migration cannot reference a table
defined in a higher-numbered migration. Fix by reordering or using deferred constraints.

### 8. All routes must be mounted in `app.js`
Creating a route file in `src/routes/` has no effect until it is imported and mounted
in `src/app.js`. Always check the mount list after adding a new route.

### 9. VITE_ prefix for frontend env vars
Frontend env vars without `VITE_` prefix are not exposed by Vite. Will be `undefined`.

---

## 24. Module Quick Reference

| Module | Use Cases | Frontend Pages | Backend Routes |
|---|---|---|---|
| User Management | UC001–UC003 | LoginPage, RegisterPage, OTPPage, ProfilePage | `/api/auth`, `/api/profile`, `/api/roles` |
| Content Management | UC004–UC009 | PromptPage, GeneratedIdeasPage, IdeaValidationPage, CalendarPage, ContentScheduleQueuePage, MediaUploadPage, PublishStatusPage | `/api/content`, `/api/schedule`, `/api/calendar`, `/api/media`, `/api/publish` |
| Interaction Message | UC010–UC012 | InteractionMessagePage | `/api/interaction`, `/api/tiktok` |
| Weekly Dashboard | UC013 | WeeklyDashboardPage | `/api/dashboard` |

---

## 25. Ports

| Service | Port |
|---|---|
| Frontend (Vite) | 5173 |
| Backend (Express) | 5000 |
| AI Analyzer (FastAPI) | 8000 |

---

## 26. What Claude Must NOT Do

- Do not introduce any framework, library, or language not in the approved tech stack
- Do not create files outside the defined folder structure
- Do not use raw `res.json()` in backend — always use `responseHelper.js`
- Do not store passwords in plain text — always bcrypt
- Do not hardcode secrets, API keys, or JWT secrets — always use `.env`
- Do not skip input validation on any API endpoint
- Do not manage platforms other than TikTok
- Do not add sales, POS, payment, or e-commerce features
- Do not create files with mismatched exports without verifying named/default consistency
- Do not write timestamps without converting to GMT+7 (WIB) using `jakartaTime.js`
- Do not add FK from `pending_registrations` to `roles`
- Do not mount new routes without adding them to `app.js`
- Do not create a migration that references a table defined in a later-numbered migration