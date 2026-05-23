import type { SendMessageRequest, ConversationDTO, InternalMessageDTO, ActiveUserDTO } from '../types/index.ts';
/**
 * Get all conversations for a user (sidebar list)
 * Returns list of users with latest message
 */
export declare function getConversations(userId: string): Promise<ConversationDTO[]>;
/**
 * Get all active users (marketing_staff + business_owner combined)
 * Excludes deactivated users, excludes the current user
 */
export declare function getActiveUsers(currentUserId: string): Promise<ActiveUserDTO[]>;
/**
 * Get message history with a specific user
 */
export declare function getMessages(userId: string, recipientId: string, limit?: number, offset?: number): Promise<InternalMessageDTO[]>;
/**
 * Send message from sender to receiver
 */
export declare function sendMessage(senderId: string, request: SendMessageRequest): Promise<InternalMessageDTO>;
/**
 * Update message (is_read, messageText)
 * Only receiver can mark as read, only sender can edit text
 */
export declare function updateMessage(userId: string, messageId: string, updates: {
    isRead?: boolean;
    messageText?: string;
}): Promise<InternalMessageDTO>;
/**
 * Delete message (only message sender can delete)
 */
export declare function deleteMessage(userId: string, messageId: string): Promise<void>;
/**
 * Get unread message count for a user
 */
export declare function getUnreadCount(userId: string): Promise<number>;
//# sourceMappingURL=interactionService.d.ts.map