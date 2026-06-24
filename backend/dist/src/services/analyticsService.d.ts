/**
 * analyticsService.ts
 * Analytics metrics for Business Owner Dashboard
 * LeadFlow — Krench Chicken
 */
export interface LeaderboardEntry {
    userId: string;
    fullName: string;
    contentCount: number;
}
export interface OwnerAnalyticsSummary {
    totalPublishedContent: number;
    tiktokPublishedCount: number;
    totalScheduledContent: number;
    totalDraftContent: number;
    currentMonthContent: number;
    lastMonthContent: number;
    monthOverMonthDeltaPct: number | null;
    leaderboard: LeaderboardEntry[];
}
/**
 * Get analytics summary for the Business Owner dashboard.
 * Scoped to the org's connected TikTok account(s), not the caller's user id —
 * content_queue_schedules.created_by is the marketing staff member who built
 * the row, never the business owner, so filtering by the caller's id always
 * returned zero. tiktok_account_id is also not populated at draft/schedule
 * time today, so rows with a NULL account are still included in scope.
 */
export declare const getOwnerAnalyticsSummary: () => Promise<OwnerAnalyticsSummary>;
//# sourceMappingURL=analyticsService.d.ts.map