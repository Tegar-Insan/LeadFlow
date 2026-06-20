// backend/src/models/ScheduleComment.ts
// Business logic moved from controllers/commentsController.ts (MVC refactor)
// SRS UC015 — internal team comments on draft schedules; locked once published.

import { supabaseAdmin } from '../config/supabase.ts';
import { formatJakarta } from '../utils/jakartaTime.ts';

export interface ScheduleComment {
  id: string;
  schedule_id: string;
  user_id: string | null;
  comment_text: string;
  created_at: string; // ISO, UTC
  updated_at: string;
}

export interface ScheduleCommentDetail {
  comment_id: string;
  schedule_id: string;
  comment_text: string;
  author_user_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_photo_url: string | null;
  created_at_wib: string;
  updated_at_wib: string;
}

export interface AuthorProfile {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

type AuthorRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

async function authorMapFor(userIds: string[]): Promise<Map<string, AuthorRow>> {
  const authorMap = new Map<string, AuthorRow>();
  if (userIds.length === 0) return authorMap;

  const [{ data: users, error: userErr }, { data: profiles, error: profileErr }] = await Promise.all([
    supabaseAdmin.from('users').select('id, email').in('id', userIds),
    supabaseAdmin.from('user_profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
  ]);

  if (userErr || profileErr) {
    throw new Error(`ScheduleComment.authorMapFor: ${userErr?.message ?? profileErr?.message}`);
  }

  for (const user of (users ?? []) as Array<{ id: string; email: string | null }>) {
    const profile = (profiles ?? []).find(
      (row: { user_id: string }) => row.user_id === user.id,
    ) as AuthorRow | undefined;
    authorMap.set(user.id, {
      user_id: user.id,
      email: user.email,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    });
  }
  return authorMap;
}

export async function listBySchedule(scheduleId: string): Promise<ScheduleCommentDetail[]> {
  const { data: comments, error } = await supabaseAdmin
    .from('schedule_comments')
    .select('id, schedule_id, user_id, comment_text, created_at, updated_at')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`ScheduleComment.listBySchedule: ${error.message}`);

  const commentRows = (comments ?? []) as ScheduleComment[];
  const authorIds = [
    ...new Set(commentRows.map((c) => c.user_id).filter((id): id is string => !!id)),
  ];
  const authorMap = await authorMapFor(authorIds);

  return commentRows.map((comment) => {
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
}

export async function getScheduleStatus(
  scheduleId: string,
): Promise<{ id: string; status: string } | null> {
  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('id, status')
    .eq('id', scheduleId)
    .maybeSingle();

  if (error) throw new Error(`ScheduleComment.getScheduleStatus: ${error.message}`);
  return (schedule as { id: string; status: string } | null) ?? null;
}

// Used to route a "new comment" notification to the schedule's owner.
export async function getScheduleOwner(scheduleId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('created_by')
    .eq('id', scheduleId)
    .maybeSingle();

  if (error) throw new Error(`ScheduleComment.getScheduleOwner: ${error.message}`);
  return (data as { created_by: string | null } | null)?.created_by ?? null;
}

export async function create({
  scheduleId,
  userId,
  commentText,
}: {
  scheduleId: string;
  userId: string;
  commentText: string;
}): Promise<{ id: string; created_at: string }> {
  const { data, error } = await supabaseAdmin
    .from('schedule_comments')
    .insert({
      schedule_id: scheduleId,
      user_id: userId,
      comment_text: commentText.trim().slice(0, 2000),
    })
    .select('id, created_at')
    .single();

  // Not wrapped — controller inspects error.message for the migration-018 trigger's
  // "Comments are locked" race-condition message and maps it to a 403.
  if (error) throw error;
  return data as { id: string; created_at: string };
}

export async function getAuthorProfile(userId: string): Promise<AuthorProfile> {
  const [{ data: profile }, { data: user }] = await Promise.all([
    supabaseAdmin
      .from('user_profiles')
      .select('full_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin.from('users').select('email').eq('id', userId).maybeSingle(),
  ]);

  const profileRow = profile as { full_name: string | null; avatar_url: string | null } | null;
  const userRow = user as { email: string | null } | null;

  return {
    full_name: profileRow?.full_name ?? null,
    avatar_url: profileRow?.avatar_url ?? null,
    email: userRow?.email ?? null,
  };
}

export async function findById(
  commentId: string,
): Promise<{ id: string; user_id: string | null; schedule_id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('schedule_comments')
    .select('id, user_id, schedule_id')
    .eq('id', commentId)
    .maybeSingle();

  if (error) throw new Error(`ScheduleComment.findById: ${error.message}`);
  return (data as { id: string; user_id: string | null; schedule_id: string } | null) ?? null;
}

export async function remove(commentId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('schedule_comments').delete().eq('id', commentId);
  if (error) throw new Error(`ScheduleComment.remove: ${error.message}`);
}
