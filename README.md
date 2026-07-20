# LeadFlow

LeadFlow is a TikTok content-management application built for Krench Chicken's marketing workflow. It combines content ideation, AI-generated images, approval and scheduling, media uploads, TikTok publishing, notifications, and role-based dashboards.

The repository contains three application services. Docker Compose starts those services, but the PostgreSQL database, authentication, and object storage are provided by an external Supabase project.

## Architecture

| Service | Technology | Container port | Purpose |
|---|---|---:|---|
| `frontend` | React 18, Vite, Tailwind CSS | 5173 | Browser UI |
| `backend` | Node.js, Express, TypeScript, Socket.IO | 5000 | REST API, authentication, scheduling, uploads, TikTok integration, WebSockets |
| `ai-analyzer` | Python 3.11, FastAPI | 8000 | Claude content/chat features, image generation, and agent workflows |
| Supabase | Hosted PostgreSQL, Auth, Storage | external | Persistent application data and media |

Inside the Compose network, the backend calls the AI service at `http://ai-analyzer:8000`. The browser calls the backend through the host port at `http://localhost:5000/api`.

## Important deployment note

The supplied [`docker-compose.yml`](docker-compose.yml) is a **development deployment**:

- the frontend runs the Vite development server;
- the backend runs through `nodemon` and `ts-node`;
- FastAPI runs with `--reload`;
- source folders are bind-mounted into the containers; and
- all three application ports are published directly to the host.

It is suitable for local development, demonstrations, and a trusted internal test server. It is not production-hardened. A public production deployment should use compiled artifacts, pinned runtime images, health checks, restart policies, a TLS reverse proxy, restricted port exposure, and production-specific URLs/CORS settings.

## Prerequisites

- Git
- Docker Desktop or Docker Engine with Docker Compose v2
- A Supabase project
- Anthropic API credentials
- OpenAI image API credentials if image generation is required
- SMTP credentials for real OTP email delivery
- TikTok developer credentials and a public HTTPS media URL for TikTok features

Node.js and Python do not need to be installed on the host when using Docker Compose.

## 1. Clone the repository

```powershell
git clone <repository-url> LeadFlow
cd LeadFlow
```

All following commands must be run from the repository root, where `docker-compose.yml` is located.

## 2. Prepare Supabase

Create a Supabase project, then apply **every** SQL file in [`database/migrations`](database/migrations) in filename order, from `001_Create_roles.sql` through `030_fix_ai_cover_asset_status_trigger.sql`.

The current root [`database/MASTER_RUN_ALL.sql`](database/MASTER_RUN_ALL.sql) is incomplete and must not be used as the only setup script for a new environment; it does not include all migrations through `030`.

The migrations create the application tables, views, triggers, policies, and the default `leadflow-media` storage bucket. If a migration fails, stop and resolve it before continuing rather than skipping it.

For a new Supabase project created with automatic Data API exposure disabled, verify that the migration grants expose the required tables to the appropriate API roles. Data API grants and row-level security are separate controls. Never place the service-role key in frontend code.

After migration, obtain these values from the Supabase project settings:

- project URL (`SUPABASE_URL`);
- service-role secret (`SUPABASE_SERVICE_ROLE_KEY`); and
- optionally the legacy anon/publishable key (`SUPABASE_ANON_KEY`). The current backend constructs an anon client only when this value is present.

## 3. Create the root environment file

Create `.env` beside `docker-compose.yml`. The file is ignored by Git. Do not commit it.

