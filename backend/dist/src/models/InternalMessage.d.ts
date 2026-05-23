/**
 * Get message history between two users
 * Returns messages ordered by creation time (newest last)
 */
export declare function getConversation(userId1: string, userId2: string, limit?: number, offset?: number): Promise<Record<string, unknown>[]>;
/**
 * Get all conversations for a user (list of unique users they've chatted with)
 * Returns each conversation with the latest message
 */
export declare function getUserConversations(userId: string): Promise<Record<string, unknown>[]>;
/**
 * Send a message from sender to receiver
 */
export declare function sendMessage(senderId: string, receiverId: string, messageText: string): Promise<Record<string, unknown>>;
/**
 * Mark message as read
 */
export declare function markAsRead(messageId: string): Promise<void>;
/**
 * Get message by ID
 */
export declare function getMessageById(messageId: string): Promise<Record<string, unknown> | null>;
/**
 * Delete message (soft or hard delete based on business logic)
 * Currently hard delete — can be changed to soft delete with deleted_at flag
 */
export declare function deleteMessage(messageId: string): Promise<void>;
/**
 * Get unread message count for a user
 */
export declare function getUnreadCount(userId: string): Promise<number>;
//# sourceMappingURL=InternalMessage.d.ts.map