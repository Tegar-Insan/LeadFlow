/**
 * analyticsController.ts
 * Analytics endpoints for Business Owner Dashboard
 * LeadFlow — Krench Chicken
 */

// @ts-nocheck
import type { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

/**
 * GET /api/analytics/owner-summary
 * Returns analytics metrics for the authenticated business owner
 */
export const getOwnerSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;

    if (!userId) {
      error(res, { message: 'User not authenticated', statusCode: 401 });
      return;
    }

    const summary = await analyticsService.getOwnerAnalyticsSummary(userId);
    success(res, { message: 'Analytics summary loaded', data: { analytics: summary } });
  } catch (err) {
    logger.error('[analyticsController.getOwnerSummary]', err);
    error(res, { message: 'Failed to load analytics', statusCode: 500 });
  }
};
