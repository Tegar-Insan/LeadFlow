# Database Rules — LeadFlow

## Stack
PostgreSQL via Supabase (v18.x / supabase-js v2.90.1). Session Pooler: port 6543, host `aws-0-ap-southeast-1.pooler.supabase.com`. `SUPABASE_SERVICE_ROLE_KEY` required in `.env` or all protected routes return 401.

## Migrations
Located at `database/migrations/`. Run **001 → 012 in order**, no forward references. Plural table names. UUID primary keys. RLS enabled on all tables.

## Tables (exact column names — match verbatim)
- `roles(id, name)` — values: `admin`, `business_owner`, `marketing_staff`
- `users(id, role_id, email, password_hash, created_at)` — never `password`, never `roleid`
- `user_profiles(id, user_id, full_name, phone, email)`
- `pending_registrations(id, role_name TEXT CHECK, email, otp_code, expires_at)` — **NO FK to roles, ever** (temporary table)
- `prompts(id, user_id, prompt_text, created_at)`
- `content_ideas(id, prompt_id, idea_title, hook, caption, hashtags, status, created_at)` — status: `pending_validation|approved|rejected`
- `content_queue_schedules(id, idea_id, created_by, priority_order, content_status, scheduled_at TIMESTAMPTZ, auto_publish, hashtag_type, caption_type, music_type, tiktok_account_id, created_at)` — content_status: `draft|scheduled|uploaded|published|failed`
- `content_assets(id, queue_schedule_id, content_type, file_name, file_size, uploaded_at)` — content_type: `poster_photo|short_video`; file_size max 50MB (bytes)
- `publish_status_logs(id, queue_calendar_id, status_code, status_message, created_at)`
- `tiktok_accounts(id, tiktok_id, tiktok_name, token_ref, music_type, connected_at)` — tokens AES-256 encrypted
- `interaction_messages(id, tiktok_account_id, interaction_type_id, type_name, message_text, channel_type, amount_message_sent, send_message_status, created_at)` — channel_type: `comment|dm`
- `classify_type_messages(id, sentiment_type_name, priority_level)` — priority: `high|medium|low`
- `weekly_dashboard_reports(id, tiktok_account_id, queue_calendar_id, week_start, week_end, total_posts, total_interactions, created_at)`

## Rules
- Store all timestamps **UTC**; convert to WIB only on display via `jakartaTime.js`
- Server timezone stays UTC — never set Ubuntu to Asia/Jakarta
- Bcrypt password hashes only — never plain text
- Seeds: `seed_roles.sql`, `seed_admin.sql`