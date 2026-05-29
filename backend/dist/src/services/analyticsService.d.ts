/**
 * analyticsService.ts
 * Analytics metrics for Business Owner Dashboard
 * LeadFlow — Krench Chicken
 */
export interface OwnerAnalyticsSummary {
    totalPublishedContent: number;
    tiktokPublishedCount: number;
    totalScheduledContent: number;
    totalDraftContent: number;
}
/**
 * Get analytics summary for the authenticated business owner
 * Counts all published content (all time)
 */
export declare const getOwnerAnalyticsSummary: (userId: string) => Promise<OwnerAnalyticsSummary>;
//# sourceMappingURL=analyticsService.d.ts.map