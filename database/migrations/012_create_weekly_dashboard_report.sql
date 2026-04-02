-- =============================================================================
-- LEADFLOW — 012_create_weekly_dashboard_reports.sql
-- Increment : 5 — AI Classifier & Interaction Management
-- Contains  : weekly_dashboard_reports table + dashboard views + RLS
-- SRS Ref   : UC013 View Weekly Dashboard
-- SDS Ref   : Section 5.4 — WeeklyDashboardReport class
--             Section 5.5 — Entity: WeeklyDashboardReport — Data Dict
--             Section 5.8 — SD017 Filter Week, SD018 View Dashboard
--             Section 6   — UI: Weekly Dashboard Performance Page
-- STD Ref   : TC013_01 View Performance Metric, TC013_02 Filter Performance
-- Depends   : 001–011 migrations (final migration — all tables exist)
-- SCHEDULE  : Populated by Node.js cron job every Monday 00:00 WIB
--             Can also be manually triggered via admin API endpoint
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: weekly_dashboard_reports
-- Aggregated weekly TikTok performance for Business Owner dashboard.
-- One row per TikTok account per week (UNIQUE constraint).
-- Populated automatically by a scheduled Node.js job.
-- SDS Entity: WeeklyDashboardReport
-- Attributes: reportId, tiktokAccountId, queueCalendarId,
--             weekStart, weekEnd, totalPosts, totalInteractions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_dashboard_reports (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tiktok_account_id           UUID        NOT NULL REFERENCES tiktok_accounts(id) ON DELETE CASCADE,

    -- Report period (WIB dates stored as DATE)
    -- Stored as WIB calendar dates intentionally — business weeks in Jakarta time
    week_start                  DATE        NOT NULL,   -- Monday (WIB)
    week_end                    DATE        NOT NULL,   -- Sunday (WIB)

    -- Content performance (UC013 dashboard metrics)
    total_posts_published       INT         NOT NULL DEFAULT 0,
    total_posts_scheduled       INT         NOT NULL DEFAULT 0,
    total_posts_failed          INT         NOT NULL DEFAULT 0,
    posting_consistency_pct     NUMERIC(5,2),           -- (published / scheduled) * 100

    -- TikTok engagement (fetched from TikTok Analytics API)
    total_views                 BIGINT      NOT NULL DEFAULT 0,
    total_likes                 BIGINT      NOT NULL DEFAULT 0,
    total_comments              BIGINT      NOT NULL DEFAULT 0,
    total_shares                BIGINT      NOT NULL DEFAULT 0,
    total_saves                 BIGINT      NOT NULL DEFAULT 0,
    follower_count_start        INT         NOT NULL DEFAULT 0,
    follower_count_end          INT         NOT NULL DEFAULT 0,
    -- Computed column: no manual input needed
    follower_growth             INT         GENERATED ALWAYS AS (follower_count_end - follower_count_start) STORED,

    -- Interaction metrics (UC013)
    total_interactions          INT         NOT NULL DEFAULT 0,   -- comments + DMs combined
    total_dms                   INT         NOT NULL DEFAULT 0,
    total_comments_received     INT         NOT NULL DEFAULT 0,
    total_responses_sent        INT         NOT NULL DEFAULT 0,
    response_rate_pct           NUMERIC(5,2),           -- (responses_sent / total_interactions) * 100

    -- Intent breakdown (from AI classifier aggregation)
    leads_count                 INT         NOT NULL DEFAULT 0,
    complaints_count            INT         NOT NULL DEFAULT 0,
    questions_count             INT         NOT NULL DEFAULT 0,
    praise_count                INT         NOT NULL DEFAULT 0,
    spam_count                  INT         NOT NULL DEFAULT 0,

    -- Report metadata
    generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_source                 VARCHAR(20) NOT NULL DEFAULT 'auto',    -- 'auto' | 'manual_recalc'

    -- One report per account per week
    CONSTRAINT uq_weekly_report UNIQUE (tiktok_account_id, week_start)
);

COMMENT ON TABLE  weekly_dashboard_reports              IS 'Weekly TikTok performance snapshot for Business Owner. One row per account per week.';
COMMENT ON COLUMN weekly_dashboard_reports.week_start   IS 'Monday of the WIB week. Business Owner filters: this_week | last_week | two_weeks_ago.';
COMMENT ON COLUMN weekly_dashboard_reports.follower_growth IS 'Computed column (follower_count_end - follower_count_start). Auto-maintained by PostgreSQL.';
COMMENT ON COLUMN weekly_dashboard_reports.posting_consistency_pct IS 'KPI: published/scheduled * 100. Target ≥ 80% for Krench Chicken.';
COMMENT ON COLUMN weekly_dashboard_reports.response_rate_pct IS 'KPI: responses_sent/total_interactions * 100. Tracks engagement responsiveness.';

