// backend/src/controllers/promptController.ts
// Thin controller delegating to models/Prompt.ts + models/ContentIdea.ts (MVC)
// SRS UC004 — read-side: list prompts + their generated ideas.

import type { Response } from 'express';
import * as Prompt from '../models/Prompt.ts';
import * as ContentIdea from '../models/ContentIdea.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

export async function listMyPrompts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  try {
    const prompts = await Prompt.listByUser(userId);
    success(res, { message: 'Prompts listed', data: { prompts }, statusCode: 200 });
  } catch (err) {
    logger.error('[promptController.listMyPrompts]', { err });
    error(res, { message: 'Failed to fetch prompts', statusCode: 500 });
  }
}

export async function getPromptDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { promptId } = req.params;

  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }
  if (!promptId) {
    error(res, { message: 'promptId required', statusCode: 400 });
    return;
  }

  const prompt = await Prompt.findById(promptId as string, userId);
  if (!prompt) {
    error(res, { message: 'Prompt not found', statusCode: 404 });
    return;
  }

  try {
    // NOTE: ideas_count on prompts is total-ever (soft-delete consequence).
    const ideas = await ContentIdea.listByPromptId(promptId as string);
    success(res, { message: 'Prompt detail', data: { prompt, ideas }, statusCode: 200 });
  } catch (err) {
    logger.error('[promptController.getPromptDetail] ideas fetch', { err });
    error(res, { message: 'Failed to fetch ideas for prompt', statusCode: 500 });
  }
}
