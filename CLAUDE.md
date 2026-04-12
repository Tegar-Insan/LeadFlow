# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (port 5000)
cd backend && npm run dev          # nodemon — auto-restart on change
cd backend && npm test             # Jest + Supertest (--runInBand)

# Frontend (port 5173)
cd frontend && npm run dev
cd frontend && npm test            # Vitest run (no watch)
cd frontend && npm run build

# AI Analyzer (port 8000) — MUST activate venv first
cd ai-analyzer
source venv/bin/activate           # Linux only — never venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pytest tests/                      # AI tests

# Fix CRLF if any file was copied from Windows
sed -i 's/\r//' <file>
```

## Architecture

Three services communicate over localhost; nginx proxies them in production.

```
Browser → Frontend/Vite (5173)
        → Backend/Express (5000)  → Supabase PostgreSQL (Session Pooler 6543)
                                  → OpenAI GPT-4o
                                  → TikTok Business API v2
                                  → AI Analyzer/FastAPI (8000) → OpenAI GPT-4o
```

**Backend** follows strict MVC: `routes → middleware → controllers → services → models`. Validators run before controllers. Cron jobs live in `jobs/`. All routes must be mounted in `src/app.js` before the 404 catch-all — unmounted routes are silently dead.

**Frontend** uses React Router v6. All API calls go through `src/services/` — never call the backend directly from components. Protected routes wrap in `<ProtectedRoute allowedRoles={[...]}>`. Token lives in `localStorage` as `token` (case-sensitive).

**AI Analyzer** is a separate Python FastAPI microservice. It only exposes `POST /analyze`. Pydantic schemas are in `app/models/schemas.py`.

## Mandatory Backend Helpers

Never bypass these — they are enforced by project rules:

| Helper | Import path | Purpose |
|---|---|---|
| `responseHelper` | `utils/responseHelper` | `success(res,{...})` / `error(res,{...})` — never raw `res.json()` |
| `jwtHelper` | `utils/jwtHelper` | `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `decodeToken` |
| `passwordHelper` | `utils/passwordHelper` | `hashPassword`, `comparePassword` (bcrypt) |
| `jakartaTime` | `utils/jakartaTime` | `nowJakarta`, `jakartaToUTC`, `isScheduleTimeReached` — all timestamps store UTC, display WIB |

## Currently Mounted Routes (app.js)

Only four route groups are wired up. All others are controller stubs not yet mounted:

- `POST|GET /api/auth/*` — full auth flow (register, OTP, login, refresh, logout, me)
- `GET|PUT|POST|DELETE /api/profile/*` — profile + photo CRUD
- `GET|POST|PUT|DELETE /api/calendar/*` — calendar CRUD + draft management
- `POST|GET|DELETE /api/media/*` — file uploads to Supabase Storage

**Not yet mounted** (controllers exist but are unreachable): prompt, contentIdea, IdeaValidation, contentScheduleQueue, publish, interaction, dashboard, role, tiktok routes.

## Database

PostgreSQL via Supabase. Service Role key required in `.env` — missing = 401 everywhere.

- Migrations: `database/migrations/001` → `017` in order (17 total, run via `MASTER_RUN_ALL.sql`)
- All RLS policies use `get_caller_user_id()` / `get_caller_role()` (defined in migration 001) — never `auth.uid()`
- Every new `CREATE TABLE` migration must include explicit `GRANT` statements (migration 017 sets `ALTER DEFAULT PRIVILEGES` for future tables)
- Storage bucket `leadflow-media` provisioned in migration 015

## Frontend Patterns

```jsx
// Contexts → named export/import
export const AuthContext = createContext();
import { AuthContext } from '../context/AuthContext';

// Components/pages → default export/import
export default function ProfilePage() {}
import ProfilePage from '../pages/profile/ProfilePage';

// Time formatting (frontend only)
import { nowWIB } from '../utils/formatDate';   // NOT nowJakarta (that's backend)

// Env vars require VITE_ prefix
import.meta.env.VITE_API_BASE_URL
```

Tailwind tokens: `brand: #e31837`, `surface.DEFAULT: #131313`, fonts: `Manrope` (display), `Inter` (body). Dark theme throughout.

## Progress Tracker

See `.claude/rules/progress.md` for what is working, what is stub-only, and the phased next-steps plan (UC004–UC013).
