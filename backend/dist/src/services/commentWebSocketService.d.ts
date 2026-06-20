import type { Server } from 'socket.io';
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
declare class CommentWebSocketService {
    private io;
    /**
     * Initialize WebSocket service with Socket.IO server
     */
    init(io: Server): void;
    /**
     * Broadcast a new comment to all clients in the schedule room
     */
    broadcastCommentAdded(scheduleId: string, comment: CommentPayload): void;
    /**
     * Broadcast a deleted comment to all clients in the schedule room
     */
    broadcastCommentDeleted(scheduleId: string, commentId: string): void;
    /**
     * Get total connected clients
     */
    getConnectedCount(): number;
}
declare const _default: CommentWebSocketService;
export default _default;
//# sourceMappingURL=commentWebSocketService.d.ts.map