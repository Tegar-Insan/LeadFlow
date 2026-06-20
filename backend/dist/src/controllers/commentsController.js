// backend/src/controllers/commentsController.ts
// SRS UC015 — Stakeholder rule #4: comments allowed only while schedule.status='draft'
// Belt-and-braces: controller checks, then DB trigger from migration 018 blocks.
import * as ScheduleComment from "../models/ScheduleComment.js";
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
// GET /api/comments/:scheduleId  — list all comments for a schedule
export async function listComments(req, res) {
    const { scheduleId } = req.params;
    if (!scheduleId) {
        error(res, { message: 'scheduleId required', statusCode: 400 });
        return;
    }
    try {
        const comments = await ScheduleComment.listBySchedule(scheduleId);
        success(res, { message: 'Comments listed', data: { comments }, statusCode: 200 });
    }
    catch (err) {
        logger.error('[listComments]', { error: err });
        error(res, { message: 'Failed to fetch comments', statusCode: 500 });
    }
}
// POST /api/comments  — create a comment
// body: { schedule_id: string, comment_text: string }
export async function createComment(req, res) {
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
    const { schedule_id, comment_text } = (req.body ?? {});
    if (!schedule_id || typeof schedule_id !== 'string') {
        error(res, { message: 'schedule_id required', statusCode: 400 });
        return;
    }
    if (!comment_text ||
        typeof comment_text !== 'string' ||
        comment_text.trim().length === 0) {
        error(res, { message: 'comment_text required', statusCode: 400 });
        return;
    }
    // Step 1 — controller-level draft check (fast fail, friendly error)
    let schedule;
    try {
        schedule = await ScheduleComment.getScheduleStatus(schedule_id);
    }
    catch (err) {
        logger.error('[createComment] schedule lookup', { error: err });
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
    let data;
    try {
        data = await ScheduleComment.create({ scheduleId: schedule_id, userId, commentText: comment_text });
    }
    catch (insertErr) {
        // If the trigger fired (race between our check and insert), surface a clean message
        if (insertErr?.message?.includes('Comments are locked')) {
            error(res, { message: 'Comments are locked on published schedules.', statusCode: 403 });
            return;
        }
        logger.error('[createComment] insert', { error: insertErr });
        error(res, { message: 'Failed to create comment', statusCode: 500 });
        return;
    }
    // Emit WebSocket event to broadcast the new comment
    const app = res.req.app;
    if (app?.commentWSService) {
        try {
            const author = await ScheduleComment.getAuthorProfile(userId);
            app.commentWSService.broadcastCommentAdded(schedule_id, {
                comment_id: data.id,
                schedule_id,
                comment_text: comment_text.trim().slice(0, 2000),
                author_user_id: userId,
                author_email: author.email,
                author_name: author.full_name,
                author_photo_url: author.avatar_url,
                created_at: data.created_at,
            });
        }
        catch (wsErr) {
            logger.error('[createComment] WebSocket broadcast failed', { wsErr });
        }
    }
    success(res, {
        message: 'Comment posted',
        data: { comment_id: data.id, created_at: data.created_at },
        statusCode: 201,
    });
}
// DELETE /api/comments/:id  — author or admin
export async function deleteComment(req, res) {
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
    let existing;
    try {
        existing = await ScheduleComment.findById(id);
    }
    catch (err) {
        logger.error('[deleteComment] lookup', { error: err });
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
    try {
        await ScheduleComment.remove(id);
    }
    catch (err) {
        logger.error('[deleteComment] delete', { error: err });
        error(res, { message: 'Failed to delete comment', statusCode: 500 });
        return;
    }
    // Emit WebSocket event to broadcast the deleted comment
    const app = res.req.app;
    if (app?.commentWSService) {
        try {
            app.commentWSService.broadcastCommentDeleted(existing.schedule_id, id);
        }
        catch (wsErr) {
            logger.error('[deleteComment] WebSocket broadcast failed', { wsErr });
        }
    }
    success(res, { message: 'Comment deleted', data: { id }, statusCode: 200 });
}
//# sourceMappingURL=commentsController.js.map