```dotenv
# Required: backend startup and Supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_SECRET
SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET

# Required by the current backend startup validation, even if TikTok is not used yet
TIKTOK_CLIENT_KEY=YOUR_TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET=YOUR_TIKTOK_CLIENT_SECRET
TIKTOK_TOKEN_ENCRYPTION_KEY=REPLACE_WITH_64_HEX_CHARACTERS
TIKTOK_MEDIA_PUBLIC_BASE_URL=https://YOUR_PUBLIC_MEDIA_HOST

# AI content and chatbot
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
ANTHROPIC_MODEL=claude-sonnet-4-6

# AI image generation; leave blank only if image generation is intentionally unavailable
IMAGE_GPT_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_IMAGE_MODEL=gpt-image-1

# OTP email. In development, a missing SMTP_USER causes the OTP to be logged instead.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_SMTP_USERNAME
SMTP_PASS=YOUR_SMTP_PASSWORD_OR_APP_PASSWORD
EMAIL_FROM="LeadFlow <noreply@example.com>"
```

Generate the required 32-byte TikTok encryption key in PowerShell:

```powershell
-join ((0..31) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

`OTP_SECRET` and `TIKTOK_MEDIA_UPLOAD_URL` appear in Compose for compatibility but are not required by the current code when the variables above are configured. The Compose file supplies the following internal/local values itself:

- `PORT=5000`
- `AI_SERVICE_URL=http://ai-analyzer:8000`
- `TIKTOK_REDIRECT_URI=http://localhost:5000/api/tiktok/callback`
- `FRONTEND_BASE_URL=http://localhost:5173`
- `VITE_API_BASE_URL=http://localhost:5000/api`

## 4. Validate and start the stack

Validate interpolation and Compose syntax:

```powershell
docker compose config --quiet
```

Build and start all services:

```powershell
docker compose up --build
```

To start in the background instead:

```powershell
docker compose up --build -d
docker compose logs -f
```

The backend deliberately checks Supabase on startup by querying the `roles` table. If the schema or Supabase credentials are wrong, the backend exits instead of starting in a partially working state. The backend also currently treats all TikTok configuration values as mandatory.

## 5. Verify the deployment

Open or request each endpoint:

| Check | URL | Expected result |
|---|---|---|
| Frontend | <http://localhost:5173> | LeadFlow login page |
| Backend health | <http://localhost:5000/health> | JSON containing `status: healthy` |
| AI health | <http://localhost:8000/health> | JSON with model/configuration status |
| AI API docs | <http://localhost:8000/docs> | FastAPI Swagger UI |

PowerShell health checks:

```powershell
Invoke-RestMethod http://localhost:5000/health
Invoke-RestMethod http://localhost:8000/health
docker compose ps
```

The AI health endpoint may report `openai_image_configured: false` while the service remains healthy; that means image generation credentials are absent or invalid, not that FastAPI failed to start.

## Day-to-day Compose commands

```powershell
# Follow all logs
docker compose logs -f

# Follow one service
docker compose logs -f backend

# Rebuild after dependency or Dockerfile changes
docker compose up --build -d

# Stop and remove containers/network
docker compose down

# Stop without removing containers
docker compose stop
```

Source changes are bind-mounted and each service has a reload watcher. The anonymous `/app/node_modules` and `/app/dist` volumes prevent host files from replacing container-managed dependencies and build output.

## Configuration reference

| Variable | Required | Used by | Notes |
|---|---:|---|---|
| `SUPABASE_URL` | Yes | backend, AI | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | backend, AI | Server-only secret; never expose to the browser |
| `SUPABASE_ANON_KEY` | No | backend | Optional in the current implementation |
| `SUPABASE_STORAGE_BUCKET` | No | backend | Defaults to `leadflow-media`; not currently forwarded by Compose |
| `JWT_SECRET` | Yes | backend | Signs access/refresh and media tokens |
| `JWT_EXPIRES_IN` | No | backend | Defaults to `7d`; not currently forwarded by Compose |
| `JWT_REFRESH_EXPIRES_IN` | No | backend | Defaults to `30d`; not currently forwarded by Compose |
| `OTP_EXPIRES_MINUTES` | No | backend | Defaults to `10`; not currently forwarded by Compose |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | No | backend | SMTP transport settings |
| `SMTP_USER`, `SMTP_PASS` | For real email | backend | Required to deliver OTP rather than log it in development |
| `EMAIL_FROM` | No | backend | Sender address |
| `ANTHROPIC_API_KEY` | For AI features | backend, AI | Claude API credential |
| `ANTHROPIC_MODEL` | No | AI | Defaults in code to `claude-sonnet-4-6` |
| `IMAGE_GPT_API_KEY` | For image generation | backend, AI | OpenAI image API credential |
| `OPENAI_IMAGE_MODEL` | No | backend, AI | Defaults to `gpt-image-1` |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Yes at startup | backend | TikTok Login Kit credentials |
| `TIKTOK_TOKEN_ENCRYPTION_KEY` | Yes at startup | backend | Exactly 64 hexadecimal characters |
| `TIKTOK_MEDIA_PUBLIC_BASE_URL` | Yes at startup | backend | Public HTTPS origin from which TikTok can fetch media |

