/**
 * analyticsService.ts
 * Analytics metrics for Business Owner Dashboard
 * LeadFlow — Krench Chicken
 */
import { supabaseAdmin } from "../config/supabase.js";
import { nowJakarta } from "../utils/jakartaTime.js";
import * as Role from "../models/Role.js";
import logger from "../utils/logger.js";
/**
 * Connected TikTok account ids for the org. Krench Chicken runs a single
 * account today, but this stays array-shaped to support more later.
 */
const getConnectedTiktokAccountIds = async () => {
    const { data, error: err } = await supabaseAdmin
        .from('tiktok_accounts')
        .select('id')
        .eq('connection_status', 'connected');
    if (err) {
        logger.error('[analyticsService.getConnectedTiktokAccountIds]', err);
        throw err;
    }
    return (data || []).map((row) => row.id);
};
/**
 * Content creator leaderboard — marketing staff ranked by total
 * content_queue_schedules rows they've created, any status, all time.
 */
const getContentCreatorLeaderboard = async (limit) => {
    const marketingRole = await Role.findByName('marketing_staff');
    if (!marketingRole)
        return [];
    const { data: staffRows, error: staffError } = await supabaseAdmin
        .from('users')
        .select('id, user_profiles(full_name)')
        .eq('role_id', marketingRole['id']);
    if (staffError) {
        logger.error('[analyticsService.getContentCreatorLeaderboard] Staff query failed:', staffError);
        throw staffError;
    }
    const staff = (staffRows || []).map((row) => ({
        userId: row['id'],
        fullName: row['user_profiles']?.full_name || 'Unknown',
    }));
    if (staff.length === 0)
        return [];
    const { data: contentRows, error: contentError } = await supabaseAdmin
        .from('content_queue_schedules')
        .select('created_by')
        .in('created_by', staff.map((s) => s.userId));
    if (contentError) {
        logger.error('[analyticsService.getContentCreatorLeaderboard] Content count query failed:', contentError);
        throw contentError;
    }
    const counts = new Map();
    for (const row of contentRows || []) {
        const creatorId = row.created_by;
        counts.set(creatorId, (counts.get(creatorId) || 0) + 1);
    }
    return staff
        .map((s) => ({ userId: s.userId, fullName: s.fullName, contentCount: counts.get(s.userId) || 0 }))
        .sort((a, b) => b.contentCount - a.contentCount)
        .slice(0, limit);
};
/**
 * Get analytics summary for the Business Owner dashboard.
 * Scoped to the org's connected TikTok account(s), not the caller's user id —
 * content_queue_schedules.created_by is the marketing staff member who built
 * the row, never the business owner, so filtering by the caller's id always
 * returned zero. tiktok_account_id is also not populated at draft/schedule
 * time today, so rows with a NULL account are still included in scope.
 */
export const getOwnerAnalyticsSummary = async () => {
    try {
        const accountIds = await getConnectedTiktokAccountIds();
        const baseQuery = () => supabaseAdmin.from('content_queue_schedules').select('*', { count: 'exact', head: true });
        const scoped = (query) => accountIds.length > 0
            ? query.or(`tiktok_account_id.in.(${accountIds.join(',')}),tiktok_account_id.is.null`)
            : query;
        const runCount = async (query) => {
            const { count, error: err } = await query;
            if (err) {
                logger.error('[analyticsService.getOwnerAnalyticsSummary] Count query failed:', err);
                throw err;
            }
            return count || 0;
        };
        const now = nowJakarta();
        const currentMonthStart = now.startOf('month');
        const nextMonthStart = currentMonthStart.add(1, 'month');
        const lastMonthStart = currentMonthStart.subtract(1, 'month');
        const [totalPublishedContent, tiktokPublishedCount, totalScheduledContent, totalDraftContent, currentMonthContent, lastMonthContent, leaderboard,] = await Promise.all([
            runCount(scoped(baseQuery()).eq('status', 'published')),
            runCount(scoped(baseQuery()).eq('status', 'published').eq('platform', 'tiktok')),
            runCount(scoped(baseQuery()).eq('status', 'scheduled')),
            runCount(scoped(baseQuery()).eq('status', 'draft')),
            runCount(scoped(baseQuery())
                .gte('created_at', currentMonthStart.toISOString())
                .lt('created_at', nextMonthStart.toISOString())),
            runCount(scoped(baseQuery())
                .gte('created_at', lastMonthStart.toISOString())
                .lt('created_at', currentMonthStart.toISOString())),
            getContentCreatorLeaderboard(5),
        ]);
        const monthOverMonthDeltaPct = lastMonthContent === 0
            ? currentMonthContent === 0 ? 0 : null
            : Math.round(((currentMonthContent - lastMonthContent) / lastMonthContent) * 100);
        return {
            totalPublishedContent,
            tiktokPublishedCount,
            totalScheduledContent,
            totalDraftContent,
            currentMonthContent,
            lastMonthContent,
            monthOverMonthDeltaPct,
            leaderboard,
        };
    }
    catch (err) {
        logger.error('[analyticsService.getOwnerAnalyticsSummary] Error:', err);
        throw err;
    }
};
//# sourceMappingURL=analyticsService.js.map