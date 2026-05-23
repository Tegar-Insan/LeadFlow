import type { SendMessageRequest, ConversationDTO, InternalMessageDTO } from '../types/index.ts';
/**
 * Get all conversations for a user (sidebar list)
 * Returns list of users with latest message
 */
export declare function getConversations(userId: string): Promise<ConversationDTO[]>;
/**
 * Get message history with a specific user
 */
export declare function getMessages(userId: string, recipientId: string, limit?: number, offset?: number): Promise<InternalMessageDTO[]>;
/**
 * Send message from sender to receiver
 */
export declare function sendMessage(senderId: string, request: SendMessageRequest): Promise<InternalMessageDTO>;
/**
 * Delete message (only message sender can delete)
 */
export declare function deleteMessage(userId: string, messageId: string): Promise<void>;
/**
 * Get unread message count for a user
 */
export declare function getUnreadCount(userId: string): Promise<number>;
//# sourceMappingURL=interactionService.d.ts.map