/**
 * analyticsService.ts
 * Analytics metrics for Business Owner Dashboard
 * LeadFlow — Krench Chicken
 */
import { supabaseAdmin } from "../config/supabase.js";
import logger from "../utils/logger.js";
/**
 * Get analytics summary for the authenticated business owner
 * Counts all published content (all time)
 */
export const getOwnerAnalyticsSummary = async (userId) => {
    try {
        // Query 1: Total published content (all status='published')
        const { count: publishedCount, error: publishedError } = await supabaseAdmin
            .from('content_queue_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('status', 'published');
        if (publishedError) {
            logger.error('[analyticsService.getOwnerAnalyticsSummary] Published count query failed:', publishedError);
            throw publishedError;
        }
        // Query 2: TikTok published content (status='published' AND platform='tiktok')
        const { count: tiktokCount, error: tiktokError } = await supabaseAdmin
            .from('content_queue_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('status', 'published')
            .eq('platform', 'tiktok');
        if (tiktokError) {
            logger.error('[analyticsService.getOwnerAnalyticsSummary] TikTok count query failed:', tiktokError);
            throw tiktokError;
        }
        // Query 3: Scheduled content
        const { count: scheduledCount, error: scheduledError } = await supabaseAdmin
            .from('content_queue_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('status', 'scheduled');
        if (scheduledError) {
            logger.error('[analyticsService.getOwnerAnalyticsSummary] Scheduled count query failed:', scheduledError);
            throw scheduledError;
        }
        // Query 4: Draft content
        const { count: draftCount, error: draftError } = await supabaseAdmin
            .from('content_queue_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('status', 'draft');
        if (draftError) {
            logger.error('[analyticsService.getOwnerAnalyticsSummary] Draft count query failed:', draftError);
            throw draftError;
        }
        return {
            totalPublishedContent: publishedCount || 0,
            tiktokPublishedCount: tiktokCount || 0,
            totalScheduledContent: scheduledCount || 0,
            totalDraftContent: draftCount || 0,
        };
    }
    catch (err) {
        logger.error('[analyticsService.getOwnerAnalyticsSummary] Error:', err);
        throw err;
    }
};
//# sourceMappingURL=analyticsService.js.map