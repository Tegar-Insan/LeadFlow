// @ts-nocheck
// src/models/InternalMessage.ts
import { db } from "../config/db.js";
/**
 * Get message history between two users
 * Returns messages ordered by creation time (newest last)
 */
export async function getConversation(userId1, userId2, limit = 50, offset = 0) {
    const { data, error } = await db
        .from('internal_messages')
        .select(`id, sender_id, receiver_id, message_text, is_read, 
       created_at, updated_at`)
        .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),
       and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
    if (error) {
        console.error('InternalMessage.getConversation error:', error);
        return [];
    }
    return data || [];
}
/**
 * Get all conversations for a user (list of unique users they've chatted with)
 * Returns each conversation with the latest message
 */
export async function getUserConversations(userId) {
    const { data, error } = await db.rpc('get_user_conversations', {
        p_user_id: userId,
    });
    if (error) {
        console.error('InternalMessage.getUserConversations error:', error);
        // Fallback: use raw query if RPC not available
        return await fallbackGetConversations(userId);
    }
    return data || [];
}
/**
 * Fallback if RPC not available: Get conversations via raw SQL
 */
async function fallbackGetConversations(userId) {
    const { data, error } = await db
        .from('internal_messages')
        .select(`sender_id, receiver_id, message_text, created_at,
       users!sender_id(id, email, user_profiles(full_name)),
       users!receiver_id(id, email, user_profiles(full_name))`)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1);
    if (error) {
        console.error('InternalMessage.fallbackGetConversations error:', error);
        return [];
    }
    return data || [];
}
/**
 * Send a message from sender to receiver
 */
export async function sendMessage(senderId, receiverId, messageText) {
    const { data, error } = await db
        .from('internal_messages')
        .insert([
        {
            sender_id: senderId,
            receiver_id: receiverId,
            message_text: messageText,
            is_read: false,
        },
    ])
        .select('id, sender_id, receiver_id, message_text, is_read, created_at, updated_at')
        .single();
    if (error)
        throw new Error(`InternalMessage.sendMessage: ${error.message}`);
    return data;
}
/**
 * Mark message as read
 */
export async function markAsRead(messageId) {
    const { error } = await db
        .from('internal_messages')
        .update({ is_read: true })
        .eq('id', messageId);
    if (error)
        throw new Error(`InternalMessage.markAsRead: ${error.message}`);
}
/**
 * Get message by ID
 */
export async function getMessageById(messageId) {
    const { data, error } = await db
        .from('internal_messages')
        .select('id, sender_id, receiver_id, message_text, is_read, created_at, updated_at')
        .eq('id', messageId)
        .single();
    if (error)
        return null;
    return data;
}
/**
 * Delete message (soft or hard delete based on business logic)
 * Currently hard delete — can be changed to soft delete with deleted_at flag
 */
export async function deleteMessage(messageId) {
    const { error } = await db.from('internal_messages').delete().eq('id', messageId);
    if (error)
        throw new Error(`InternalMessage.deleteMessage: ${error.message}`);
}
/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId) {
    const { data, error, count } = await db
        .from('internal_messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', userId)
        .eq('is_read', false);
    if (error) {
        console.error('InternalMessage.getUnreadCount error:', error);
        return 0;
    }
    return count || 0;
}
//# sourceMappingURL=InternalMessage.js.map