// backend/src/controllers/IdeaValidationController.ts
// Thin controller delegating to models/ContentIdea.ts (MVC: business logic lives in model)
// Implements UC006 Validate AI Content Ideas
// Stakeholder Decision D2: Reject = soft-delete (UPDATE status='rejected')

import type { Response } from 'express';
import * as ContentIdea from '../models/ContentIdea.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

// POST /api/content/:ideaId/approve
// Side-effect: migration 006 trigger auto-creates a draft in content_queue_schedules.
export async function approveIdea(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { ideaId } = req.params;

  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }
  if (!ideaId) {
    error(res, { message: 'ideaId required', statusCode: 400 });
    return;
  }

  try {
    const result = await ContentIdea.approveIdea(ideaId as string, userId);
    success(res, { message: 'Idea approved — draft added to calendar', data: result, statusCode: 200 });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;
    logger.error('[IdeaValidationController.approveIdea]', { err, ideaId });
    error(res, { message: err instanceof Error ? err.message : 'Approval failed', statusCode });
  }
}

// POST /api/content/:ideaId/reject
// body: { rejected_reason?: string | null }
// Soft-delete: row remains for audit trail.
export async function rejectIdea(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { ideaId } = req.params;
  const { rejected_reason } = (req.body ?? {}) as { rejected_reason?: string | null };

  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }
  if (!ideaId) {
    error(res, { message: 'ideaId required', statusCode: 400 });
    return;
  }

  try {
    const result = await ContentIdea.rejectIdea(ideaId as string, userId, rejected_reason);
    success(res, { message: 'Idea rejected', data: result, statusCode: 200 });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;
    logger.error('[IdeaValidationController.rejectIdea]', { err, ideaId });
    error(res, { message: err instanceof Error ? err.message : 'Rejection failed', statusCode });
  }
}
