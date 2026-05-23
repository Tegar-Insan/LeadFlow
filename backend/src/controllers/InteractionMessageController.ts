// @ts-nocheck
// src/controllers/InteractionMessageController.ts
import type { Request, Response, NextFunction } from 'express';
import * as interactionService from '../services/interactionService.ts';
import * as validator from '../validators/interactionValidator.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

/**
 * GET /api/message
 * Get all conversations for the current user
 */
export async function getConversations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      const err = new Error('Unauthorized: User ID not found in token');
      err.statusCode = 401;
      throw err;
    }

    const conversations = await interactionService.getConversations(userId);

    success(res, {
      message: 'Conversations retrieved successfully',
      data: { conversations },
      statusCode: 200,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/message/users/active
 * Get all active users (marketing_staff + business_owner combined)
 * Used to populate the user list in sidebar
 */
export async function getActiveUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      const err = new Error('Unauthorized: User ID not found in token');
      err.statusCode = 401;
      throw err;
    }

    const users = await interactionService.getActiveUsers(userId);

    success(res, {
      message: 'Active users retrieved successfully',
      data: { users },
      statusCode: 200,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/message/:userId
 * Get message history with a specific user
 */
export async function getMessages(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      const err = new Error('Unauthorized: User ID not found in token');
      err.statusCode = 401;
      throw err;
    }

    const { recipientId, limit, offset } = validator.validateGetMessagesQuery(
      req.query
    );

    const messages = await interactionService.getMessages(
      userId,
      recipientId,
      limit,
      offset
    );

    success(res, {
      message: 'Messages retrieved successfully',
      data: { messages },
      statusCode: 200,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/message
 * Send a new message
 */
export async function sendMessage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      const err = new Error('Unauthorized: User ID not found in token');
      err.statusCode = 401;
      throw err;
    }

    const request = validator.validateSendMessage(req.body);

    const message = await interactionService.sendMessage(userId, request);

    success(res, {
      message: 'Message sent successfully',
      data: { message },
      statusCode: 201,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/message/:messageId
 * Update message (mark as read, edit text)
 */
export async function updateMessage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      const err = new Error('Unauthorized: User ID not found in token');
      err.statusCode = 401;
      throw err;
    }

    const { messageId } = req.params;
    if (!messageId) {
      const err = new Error('messageId is required in path parameter');
      err.statusCode = 400;
      throw err;
    }

    const { isRead, messageText } = req.body;

    const updatedMessage = await interactionService.updateMessage(
      userId,
      messageId,
      { isRead, messageText }
    );

    success(res, {
      message: 'Message updated successfully',
      data: { message: updatedMessage },
      statusCode: 200,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/message/:messageId
 * Delete a message (sender only)
 */
export async function deleteMessage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      const err = new Error('Unauthorized: User ID not found in token');
      err.statusCode = 401;
      throw err;
    }

    const { messageId } = req.params;
    if (!messageId) {
      const err = new Error('messageId is required in path parameter');
      err.statusCode = 400;
      throw err;
    }

    await interactionService.deleteMessage(userId, messageId);

    success(res, {
      message: 'Message deleted successfully',
      statusCode: 200,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/message/unread/count
 * Get unread message count for the current user
 */
export async function getUnreadCount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      const err = new Error('Unauthorized: User ID not found in token');
      err.statusCode = 401;
      throw err;
    }

    const count = await interactionService.getUnreadCount(userId);

    success(res, {
      message: 'Unread count retrieved successfully',
      data: { unreadCount: count },
      statusCode: 200,
    });
  } catch (err) {
    next(err);
  }
}