CREATE INDEX idx_wdr_account    ON weekly_dashboard_reports (tiktok_account_id);
CREATE INDEX idx_wdr_week_start ON weekly_dashboard_reports (week_start DESC);

-- ---------------------------------------------------------------------------
-- VIEW: v_weekly_dashboard_current
-- Business Owner dashboard: this_week | last_week | two_weeks_ago (UC013 NF5)
-- Frontend filters by week_label column.
-- All date comparisons use Asia/Jakarta timezone per display rule.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_weekly_dashboard_current AS
SELECT
    wdr.id                                      AS report_id,
    wdr.tiktok_account_id,
    wdr.week_start,
    wdr.week_end,
    wdr.total_posts_published,
    wdr.total_posts_scheduled,
    wdr.total_posts_failed,
    wdr.posting_consistency_pct,
    wdr.total_views,
    wdr.total_likes,
    wdr.total_comments,
    wdr.total_shares,
    wdr.total_saves,
    wdr.follower_count_start,
    wdr.follower_count_end,
    wdr.follower_growth,
    wdr.total_interactions,
    wdr.total_dms,
    wdr.total_comments_received,
    wdr.total_responses_sent,
    wdr.response_rate_pct,
    wdr.leads_count,
    wdr.complaints_count,
    wdr.questions_count,
    wdr.praise_count,
    wdr.spam_count,
    to_wib(wdr.generated_at)                    AS generated_at_wib,

    -- Week label for frontend filter (UC013 NF5)
    CASE
        WHEN wdr.week_start = DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta')::DATE
            THEN 'this_week'
        WHEN wdr.week_start = (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '7 days')::DATE
            THEN 'last_week'
        WHEN wdr.week_start = (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '14 days')::DATE
            THEN 'two_weeks_ago'
        ELSE 'older'
    END                                         AS week_label,

    -- TikTok account info
    ta.tiktok_account_name,
    ta.tiktok_display_name,
    ta.tiktok_avatar_url,
    ta.tiktok_follower_count                    AS current_followers

FROM weekly_dashboard_reports wdr
JOIN tiktok_accounts ta ON ta.id = wdr.tiktok_account_id
WHERE wdr.week_start >= (
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '14 days'
)::DATE
ORDER BY wdr.week_start DESC;

COMMENT ON VIEW v_weekly_dashboard_current IS 'Business Owner dashboard: 3-week view. Filter by week_label (this_week|last_week|two_weeks_ago). WIB dates.';

-- ---------------------------------------------------------------------------
-- VIEW: v_weekly_dashboard_summary
-- High-level KPI summary for Business Owner top of dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_weekly_dashboard_summary AS
SELECT
    ta.tiktok_account_name,
    ta.tiktok_display_name,

    -- This week vs last week deltas
    current_week.total_posts_published              AS this_week_posts,
    last_week.total_posts_published                 AS last_week_posts,
    (current_week.total_posts_published - COALESCE(last_week.total_posts_published, 0))
                                                    AS posts_delta,

    current_week.total_interactions                 AS this_week_interactions,
    last_week.total_interactions                    AS last_week_interactions,

    current_week.follower_growth                    AS this_week_follower_growth,
    current_week.posting_consistency_pct            AS consistency_pct,
    current_week.response_rate_pct,
    current_week.leads_count                        AS this_week_leads

FROM tiktok_accounts ta
LEFT JOIN weekly_dashboard_reports current_week ON
    current_week.tiktok_account_id = ta.id
    AND current_week.week_start = DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta')::DATE
LEFT JOIN weekly_dashboard_reports last_week ON
    last_week.tiktok_account_id = ta.id
    AND last_week.week_start = (DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '7 days')::DATE;

COMMENT ON VIEW v_weekly_dashboard_summary IS 'KPI summary cards with week-over-week deltas. Business Owner top-of-dashboard.';

-- ---------------------------------------------------------------------------
-- RLS: weekly_dashboard_reports
-- Business Owner: full SELECT (this is their primary feature)
-- Admin: full access (can manually recalculate)
-- Marketing Staff: intentionally NO access (SDS UC013 — Business Owner only)
-- ---------------------------------------------------------------------------
ALTER TABLE weekly_dashboard_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_wdr_admin_all ON weekly_dashboard_reports
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_wdr_owner_read ON weekly_dashboard_reports
    FOR SELECT USING (get_caller_role() = 'business_owner');

-- Marketing Staff has NO policy → blocked by RLS (SDS design intent).