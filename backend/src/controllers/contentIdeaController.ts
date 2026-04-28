// backend/src/controllers/contentIdeaController.ts
// Session 9 — thin controller delegating to contentIdeaService.
// SRS: UC004 Input Prompt Idea, UC005 Generate Content Idea

import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.ts';
import {
  generateScheduleDraftsFromBrief,
  listPendingIdeasForUser,
} from '../services/contentIdeaService.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';

// POST /api/content/generate
// body: { brief: string }
export async function generate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  const { brief } = req.body as { brief?: string };
  if (typeof brief !== 'string' || brief.trim().length < 5) {
    error(res, { message: 'Brief is required (min 5 characters)', statusCode: 400 });
    return;
  }

  try {
    const drafts = await generateScheduleDraftsFromBrief(brief, userId);
    if (drafts.length === 0) {
      error(res, {
        message: 'AI generation returned no valid ideas. Please try a different brief.',
        statusCode: 502,
      });
      return;
    }
    success(res, { message: 'Ideas generated', data: { drafts }, statusCode: 200 });
  } catch (err) {
    logger.error('[contentIdeaController.generate]', { err });
    error(res, { message: err instanceof Error ? err.message : 'Generation failed', statusCode: 500 });
  }
}

// GET /api/content/pending
export async function listPending(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  try {
    const ideas = await listPendingIdeasForUser(userId);
    success(res, { message: 'Pending ideas listed', data: { ideas }, statusCode: 200 });
  } catch (err) {
    logger.error('[contentIdeaController.listPending]', { err });
    error(res, { message: 'Failed to fetch pending ideas', statusCode: 500 });
  }
}
