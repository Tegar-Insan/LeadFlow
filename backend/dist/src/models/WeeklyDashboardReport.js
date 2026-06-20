// src/models/WeeklyDashboardReport.ts
// Business logic moved from services/dashboardCalendarService.ts (MVC refactor)
// UC013 View Weekly Dashboard — Business Owner read-only calendar.
// Filters to published/scheduled/uploaded at the DB level — drafts are never exposed.
import { supabaseAdmin } from "../config/supabase.js";
const OWNER_VISIBLE_STATUSES = ['published', 'scheduled', 'uploaded'];
async function profileMap(userIds) {
    if (!userIds.length)
        return {};
    const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
    return Object.fromEntries((data ?? []).map((p) => [
        p.user_id,
        p.full_name,
    ]));
}
export const getOwnerCalendar = async (year, month) => {
    // Shift month window by −7h so WIB month maps to the correct UTC range
    const startUTC = new Date(Date.UTC(year, month - 1, 1) - 7 * 3_600_000);
    const endUTC = new Date(Date.UTC(year, month, 1) - 7 * 3_600_000);
    const { data: schedules, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select(`
      *,
      content_assets(id, content_type, file_url, mime_type),
      content_ideas(content_title, tiktok_caption, hashtag)
    `)
        .gte('scheduled_at', startUTC.toISOString())
        .lt('scheduled_at', endUTC.toISOString())
        .in('status', OWNER_VISIBLE_STATUSES)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('priority_order', { ascending: false });
    if (error)
        throw error;
    const rows = (schedules ?? []);
    const profiles = await profileMap([...new Set(rows.map((s) => s.created_by).filter(Boolean))]);
    return rows.map((s) => {
        const assets = s.content_assets ?? [];
        const idea = s.content_ideas ?? {};
        const { content_assets, content_ideas, ...rest } = s;
        void content_assets;
        void content_ideas;
        return {
            ...rest,
            ...idea,
            created_by_name: profiles[s.created_by] ?? null,
            primary_asset_id: assets[0]?.['id'] ?? null,
            primary_asset_type: assets[0]?.['content_type'] ?? null,
            primary_asset_url: assets[0]?.['file_url'] ?? null,
            primary_asset_mime: assets[0]?.['mime_type'] ?? null,
        };
    });
};
//# sourceMappingURL=WeeklyDashboardReport.js.map