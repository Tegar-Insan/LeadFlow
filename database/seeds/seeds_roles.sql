-- =============================================================================
-- LEADFLOW — seeds/seeds_roles.sql
-- Purpose   : Seed fixed role definitions
-- SRS Ref   : Section 2.1 — User Roles (Admin, Business Owner, Marketing Staff)
-- Run After : 001_Create_roles.sql
-- NOTE      : Fixed UUIDs used so other seed files can reference them safely
-- =============================================================================

INSERT INTO roles (id, name, description) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'System administrator. Full access: user management, account oversight, system configuration.'
),
(
    '00000000-0000-0000-0000-000000000002',
    'business_owner',
    'Krench Chicken owner. Access: weekly dashboard, performance monitoring, role management.'
),
(
    '00000000-0000-0000-0000-000000000003',
    'marketing_staff',
    'Krench Chicken marketing team. Access: AI content generation, calendar, media upload, interaction inbox.'
)
ON CONFLICT (name) DO NOTHING;