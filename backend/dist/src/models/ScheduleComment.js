// backend/src/models/ScheduleComment.ts
// Business logic moved from controllers/commentsController.ts (MVC refactor)
// SRS UC015 — internal team comments on draft schedules; locked once published.
import { supabaseAdmin } from "../config/supabase.js";
import { formatJakarta } from "../utils/jakartaTime.js";
async function authorMapFor(userIds) {
    const authorMap = new Map();
    if (userIds.length === 0)
        return authorMap;
    const [{ data: users, error: userErr }, { data: profiles, error: profileErr }] = await Promise.all([
        supabaseAdmin.from('users').select('id, email').in('id', userIds),
        supabaseAdmin.from('user_profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
    ]);
    if (userErr || profileErr) {
        throw new Error(`ScheduleComment.authorMapFor: ${userErr?.message ?? profileErr?.message}`);
    }
    for (const user of (users ?? [])) {
        const profile = (profiles ?? []).find((row) => row.user_id === user.id);
        authorMap.set(user.id, {
            user_id: user.id,
            email: user.email,
            full_name: profile?.full_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
        });
    }
    return authorMap;
}
export async function listBySchedule(scheduleId) {
    const { data: comments, error } = await supabaseAdmin
        .from('schedule_comments')
        .select('id, schedule_id, user_id, comment_text, created_at, updated_at')
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(`ScheduleComment.listBySchedule: ${error.message}`);
    const commentRows = (comments ?? []);
    const authorIds = [
        ...new Set(commentRows.map((c) => c.user_id).filter((id) => !!id)),
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
export async function getScheduleStatus(scheduleId) {
    const { data: schedule, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select('id, status')
        .eq('id', scheduleId)
        .maybeSingle();
    if (error)
        throw new Error(`ScheduleComment.getScheduleStatus: ${error.message}`);
    return schedule ?? null;
}
// Used to route a "new comment" notification to the schedule's owner.
export async function getScheduleOwner(scheduleId) {
    const { data, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select('created_by')
        .eq('id', scheduleId)
        .maybeSingle();
    if (error)
        throw new Error(`ScheduleComment.getScheduleOwner: ${error.message}`);
    return data?.created_by ?? null;
}
export async function create({ scheduleId, userId, commentText, }) {
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
    if (error)
        throw error;
    return data;
}
export async function getAuthorProfile(userId) {
    const [{ data: profile }, { data: user }] = await Promise.all([
        supabaseAdmin
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', userId)
            .maybeSingle(),
        supabaseAdmin.from('users').select('email').eq('id', userId).maybeSingle(),
    ]);
    const profileRow = profile;
    const userRow = user;
    return {
        full_name: profileRow?.full_name ?? null,
        avatar_url: profileRow?.avatar_url ?? null,
        email: userRow?.email ?? null,
    };
}
export async function findById(commentId) {
    const { data, error } = await supabaseAdmin
        .from('schedule_comments')
        .select('id, user_id, schedule_id')
        .eq('id', commentId)
        .maybeSingle();
    if (error)
        throw new Error(`ScheduleComment.findById: ${error.message}`);
    return data ?? null;
}
export async function remove(commentId) {
    const { error } = await supabaseAdmin.from('schedule_comments').delete().eq('id', commentId);
    if (error)
        throw new Error(`ScheduleComment.remove: ${error.message}`);
}
//# sourceMappingURL=ScheduleComment.js.map