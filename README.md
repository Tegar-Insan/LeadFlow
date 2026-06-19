# LeadFlow — TikTok Content Management System

**Client:** Krench Chicken, Bogor, West Java, Indonesia
**Author:** Tegar Insan Tohaga (A22EC4043) | UTM Faculty of Computing

A full-stack web application to manage TikTok content creation, scheduling, publishing, and interaction monitoring for Krench Chicken's marketing team.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS (port 5173) |
| Backend | Node.js + Express.js + TypeScript (port 5000) |
| AI Microservice | Python FastAPI (port 8000) |
| Database | PostgreSQL via Supabase |
| AI Model | Claude (Anthropic API) |
| TikTok | TikTok Business API v2 (Login Kit) |

---

## Prerequisites (Windows)

Install the following before continuing:

1. **Node.js** — download from [https://nodejs.org](https://nodejs.org) (LTS version). Includes `npm`.
2. **Python 3.11+** — download from [https://www.python.org/downloads](https://www.python.org/downloads). Check **"Add Python to PATH"** during install.
3. **Git** — download from [https://git-scm.com](https://git-scm.com).
4. **Docker Desktop** *(optional, for Docker approach)* — [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop).

> All commands below are for **Command Prompt (cmd)** or **PowerShell**. Do not use Git Bash for the Python venv commands.

---

## Project Structure

```
LEADFLOW-2/
├── backend/          # Node.js + Express API (port 5000)
├── frontend/         # React + Vite UI (port 5173)
├── ai-analyzer/      # Python FastAPI AI classifier (port 8000)
├── database/
│   └── migrations/   # 001 → 019 SQL files (run in order)
├── docker-compose.yml
└── README.md
```

---

## Option A — Run with Docker (Recommended for Windows)

This is the easiest path on Windows. Docker runs all three services together.

### Step 1 — Clone the repository

```cmd
git clone https://github.com/your-username/LEADFLOW-2.git
cd LEADFLOW-2
```

### Step 2 — Create the root `.env` file

Create a file named `.env` in the `LEADFLOW-2/` root folder (same folder as `docker-compose.yml`):

```env
# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres.your-project-ref:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# Security
JWT_SECRET=your_long_random_string_here
OTP_SECRET=another_random_string_here

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# TikTok
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_TOKEN_ENCRYPTION_KEY=64_hex_chars_generate_below
TIKTOK_MEDIA_UPLOAD_URL=https://open.tiktokapis.com
```

To generate `TIKTOK_TOKEN_ENCRYPTION_KEY` (run in PowerShell):
```powershell
-join ((0..31) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

### Step 3 — Start all services

```cmd
docker compose up --build
```

Wait for all three containers to start. You will see logs from `leadflow-backend`, `leadflow-frontend`, and `leadflow-ai`.

### Step 4 — Open the app

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)
- AI Analyzer: [http://localhost:8000](http://localhost:8000)

### Stop

```cmd
docker compose down
```

---

## Option B — Run Manually (Without Docker)

Use this if you prefer to run each service in a separate terminal window.

### Step 1 — Clone the repository

```cmd
git clone https://github.com/your-username/LEADFLOW-2.git
cd LEADFLOW-2
```

---

### Step 2 — Set up the Backend

Open a new terminal window and run:

```cmd
cd backend
npm install
```

Create `backend\.env` by copying the example:

```cmd
copy .env.example .env
```

Open `backend\.env` in Notepad and fill in your values:

```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres.your-project-ref:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
SUPABASE_STORAGE_BUCKET=leadflow-media

# JWT
JWT_SECRET=your_long_random_string
JWT_EXPIRES=7d
JWT_REFRESH_EXPIRES_IN=30d

# OTP
OTP_EXPIRES_MINUTES=10

# SMTP (Gmail — use App Password, not your account password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=LeadFlow <noreply@leadflow.id>

# Frontend URL
FRONTEND_URL=http://localhost:5173
FRONTEND_BASE_URL=http://localhost:5173

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# TikTok
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:5000/api/tiktok/callback
TIKTOK_TOKEN_ENCRYPTION_KEY=your_64_hex_chars
TIKTOK_MEDIA_PUBLIC_BASE_URL=https://your-cloudflare-tunnel.trycloudflare.com

# Timezone
TZ=Asia/Jakarta
```

Start the backend:

```cmd
npm run dev
```

The backend runs at [http://localhost:5000](http://localhost:5000).

---

### Step 3 — Set up the Frontend

Open a **new** terminal window:

```cmd
cd frontend
npm install
```

Create `frontend\.env`:

```cmd
copy .env.example .env
```

If `.env.example` does not exist, create `frontend\.env` manually:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_DEBUG_AUTH=false
```

Start the frontend:

```cmd
npm run dev
```

The app opens at [http://localhost:5173](http://localhost:5173).

---

### Step 4 — Set up the AI Analyzer

Open a **new** terminal window:

```cmd
cd ai-analyzer
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `ai-analyzer\.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

Start the AI service:

```cmd
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The AI classifier runs at [http://localhost:8000](http://localhost:8000).

> **Note:** You must run `venv\Scripts\activate` every time you open a new terminal for the AI analyzer.

---

## Step 5 — Set up the Database (Supabase)

1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. In your project, go to **SQL Editor**.
3. Run the migration files in order from `database/migrations/`:
   - Open each file in Notepad, copy the SQL, paste into the Supabase SQL Editor, and click **Run**.
   - Run them in this order: `001` → `002` → `003` → ... → `019`

Alternatively, use the master script if available:
- Open `database/migrations/MASTER_RUN_ALL.sql` and run it in the Supabase SQL Editor.

4. After migrations, get your connection details from Supabase:
   - **Project URL** → Settings → API → Project URL
   - **Anon Key** → Settings → API → `anon public`
   - **Service Role Key** → Settings → API → `service_role` (keep this secret)
   - **Database URL** → Settings → Database → Connection string → **Session pooler** (port 6543)

---

## Available Routes

| Role | Entry Page |
|---|---|
| `admin` | `/admin` |
| `marketing_staff` | `/calendar` |
| `business_owner` | `/dashboard` |

---

## Useful Commands

### Backend

```cmd
cd backend
npm run dev          # Start with hot-reload
npm run build        # Compile TypeScript
npm test             # Run Jest tests
npm run typecheck    # TypeScript type check only
```

### Frontend

```cmd
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
npm test             # Run Vitest tests
```

### AI Analyzer

```cmd
cd ai-analyzer
venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pytest tests\        # Run pytest tests
```

---

## Environment Variables Summary

| Variable | Where | Description |
|---|---|---|
| `SUPABASE_URL` | backend | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | backend | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Secret service role key — **required** or all routes return 401 |
| `DATABASE_URL` | backend | Session pooler connection string (port 6543) |
| `JWT_SECRET` | backend | Any long random string |
| `SMTP_USER` / `SMTP_PASS` | backend | Gmail address + App Password for OTP emails |
| `ANTHROPIC_API_KEY` | backend + ai-analyzer | Claude API key |
| `TIKTOK_CLIENT_KEY` | backend | From TikTok Developer Console |
| `TIKTOK_CLIENT_SECRET` | backend | From TikTok Developer Console |
| `TIKTOK_TOKEN_ENCRYPTION_KEY` | backend | 64 hex chars (32 bytes), generate randomly |
| `VITE_API_BASE_URL` | frontend | Must be `http://localhost:5000/api` |

---

## Common Issues on Windows

| Problem | Fix |
|---|---|
| `python` not found | Re-install Python and check "Add to PATH" |
| `venv\Scripts\activate` fails in PowerShell | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` first |
| `npm` not found | Re-install Node.js from nodejs.org |
| Port 5000 already in use | Change `PORT=5001` in `backend\.env` and `VITE_API_BASE_URL=http://localhost:5001/api` in `frontend\.env` |
| CORS error in browser | Make sure `FRONTEND_URL=http://localhost:5173` is set in `backend\.env` |
| 401 on all API calls | `SUPABASE_SERVICE_ROLE_KEY` is missing or wrong in `backend\.env` |
| OTP email not sending | Use Gmail App Password (not your account password) — enable 2FA on Gmail first |
| `CRLF` line ending errors | Run `git config --global core.autocrlf false` before cloning, or run `sed -i 's/\r//' filename` in Git Bash |

---

## TikTok Setup (Optional — for publish features)

1. Create a TikTok Developer account at [https://developers.tiktok.com](https://developers.tiktok.com).
2. Create an app and add a **Login Kit** product.
3. Set the redirect URI to exactly: `http://localhost:5000/api/tiktok/callback`
4. Copy the **Client Key** and **Client Secret** into `backend\.env`.
5. For photo/video publishing, you need Content Posting API approval from TikTok.

---

## Use Cases Implemented

| UC | Feature | Status |
|---|---|---|
| UC001 | Register with OTP email | ✅ Done |
| UC002 | Login / Logout (JWT) | ✅ Done |
| UC003 | Admin — manage user accounts | ✅ Done |
| UC004 | Input prompt for AI | ✅ Done |
| UC005 | Generate 3 content ideas via Claude | ✅ Done |
| UC006 | Approve / reject AI ideas → draft in calendar | ✅ Done |
| UC007 | Calendar CRUD + drag-drop + auto-publish | ✅ Done |
| UC008 | Upload photo / video to calendar slot | ✅ Done |
| UC009 | Publish status notifications | ✅ Done |
| UC010 | Fetch TikTok DMs + comments | ⚠️ Backend stub |
| UC011 | AI classify interactions | ✅ Done (FastAPI) |
| UC012 | Interaction inbox — view, reply, delete | ⚠️ Frontend ready, backend stub |
| UC013 | Business Owner weekly dashboard | ⚠️ Frontend ready, backend stub |