To customize a default that Compose does not currently forward, add the variable to the relevant service's `environment` section in `docker-compose.yml`; placing it only in the root `.env` makes it available for interpolation but does not automatically inject it into a container.

## TikTok setup

The current Compose file fixes the callback URL to:

```text
http://localhost:5000/api/tiktok/callback
```

Register that exact URI in the TikTok developer console for local development. Publishing also requires the relevant TikTok Content Posting API access. `TIKTOK_MEDIA_PUBLIC_BASE_URL` cannot be `localhost`; TikTok's servers must be able to reach it over public HTTPS.

For a remote host, update `TIKTOK_REDIRECT_URI`, `FRONTEND_BASE_URL`, frontend API/socket URLs, and backend CORS origins in the Compose configuration before building and starting the stack.

## Troubleshooting

### Backend exits immediately

Inspect the logs:

```powershell
docker compose logs backend
```

Common causes are a missing required environment variable, an invalid Supabase service-role key, or the `roles` table not existing because migrations were not applied.

### Compose warns that a variable is not set

Add the named variable to the root `.env`. Compose substitutes an absent value with an empty string, and some SDKs treat an empty string differently from an unset variable.

### CORS or WebSocket failures

For the supplied local stack, use `http://localhost:5173`. A remote deployment must inject the actual frontend/backend origins and the frontend socket URL. The current Compose file is hard-coded for localhost in several places.

### OTP email is not received

Check `SMTP_USER`, `SMTP_PASS`, and the backend logs. Gmail accounts normally require an App Password when two-factor authentication is enabled. Without SMTP credentials in development, the application logs the OTP instead of emailing it.

### TikTok publishing cannot fetch media

Confirm that `TIKTOK_MEDIA_PUBLIC_BASE_URL` is a public HTTPS URL and that the media endpoint is reachable from outside the local network.

### Dependency changes are not reflected

Rebuild the affected image:

```powershell
docker compose build --no-cache backend
docker compose up -d backend
```

## Running checks without Compose

If Node.js and Python are installed on the host:

```powershell
cd backend
npm test
npm run typecheck

cd ..\frontend
npm test
npm run build

cd ..\ai-analyzer
pytest tests
```

## Known deployment gaps found in the code review

- Compose is configured for development rather than production.
- The current frontend production build fails type-checking in `AdminUserTable.tsx`: the create-user payload sends `fullName`, while its declared API type requires `full_name`. Fix this before creating a production frontend image.
- The root master SQL script is behind the migration directory; migrations through `030` are required.
- TikTok configuration is described by some older documentation as optional, but backend startup currently rejects missing TikTok credentials.
- Several useful overrides (`FRONTEND_URL`, `BACKEND_URL`, socket URLs, token lifetimes, storage bucket, and `NODE_ENV=production`) are not exposed as Compose substitutions.
- The Compose services have no health checks, `depends_on` conditions, or restart policies.
- The Dockerfiles install floating major/runtime dependencies (`node:25-alpine`, broad Python ranges, and `npm install`), which reduces reproducibility compared with pinned images and lockfile-based installs.
- No reverse proxy or TLS termination is included.

These are constraints of the current deployment files, not extra steps that Docker Compose performs automatically.

