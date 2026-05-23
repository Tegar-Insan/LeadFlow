// @ts-nocheck
// src/services/interactionService.ts
import * as InternalMessage from "../models/InternalMessage.js";
import * as User from "../models/User.js";
import * as validator from "../validators/interactionValidator.js";
import logger from "../utils/logger.js";
/**
 * Get all conversations for a user (sidebar list)
 * Returns list of users with latest message
 */
export async function getConversations(userId) {
    try {
        const conversations = await InternalMessage.getUserConversations(userId);
        // Map to ConversationDTO
        const result = conversations
            .filter(Boolean)
            .map((conv) => {
            // Determine other user in conversation
            const otherUser = conv.sender_id === userId ? conv.receiver_id : conv.sender_id;
            const otherUserData = conv.sender_id === userId ? conv.users_receiver_id : conv.users_sender_id;
            return {
                userId: otherUser,
                userName: otherUserData?.user_profiles?.full_name || 'Unknown User',
                userEmail: otherUserData?.email || 'unknown@email.com',
                latestMessage: conv.message_text,
                latestMessageTime: conv.created_at,
                unreadCount: conv.receiver_id === userId && !conv.is_read ? 1 : 0,
            };
        });
        return result;
    }
    catch (err) {
        logger.error('interactionService.getConversations error:', err);
        throw err;
    }
}
/**
 * Get message history with a specific user
 */
export async function getMessages(userId, recipientId, limit = 50, offset = 0) {
    try {
        // Verify recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            const err = new Error('Recipient user not found');
            err.statusCode = 404;
            throw err;
        }
        // Validate users are different
        validator.validateDifferentUsers(userId, recipientId);
        // Get conversation
        const messages = await InternalMessage.getConversation(userId, recipientId, limit, offset);
        // Mark received messages as read
        for (const msg of messages) {
            if (msg.receiver_id === userId && !msg.is_read) {
                try {
                    await InternalMessage.markAsRead(msg.id);
                }
                catch (e) {
                    logger.warn(`Failed to mark message ${msg.id} as read:`, e);
                }
            }
        }
        // Map to DTOs with snake_case to camelCase conversion
        return messages.map((msg) => ({
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            messageText: msg.message_text,
            isRead: msg.is_read,
            createdAt: msg.created_at,
            updatedAt: msg.updated_at,
        }));
    }
    catch (err) {
        logger.error('interactionService.getMessages error:', err);
        throw err;
    }
}
/**
 * Send message from sender to receiver
 */
export async function sendMessage(senderId, request) {
    try {
        const { receiverId, messageText } = request;
        // Validate input
        validator.validateDifferentUsers(senderId, receiverId);
        // Verify receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            const err = new Error('Recipient user not found');
            err.statusCode = 404;
            throw err;
        }
        // Verify sender exists (should always be true if authenticated)
        const sender = await User.findById(senderId);
        if (!sender) {
            const err = new Error('Sender user not found');
            err.statusCode = 404;
            throw err;
        }
        // Create message
        const message = await InternalMessage.sendMessage(senderId, receiverId, messageText);
        logger.info(`Message sent from ${senderId} to ${receiverId}`);
        // Map to DTO
        return {
            id: message.id,
            senderId: message.sender_id,
            receiverId: message.receiver_id,
            messageText: message.message_text,
            isRead: message.is_read,
            createdAt: message.created_at,
            updatedAt: message.updated_at,
        };
    }
    catch (err) {
        logger.error('interactionService.sendMessage error:', err);
        throw err;
    }
}
/**
 * Delete message (only message sender can delete)
 */
export async function deleteMessage(userId, messageId) {
    try {
        // Get message to verify ownership
        const message = await InternalMessage.getMessageById(messageId);
        if (!message) {
            const err = new Error('Message not found');
            err.statusCode = 404;
            throw err;
        }
        // Verify user is sender
        validator.validateDeletePermission(message.sender_id, userId);
        // Delete message
        await InternalMessage.deleteMessage(messageId);
        logger.info(`Message ${messageId} deleted by user ${userId}`);
    }
    catch (err) {
        logger.error('interactionService.deleteMessage error:', err);
        throw err;
    }
}
/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId) {
    try {
        return await InternalMessage.getUnreadCount(userId);
    }
    catch (err) {
        logger.error('interactionService.getUnreadCount error:', err);
        return 0; // Return 0 on error to avoid breaking UI
    }
}
//# sourceMappingURL=interactionService.js.map