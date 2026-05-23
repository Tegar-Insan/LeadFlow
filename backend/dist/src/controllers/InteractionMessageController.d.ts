import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.ts';
/**
 * GET /api/message
 * Get all conversations for the current user
 */
export declare function getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /api/message/:userId
 * Get message history with a specific user
 */
export declare function getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /api/message
 * Send a new message
 */
export declare function sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * DELETE /api/message/:messageId
 * Delete a message (sender only)
 */
export declare function deleteMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /api/message/unread/count
 * Get unread message count for the current user
 */
export declare function getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=InteractionMessageController.d.ts.map