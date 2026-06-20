import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../utils/tokenHelper';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_SERVER = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const authHeader = () => ({ Authorization: `Bearer ${getAccessToken()}` });

interface Comment {
  comment_id: string;
  schedule_id: string;
  comment_text: string;
  author_user_id?: string;
  author_email?: string;
  author_name?: string;
  author_photo_url?: string;
  created_at_wib: string;
  updated_at_wib: string;
}

interface CommentEventPayload {
  comment_id: string;
  schedule_id: string;
  comment_text: string;
  author_user_id: string;
  author_email: string;
  author_name: string;
  author_photo_url?: string;
  created_at: string;
}

class CommentService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Initialize WebSocket connection for real-time comments
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const token = getAccessToken();
        if (!token) {
          reject(new Error('No auth token'));
          return;
        }

        this.socket = io(SOCKET_SERVER, {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('[CommentService] Connected:', this.socket?.id);
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[CommentService] Connection error:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(error);
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[CommentService] Disconnected:', reason);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to new comments for a schedule (real-time)
   */
  onCommentAdded(scheduleId: string, callback: (comment: Comment) => void): void {
    if (!this.socket) return;
    this.socket.on(`comment:added:${scheduleId}`, callback);
  }

  /**
   * Subscribe to comment deletions (real-time)
   */
  onCommentDeleted(scheduleId: string, callback: (data: { comment_id: string }) => void): void {
    if (!this.socket) return;
    this.socket.on(`comment:deleted:${scheduleId}`, callback);
  }

  /**
   * Unsubscribe from comment events
   */
  offCommentAdded(scheduleId: string): void {
    if (!this.socket) return;
    this.socket.off(`comment:added:${scheduleId}`);
  }

  offCommentDeleted(scheduleId: string): void {
    if (!this.socket) return;
    this.socket.off(`comment:deleted:${scheduleId}`);
  }

  /**
   * Fetch all comments for a schedule (HTTP)
   */
  async getComments(scheduleId: string): Promise<Comment[]> {
    const res = await axios.get(`${API}/comments/${scheduleId}`, {
      headers: authHeader(),
    });
    return res.data.data.comments || [];
  }

  /**
   * Post a new comment (HTTP)
   */
  async createComment(scheduleId: string, commentText: string): Promise<Comment> {
    const res = await axios.post(
      `${API}/comments`,
      { schedule_id: scheduleId, comment_text: commentText },
      { headers: authHeader() }
    );
    return res.data.data;
  }

  /**
   * Delete a comment (HTTP)
   */
  async deleteComment(commentId: string): Promise<void> {
    await axios.delete(`${API}/comments/${commentId}`, {
      headers: authHeader(),
    });
  }

  /**
   * Join a schedule's comment room (for WebSocket)
   */
  joinScheduleRoom(scheduleId: string): void {
    if (!this.socket) return;
    this.socket.emit('join:schedule', { schedule_id: scheduleId });
  }

  /**
   * Leave a schedule's comment room
   */
  leaveScheduleRoom(scheduleId: string): void {
    if (!this.socket) return;
    this.socket.emit('leave:schedule', { schedule_id: scheduleId });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return !!this.socket?.connected;
  }
}

export default new CommentService();
