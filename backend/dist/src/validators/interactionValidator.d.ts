import type { SendMessageRequest, DeleteMessageRequest } from '../types/index.ts';
/**
 * Validate send message request
 * Throws error if validation fails
 */
export declare function validateSendMessage(body: unknown): SendMessageRequest;
/**
 * Validate delete message request
 */
export declare function validateDeleteMessage(body: unknown): DeleteMessageRequest;
/**
 * Validate message query parameters
 */
export declare function validateGetMessagesQuery(query: unknown): {
    recipientId: string;
    limit?: number;
    offset?: number;
};
/**
 * Validate sender and receiver are not the same
 */
export declare function validateDifferentUsers(senderId: string, receiverId: string): void;
/**
 * Validate user has permission to delete message (sender only)
 */
export declare function validateDeletePermission(senderId: string, currentUserId: string): void;
//# sourceMappingURL=interactionValidator.d.ts.map