import type { Server, Socket } from 'socket.io';
import logger from '../utils/logger.ts';

interface JoinPayload {
  schedule_id: string;
}

interface CommentPayload {
  comment_id: string;
  schedule_id: string;
  comment_text: string;
  author_user_id: string;
  author_email: string;
  author_name: string;
  author_photo_url?: string;
  created_at: string;
}

class CommentWebSocketService {
  private io: Server | null = null;

  /**
   * Initialize WebSocket service with Socket.IO server
   */
  init(io: Server): void {
    this.io = io;

    io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.auth.userId;
      logger.info(`[CommentWS] User ${userId} connected:`, socket.id);

      // Handle join:schedule event
      socket.on('join:schedule', (data: JoinPayload) => {
        const room = `schedule:${data.schedule_id}`;
        socket.join(room);
        logger.info(`[CommentWS] User ${userId} joined room ${room}`);
      });

      // Handle leave:schedule event
      socket.on('leave:schedule', (data: JoinPayload) => {
        const room = `schedule:${data.schedule_id}`;
        socket.leave(room);
        logger.info(`[CommentWS] User ${userId} left room ${room}`);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`[CommentWS] User ${userId} disconnected:`, reason);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`[CommentWS] Socket error for user ${userId}:`, error);
      });
    });
  }

  /**
   * Broadcast a new comment to all clients in the schedule room
   */
  broadcastCommentAdded(scheduleId: string, comment: CommentPayload): void {
    if (!this.io) return;
    const room = `schedule:${scheduleId}`;
    this.io.to(room).emit(`comment:added:${scheduleId}`, {
      comment_id: comment.comment_id,
      schedule_id: comment.schedule_id,
      comment_text: comment.comment_text,
      author_user_id: comment.author_user_id,
      author_email: comment.author_email,
      author_name: comment.author_name,
      author_photo_url: comment.author_photo_url,
      created_at_wib: new Date(comment.created_at).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      updated_at_wib: new Date(comment.created_at).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    logger.info(`[CommentWS] Comment broadcasted to room ${room}`);
  }

  /**
   * Broadcast a deleted comment to all clients in the schedule room
   */
  broadcastCommentDeleted(scheduleId: string, commentId: string): void {
    if (!this.io) return;
    const room = `schedule:${scheduleId}`;
    this.io.to(room).emit(`comment:deleted:${scheduleId}`, {
      comment_id: commentId,
    });
    logger.info(`[CommentWS] Comment deletion broadcasted to room ${room}`);
  }

  /**
   * Get total connected clients
   */
  getConnectedCount(): number {
    return this.io?.engine.clientsCount ?? 0;
  }
}

export default new CommentWebSocketService();
