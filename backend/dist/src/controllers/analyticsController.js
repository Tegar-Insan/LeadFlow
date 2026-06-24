/**
 * analyticsController.ts
 * Analytics endpoints for Business Owner Dashboard
 * LeadFlow — Krench Chicken
 */
import * as analyticsService from "../services/analyticsService.js";
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
/**
 * GET /api/analytics/owner-summary
 * Returns analytics metrics for the authenticated business owner
 */
export const getOwnerSummary = async (req, res) => {
    try {
        const authReq = req;
        const userId = authReq.user.userId;
        if (!userId) {
            error(res, { message: 'User not authenticated', statusCode: 401 });
            return;
        }
        const summary = await analyticsService.getOwnerAnalyticsSummary();
        success(res, { message: 'Analytics summary loaded', data: { analytics: summary } });
    }
    catch (err) {
        logger.error('[analyticsController.getOwnerSummary]', err);
        error(res, { message: 'Failed to load analytics', statusCode: 500 });
    }
};
//# sourceMappingURL=analyticsController.js.map