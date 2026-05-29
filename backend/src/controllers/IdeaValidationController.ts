// backend/src/controllers/IdeaValidationController.ts
// Session 9 rewrite — implements UC006 Validate AI Content Ideas
// Stakeholder Decision D2: Reject = soft-delete (UPDATE status='rejected')

import type { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase.ts';
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

  // UPDATE guarded by status='pending_validation' — prevents double-approve race
  const { data, error: approvalErr } = await supabase
    .from('content_ideas')
    .update({
      status: 'approved',
      validated_by: userId,
      validated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)
    .eq('status', 'pending_validation')
    .select('id')
    .maybeSingle();

  if (approvalErr) {
    logger.error('[approveIdea] supabase error', { error: approvalErr, ideaId });
    error(res, { message: 'Approval failed', statusCode: 500 });
    return;
  }

  if (!data) {
    // Row not updated → either not found or already approved/rejected
    error(res, { message: 'Idea not in pending_validation state', statusCode: 409 });
    return;
  }

  // Fetch the draft schedule + idea metadata that the DB trigger just created
  const { data: draft, error: draftErr } = await supabase
    .from('content_queue_schedules')
    .select(`
      id,
      status,
      created_at,
      custom_caption,
      custom_hashtags,
      content_ideas (
        content_title,
        tiktok_caption,
        hashtag,
        category,
        estimated_engagement,
        suggested_music,
        estimated_duration,
        best_time_to_post_wib
      )
    `)
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftErr) {
    logger.warn('[approveIdea] could not fetch trigger-created draft', { draftErr, ideaId });
  }

  const idea = (draft as any)?.content_ideas ?? {};

  success(res, {
    message: 'Idea approved — draft added to calendar',
    data: {
      idea_id: ideaId,
      schedule_id: draft?.id ?? null,
      schedule_status: draft?.status ?? null,
      // Full metadata so frontend can populate Content Library without a second fetch
      content_title:        idea.content_title        ?? null,
      tiktok_caption:       idea.tiktok_caption       ?? draft?.custom_caption ?? null,
      hashtag:              idea.hashtag              ?? draft?.custom_hashtags ?? [],
      category:             idea.category             ?? null,
      estimated_engagement: idea.estimated_engagement ?? null,
      suggested_music:      idea.suggested_music      ?? null,
      estimated_duration:   idea.estimated_duration   ?? null,
      best_time_to_post_wib: idea.best_time_to_post_wib ?? null,
    },
    statusCode: 200,
  });
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

  // Optional reason: trim and clamp length; null allowed.
  let reasonClean: string | null = null;
  if (typeof rejected_reason === 'string') {
    const trimmed = rejected_reason.trim();
    if (trimmed.length > 0) {
      reasonClean = trimmed.slice(0, 500);
    }
  }

  const { data, error: rejectionErr } = await supabase
    .from('content_ideas')
    .update({
      status: 'rejected',
      rejected_reason: reasonClean,
      validated_by: userId,
      validated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)
    .eq('status', 'pending_validation')
    .select('id')
    .maybeSingle();

  if (rejectionErr) {
    logger.error('[rejectIdea] supabase error', { error: rejectionErr, ideaId });
    error(res, { message: 'Rejection failed', statusCode: 500 });
    return;
  }

  if (!data) {
    error(res, { message: 'Idea not in pending_validation state', statusCode: 409 });
    return;
  }

  success(res, { message: 'Idea rejected', data: { idea_id: ideaId }, statusCode: 200 });
}
