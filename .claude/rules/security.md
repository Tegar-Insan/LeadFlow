# Security — LeadFlow

## Authentication
- Registration MUST go through OTP email verification before any row lands in `users`. Use `pending_registrations` as the staging table with `role_name TEXT + CHECK constraint` — never an FK to `roles`.
- OTP delivery via Gmail SMTP using **App Password only**, never the account password
- Passwords stored as bcrypt hashes via `passwordHelper.js`. Plain text is a hard fail.
- JWT access + refresh issued via `jwtHelper.js`. Frontend stores token in localStorage.

## Authorization
- RBAC enforced on every protected route: `authMiddleware → roleMiddleware([...]) → controller`
- Three roles only: `admin`, `business_owner`, `marketing_staff`. Admin manages accounts; Business Owner sees dashboards; Marketing Staff handles content + interactions.
- Supabase RLS policies enabled on every table

## Secrets & Tokens
- All secrets in `.env`. `SUPABASE_SERVICE_ROLE_KEY` is mandatory — its absence returns 401 on every protected route.
- TikTok OAuth tokens stored **AES-256 encrypted** in `tiktok_accounts.token_ref`. Never log or return them.

## Network
- Express (5000) and FastAPI (8000) bind `127.0.0.1` only. Public traffic exclusively through nginx reverse proxy.

## Input & File Safety
- File uploads validated server-side: PNG/JPG/MP4/MOV only, ≤50MB hard ceiling
- All user input passes through validators before reaching controllers

## Hygiene
- `git config --global core.autocrlf false`. Fix any Windows-copied file with `sed -i 's/\r//' file`.
- Never commit `.env`. Always ship `.env.example`.