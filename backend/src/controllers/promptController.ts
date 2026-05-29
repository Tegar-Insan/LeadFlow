// backend/src/controllers/promptController.ts
// SRS UC004 — read-side: list prompts + their generated ideas.

import type { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

export async function listMyPrompts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  const { data, error: promptErr } = await supabase
    .from('prompts')
    .select('id, prompt_text, target_audience, content_theme, ideas_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (promptErr) {
    logger.error('[listMyPrompts]', { error: promptErr });
    error(res, { message: 'Failed to fetch prompts', statusCode: 500 });
    return;
  }

  success(res, { message: 'Prompts listed', data: { prompts: data ?? [] }, statusCode: 200 });
}

export async function getPromptDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { promptId } = req.params;

  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  const { data: prompt, error: promptLookupErr } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', promptId)
    .eq('user_id', userId)
    .maybeSingle();

  if (promptLookupErr || !prompt) {
    error(res, { message: 'Prompt not found', statusCode: 404 });
    return;
  }

  // NOTE: ideas_count on prompts is total-ever (soft-delete consequence).
  // For a pending-only count use this query instead:
  const { data: ideas, error: ideasErr } = await supabase
    .from('content_ideas')
    .select('id, content_title, status, created_at')
    .eq('prompt_id', promptId)
    .order('created_at', { ascending: true });

  if (ideasErr) {
    logger.error('[getPromptDetail] ideas fetch', { ideasErr });
    error(res, { message: 'Failed to fetch ideas for prompt', statusCode: 500 });
    return;
  }

  success(res, { message: 'Prompt detail', data: { prompt, ideas: ideas ?? [] }, statusCode: 200 });
}
