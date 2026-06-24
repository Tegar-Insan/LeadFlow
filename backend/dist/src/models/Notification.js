// src/models/Notification.ts
// Persistent notification center (bell icon + dropdown). Distinct from the
// ephemeral Toast popups in NotificationContext.tsx — read/unread state here
// survives refresh/logout/device switch (migration 023_create_notifications.sql).
// Sources: UC009 publish status, schedule comments, TikTok disconnect, UC006 idea approve/reject.
import { supabaseAdmin as db } from "../config/supabase.js";
import logger from "../utils/logger.js";
const SELECT_COLUMNS = 'id, user_id, type, title, message, related_id, is_read, created_at';
const DEFAULT_LIST_LIMIT = 30;
export async function createNotification(params) {
    const { userId, type, title, message, relatedId = null } = params;
    const { data, error } = await db
        .from('notifications')
        .insert({ user_id: userId, type, title, message, related_id: relatedId })
        .select(SELECT_COLUMNS)
        .single();
    if (error || !data) {
        logger.error('[Notification.createNotification] failed', { error, userId, type });
        throw new Error('Failed to create notification');
    }
    return data;
}
export async function listForUser(userId, options = {}) {
    const { limit = DEFAULT_LIST_LIMIT, onlyUnread = false } = options;
    let query = db
        .from('notifications')
        .select(SELECT_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (onlyUnread) {
        query = query.eq('is_read', false);
    }
    const { data, error } = await query;
    if (error) {
        logger.error('[Notification.listForUser] failed', { error, userId });
        throw new Error('Failed to fetch notifications');
    }
    return (data ?? []);
}
export async function getUnreadCount(userId) {
    const { count, error } = await db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    if (error) {
        logger.error('[Notification.getUnreadCount] failed', { error, userId });
        throw new Error('Failed to count unread notifications');
    }
    return count ?? 0;
}
// Ownership-checked: backend uses the Supabase service-role key (bypasses
// RLS), so cross-user access must be blocked here in app logic, not just by
// the table's defense-in-depth RLS policies.
export async function markAsRead(notificationId, userId) {
    const { data, error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select(SELECT_COLUMNS)
        .maybeSingle();
    if (error) {
        logger.error('[Notification.markAsRead] failed', { error, notificationId, userId });
        throw new Error('Failed to mark notification as read');
    }
    if (!data) {
        const notFound = new Error('Notification not found');
        notFound.statusCode = 404;
        throw notFound;
    }
    return data;
}
export async function markAllAsRead(userId) {
    const { data, error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('id');
    if (error) {
        logger.error('[Notification.markAllAsRead] failed', { error, userId });
        throw new Error('Failed to mark notifications as read');
    }
    return { updated_count: (data ?? []).length };
}
//# sourceMappingURL=Notification.js.map