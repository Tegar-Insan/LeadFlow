# Backend Implementation — LeadFlow
Stack: Node.js v25.2.1 (nvm only, never apt) + Express.js, strict MVC. Port 5000, bind 127.0.0.1, nginx proxy in production, pm2 process manager.

## Folder
`backend/src/{controllers,services,models,routes,middlewares,utils,validators,jobs}`

## Mandatory Helpers
- ALWAYS use `utils/responseHelper.js`: `success(res,{message,data,statusCode})` / `error(res,{message,statusCode})`. NEVER raw `res.json()`.
- JWT via `utils/jwtHelper.js`: `signAccessToken, signRefreshToken, verifyAccessToken, decodeToken`
- Password via `utils/passwordHelper.js`: `hashPassword, comparePassword` (bcrypt only — no plain text ever)
- Time via `utils/jakartaTime.js`: `nowJakarta, jakartaToUTC, isScheduleTimeReached`. Store UTC, display WIB (GMT+7). Never bypass this helper.

## Routing
- Routes MUST be mounted in `app.js` BEFORE the 404 catch-all or they're dead
- RBAC pattern on every protected route: `router.get('/x', authMiddleware, roleMiddleware(['admin']), controller)`
- Three roles: `admin`, `business_owner`, `marketing_staff`

## Required Functionality
- Registration with OTP email verification → write to `pending_registrations` first → on verify migrate to `users` + `user_profiles`
- Login validates bcrypt hash → returns JWT; logout clears token
- Admin user CRUD with name/email search
- Prompt input persisted to `prompts`
- GPT-4o generates exactly 3 content ideas → saved to `content_ideas` with status `pending_validation`
- Approve action auto-creates a draft row in `content_queue_schedules`; reject discards
- Calendar CRUD + drag-drop reordering + day/week/month filter
- Cron job in `jobs/` polls `scheduled_at` via `isScheduleTimeReached` and triggers TikTok auto-publish
- Media upload accepts PNG/JPG (photo) and MP4/MOV (video), enforces ≤50MB server-side
- Publish results written to `publish_status_logs` + push notification
- Periodic fetch of TikTok DMs and comments → `interaction_messages` with status `unclassified`
- Backend forwards unclassified rows to FastAPI `/analyze`, persists result, flips status to `classified`
- Inbox supports view, reply (push to TikTok), delete
- Weekly dashboard aggregates posts, interactions, response rate, engagement (current / last week / two weeks ago)

## Discipline
- Secrets in `.env` only — never hardcode
- Tegar prefers complete file replacements over diffs
- Run codebase grep before renaming any export or column