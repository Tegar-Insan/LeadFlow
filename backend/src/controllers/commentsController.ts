// backend/src/controllers/commentsController.ts
// SRS UC015 — Stakeholder rule #4: comments allowed only while schedule.status='draft'
// Belt-and-braces: controller checks, then DB trigger from migration 018 blocks.

import type { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase.ts';
import { success, error } from '../utils/responseHelper.ts';
import { formatJakarta } from '../utils/jakartaTime.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

type CommentRow = {
  id: string;
  schedule_id: string;
  user_id: string | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

type CommentAuthorRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

// GET /api/comments/:scheduleId  — list all comments for a schedule
export async function listComments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { scheduleId } = req.params;
  if (!scheduleId) {
    error(res, { message: 'scheduleId required', statusCode: 400 });
    return;
  }

  const { data: comments, error: listErr } = await supabase
    .from('schedule_comments')
    .select('id, schedule_id, user_id, comment_text, created_at, updated_at')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: true });

  if (listErr) {
    logger.error('[listComments]', { error: listErr });
    error(res, { message: 'Failed to fetch comments', statusCode: 500 });
    return;
  }

  const commentRows = (comments ?? []) as CommentRow[];
  const authorIds = [...new Set(commentRows.map((comment) => comment.user_id).filter((userId): userId is string => !!userId))];

  const authorMap = new Map<string, CommentAuthorRow>();
  if (authorIds.length > 0) {
    const [{ data: users, error: userErr }, { data: profiles, error: profileErr }] = await Promise.all([
      supabase.from('users').select('id, email').in('id', authorIds),
      supabase.from('user_profiles').select('user_id, full_name, avatar_url').in('user_id', authorIds),
    ]);

    if (userErr || profileErr) {
      logger.error('[listComments] author lookup', { userErr, profileErr });
      error(res, { message: 'Failed to fetch comment authors', statusCode: 500 });
      return;
    }

    for (const user of (users ?? []) as Array<{ id: string; email: string | null }>) {
      const profile = (profiles ?? []).find((row) => row.user_id === user.id) as CommentAuthorRow | undefined;
      authorMap.set(user.id, {
        user_id: user.id,
        email: user.email,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      });
    }
  }

  const data = commentRows.map((comment) => {
    const author = comment.user_id ? authorMap.get(comment.user_id) : undefined;
    return {
      comment_id: comment.id,
      schedule_id: comment.schedule_id,
      comment_text: comment.comment_text,
      author_user_id: comment.user_id,
      author_email: author?.email ?? null,
      author_name: author?.full_name ?? null,
      author_photo_url: author?.avatar_url ?? null,
      created_at_wib: formatJakarta(comment.created_at, 'DD/MM/YYYY, HH.mm'),
      updated_at_wib: formatJakarta(comment.updated_at, 'DD/MM/YYYY, HH.mm'),
    };
  });

  success(res, { message: 'Comments listed', data: { comments: data ?? [] }, statusCode: 200 });
}

// POST /api/comments  — create a comment
// body: { schedule_id: string, comment_text: string }
export async function createComment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const role = req.user?.roleName;

  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  // Role guard: only marketing_staff can post comments
  if (role !== 'marketing_staff') {
    error(res, { message: 'Only marketing staff can post comments', statusCode: 403 });
    return;
  }

  const { schedule_id, comment_text } = (req.body ?? {}) as {
    schedule_id?: string;
    comment_text?: string;
  };

  if (!schedule_id || typeof schedule_id !== 'string') {
    error(res, { message: 'schedule_id required', statusCode: 400 });
    return;
  }
  if (
    !comment_text ||
    typeof comment_text !== 'string' ||
    comment_text.trim().length === 0
  ) {
    error(res, { message: 'comment_text required', statusCode: 400 });
    return;
  }

  // Step 1 — controller-level draft check (fast fail, friendly error)
  const { data: schedule, error: scheduleErr } = await supabase
    .from('content_queue_schedules')
    .select('id, status')
    .eq('id', schedule_id)
    .maybeSingle();

  if (scheduleErr) {
    logger.error('[createComment] schedule lookup', { scheduleErr });
    error(res, { message: 'Failed to verify schedule', statusCode: 500 });
    return;
  }
  if (!schedule) {
    error(res, { message: 'Schedule not found', statusCode: 404 });
    return;
  }
  if (schedule.status === 'published') {
    error(res, { message: 'Comments are locked on published schedules.', statusCode: 403 });
    return;
  }

  // Step 2 — INSERT (DB trigger is the second line of defense)
  const { data, error: insertErr } = await supabase
    .from('schedule_comments')
    .insert({
      schedule_id,
      user_id: userId,
      comment_text: comment_text.trim().slice(0, 2000),
    })
    .select('id, created_at')
    .single();

  if (insertErr) {
    // If the trigger fired (race between our check and insert), surface a clean message
    if (insertErr.message?.includes('Comments are locked')) {
      error(res, { message: 'Comments are locked on published schedules.', statusCode: 403 });
      return;
    }
    logger.error('[createComment] insert', { error: insertErr });
    error(res, { message: 'Failed to create comment', statusCode: 500 });
    return;
  }

  success(res, {
    message: 'Comment posted',
    data: { comment_id: data.id, created_at: data.created_at },
    statusCode: 201,
  });
}

// DELETE /api/comments/:id  — author or admin
export async function deleteComment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const role = req.user?.roleName;
  const { id } = req.params;

  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }
  if (!id) {
    error(res, { message: 'comment id required', statusCode: 400 });
    return;
  }

  const { data: existing, error: lookupErr } = await supabase
    .from('schedule_comments')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr) {
    logger.error('[deleteComment] lookup', { lookupErr });
    error(res, { message: 'Failed to fetch comment', statusCode: 500 });
    return;
  }
  if (!existing) {
    error(res, { message: 'Comment not found', statusCode: 404 });
    return;
  }

  const canDelete = role === 'admin' || existing.user_id === userId;
  if (!canDelete) {
    error(res, { message: 'Only the author or an admin can delete this comment', statusCode: 403 });
    return;
  }

  const { error: delErr } = await supabase.from('schedule_comments').delete().eq('id', id);

  if (delErr) {
    logger.error('[deleteComment] delete', { delErr });
    error(res, { message: 'Failed to delete comment', statusCode: 500 });
    return;
  }

  success(res, { message: 'Comment deleted', data: { id }, statusCode: 200 });
}
