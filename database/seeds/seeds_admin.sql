-- =============================================================================
-- LEADFLOW — seeds/seeds_admin.sql
-- Purpose   : Seed all users, profiles, TikTok account + sample data
-- SRS Ref   : Appendix B — Stakeholders: Dadang Hermawan, Almira Gantari Dafianti
-- Run After : seeds_roles.sql + all 12 migrations
-- PASSWORDS (DEV ONLY — change before production):
--   Admin          → LeadFlow@Admin2024!
--   Business Owner → KrenchOwner@2024!
--   Almira (Staff) → Marketing@Almira24!
--   Staff 2        → Marketing@Staff24!
-- =============================================================================

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
INSERT INTO users (id, role_id, email, password_hash, is_active, email_verified) VALUES
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',     -- admin
    'admin@leadflow.krench.id',
    crypt('LeadFlow@Admin2024!', gen_salt('bf', 12)),
    TRUE, TRUE
),
(
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',     -- business_owner
    'dadanghermawan@krenchchicken.id',
    crypt('KrenchOwner@2024!', gen_salt('bf', 12)),
    TRUE, TRUE
),
(
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',     -- marketing_staff (primary — Almira)
    'almira@krenchchicken.id',
    crypt('Marketing@Almira24!', gen_salt('bf', 12)),
    TRUE, TRUE
),
(
    'aaaaaaaa-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000003',     -- marketing_staff (secondary)
    'marketing2@krenchchicken.id',
    crypt('Marketing@Staff24!', gen_salt('bf', 12)),
    TRUE, TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- USER PROFILES
-- Trigger auto-creates shells on INSERT above — update with real names here
-- ---------------------------------------------------------------------------
UPDATE user_profiles SET full_name = 'LeadFlow Admin',            phone = NULL
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

UPDATE user_profiles SET full_name = 'Dadang Hermawan',           phone = '+6281532217552'
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';

UPDATE user_profiles SET full_name = 'Almira Gantari Dafianti',   phone = '+6281234567890'
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000003';

UPDATE user_profiles SET full_name = 'Marketing Staff 2',         phone = NULL
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000004';

-- ---------------------------------------------------------------------------
-- TIKTOK ACCOUNT
-- Placeholder — real encrypted tokens set after OAuth 2.0 flow in production
-- ---------------------------------------------------------------------------
INSERT INTO tiktok_accounts (
    id,
    owner_user_id,
    tiktok_open_id,
    tiktok_account_name,
    tiktok_display_name,
    access_token_encrypted,
    refresh_token_encrypted,
    token_scope,
    access_token_expires_at,
    refresh_token_expires_at,
    connection_status,
    preferred_music_type,
    tiktok_follower_count
) VALUES (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000002',     -- owned by Dadang (Business Owner)
    'TIKTOK_OPEN_ID_PLACEHOLDER',
    '@krenchchicken.id',
    'Krench Chicken 🍗',
    'ENCRYPTED_ACCESS_TOKEN_PLACEHOLDER',       -- replace via /api/tiktok/oauth/connect
    'ENCRYPTED_REFRESH_TOKEN_PLACEHOLDER',
    ARRAY['video.publish', 'video.list', 'comment.list', 'dm.list'],
    NOW() + INTERVAL '24 hours',
    NOW() + INTERVAL '365 days',
    'connected',
    'Indonesian pop trending',
    1250
) ON CONFLICT (tiktok_open_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE PROMPTS — realistic Krench Chicken marketing briefs
-- ---------------------------------------------------------------------------
INSERT INTO prompts (id, user_id, prompt_text, target_audience, content_theme) VALUES
(
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Create a TikTok content idea showcasing Krench Chicken crispy fried chicken. Focus on the crunchy texture and Indonesian spice flavors. Target young adults in Bogor who love street food.',
    'Young adults 18–30 in Bogor, West Java',
    'menu_showcase'
),
(
    'cccccccc-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Generate a behind-the-scenes TikTok idea showing how Krench Chicken prepares fresh fried chicken daily. Emphasize freshness and quality. Use trending audio.',
    'Food enthusiasts and foodies in Bogor',
    'behind_the_scenes'
),
(
    'cccccccc-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Create a promotional TikTok idea for Krench Chicken evening set deals. We sell remaining stock at discounted price after 7 PM. Drive urgency and FOMO.',
    'Budget-conscious young adults, workers leaving office after 5 PM',
    'promotion'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE CONTENT IDEAS — simulating GPT-4o output
-- ---------------------------------------------------------------------------
INSERT INTO content_ideas (
    id, prompt_id, created_by, idea_title, hook, caption, hashtags,
    suggested_music, estimated_duration, status, ai_model_used
) VALUES
(
    'dddddddd-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'The Crunch That Hits Different',
    'POV: You just heard the crunch from across the room 👂🍗',
    'Krench Chicken is NOT your average fried chicken. Our secret Indonesian spice blend makes every bite unforgettable. Come find us in Bogor! 📍',
    ARRAY['#KrenchChicken','#AyamKrispy','#BogorFood','#StreetFood','#FriedChicken'],
    'Trending Indonesian pop',
    30,
    'approved',
    'gpt-4o'
),
(
    'dddddddd-0000-0000-0000-000000000002',
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Rating Every Piece at Krench Chicken',
    'Which part is the BEST? We rate them all 🔥',
    'Breast? Wing? Upper thigh? Lower thigh? Which one is your favorite? Try them all at Krench Chicken Bogor! 🍗',
    ARRAY['#KrenchChicken','#ChickenReview','#BogorEats','#FoodTikTok'],
    'Upbeat trend sound',
    45,
    'pending_validation',
    'gpt-4o'
),
(
    'dddddddd-0000-0000-0000-000000000003',
    'cccccccc-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Day in the Life: Krench Chicken Kitchen',
    'We start at 6 AM so your chicken is PERFECT by lunch ⏰',
    'Fresh every single day. No shortcuts. This is how we make Krench Chicken the crispiest in Bogor! 🔥🍗',
    ARRAY['#BehindTheScenes','#KrenchChicken','#FoodProcess','#BogorCulinary'],
    'Lofi kitchen vibes',
    60,
    'rejected',
    'gpt-4o'
)
ON CONFLICT DO NOTHING;

-- Update validation metadata for approved and rejected ideas
UPDATE content_ideas SET
    validated_by = 'aaaaaaaa-0000-0000-0000-000000000003',
    validated_at = NOW() - INTERVAL '1 day'
WHERE id = 'dddddddd-0000-0000-0000-000000000001';

UPDATE content_ideas SET
    rejected_reason = 'Video production not ready yet. Will revisit next sprint.',
    validated_by    = 'aaaaaaaa-0000-0000-0000-000000000003',
    validated_at    = NOW() - INTERVAL '2 days'
WHERE id = 'dddddddd-0000-0000-0000-000000000003';

-- ---------------------------------------------------------------------------
-- SAMPLE CONTENT QUEUE SCHEDULE
-- The approved idea above auto-triggers a draft via trigger.
-- This seed covers environments where trigger runs on existing data.
-- ---------------------------------------------------------------------------
INSERT INTO content_queue_schedules (
    id, idea_id, tiktok_account_id, created_by,
    status, priority_order, scheduled_at, auto_publish,
    custom_music_title
) VALUES (
    'eeeeeeee-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'scheduled',
    1,
    -- 2 days from now at 19:00 WIB (stored as UTC = 12:00 UTC)
    (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Jakarta') + INTERVAL '2 days' + INTERVAL '19 hours')
        AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'UTC',
    TRUE,
    'Trending Indonesian Pop - 2025'
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE INTERACTION MESSAGES — simulating TikTok API fetch (UC010)
-- Covers all 5 intent categories for AI classification testing
-- ---------------------------------------------------------------------------
INSERT INTO interaction_messages (
    id, tiktok_account_id, tiktok_message_id, tiktok_user_handle,
    channel_type, message_text, classification_status, message_created_at
) VALUES
(
    'ffffffff-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'TT_MSG_001', '@ayam_lover_bogor',
    'comment', 'Dimana lokasi Krench Chicken? Mau order sekarang! 🍗',
    'classified', NOW() - INTERVAL '1 hour'
),
(
    'ffffffff-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'TT_MSG_002', '@foodie_bogor99',
    'comment', 'Harga untuk 1 ekor berapa ya? Ada paket keluarga gak?',
    'classified', NOW() - INTERVAL '3 hours'
),
(
    'ffffffff-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'TT_MSG_003', '@kritikus_makanan',
    'dm', 'Kemarin pesan, ayamnya kurang crispy. Tolong diperbaiki ya.',
    'classified', NOW() - INTERVAL '5 hours'
),
(
    'ffffffff-0000-0000-0000-000000000004',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'TT_MSG_004', '@bogor_eats',
    'comment', 'Enak banget! Krench Chicken terbaik di Bogor 🔥🍗',
    'classified', NOW() - INTERVAL '6 hours'
),
(
    'ffffffff-0000-0000-0000-000000000005',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'TT_MSG_005', '@spam_acc_xyz',
    'comment', 'Follow me for free followers! Click link in bio!',
    'classified', NOW() - INTERVAL '8 hours'
)
ON CONFLICT (tiktok_message_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE AI CLASSIFICATIONS — simulating Python FastAPI output (UC011)
-- ---------------------------------------------------------------------------
INSERT INTO interaction_classifications (
    interaction_id, sentiment_type, priority_level,
    confidence_score, suggested_reply, classified_by_ai
) VALUES
(
    'ffffffff-0000-0000-0000-000000000001',
    'lead_to_sales', 'high', 0.952,
    'Halo kak! Krench Chicken ada di Jl. [Alamat Lengkap], Bogor. Buka jam 10 pagi - 9 malam. Yuk mampir sekarang! 🍗',
    TRUE
),
(
    'ffffffff-0000-0000-0000-000000000002',
    'question', 'medium', 0.881,
    'Halo kak! Harga per potong mulai dari Rp 12.000. Ada paket hemat 5 potong + nasi lho! Mau tau lebih? DM ya 😊',
    TRUE
),
(
    'ffffffff-0000-0000-0000-000000000003',
    'complaint', 'high', 0.934,
    'Halo kak, mohon maaf atas pengalaman yang kurang memuaskan. Kami akan perbaiki. Boleh cerita lebih detail? Kami ingin kompensasi untuk kakak 🙏',
    TRUE
),
(
    'ffffffff-0000-0000-0000-000000000004',
    'praise', 'low', 0.967,
    'Makasih banyak kak! Support dari kakak bikin kami semangat masak 🍗❤️ Sampai ketemu lagi ya!',
    TRUE
),
(
    'ffffffff-0000-0000-0000-000000000005',
    'spam', 'low', 0.991,
    NULL,
    TRUE
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE WEEKLY DASHBOARD REPORTS — Business Owner view data (UC013)
-- STD TC013_01 this_week, TC013_02 filter: last_week, two_weeks_ago
-- ---------------------------------------------------------------------------
INSERT INTO weekly_dashboard_reports (
    tiktok_account_id, week_start, week_end,
    total_posts_published, total_posts_scheduled, total_posts_failed,
    posting_consistency_pct,
    total_views, total_likes, total_comments, total_shares, total_saves,
    follower_count_start, follower_count_end,
    total_interactions, total_dms, total_comments_received, total_responses_sent,
    response_rate_pct,
    leads_count, complaints_count, questions_count, praise_count, spam_count
) VALUES
-- This week
(
    'bbbbbbbb-0000-0000-0000-000000000001',
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta')::DATE,
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') + INTERVAL '6 days')::DATE,
    3, 4, 1, 75.00,
    4500, 320, 87, 45, 23,
    1210, 1250,
    92, 12, 80, 47, 51.09,
    18, 7, 35, 22, 10
),
-- Last week
(
    'bbbbbbbb-0000-0000-0000-000000000001',
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '7 days')::DATE,
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '1 day')::DATE,
    2, 4, 2, 50.00,
    2100, 180, 42, 21, 9,
    1175, 1210,
    63, 8, 55, 29, 46.03,
    10, 5, 28, 12, 8
),
-- Two weeks ago
(
    'bbbbbbbb-0000-0000-0000-000000000001',
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '14 days')::DATE,
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '8 days')::DATE,
    4, 5, 1, 80.00,
    6200, 510, 134, 78, 41,
    1140, 1175,
    148, 19, 129, 98, 66.22,
    28, 9, 62, 38, 11
)
ON CONFLICT (tiktok_account_id, week_start) DO NOTHING;