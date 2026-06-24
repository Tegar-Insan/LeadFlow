import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../utils/tokenHelper';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_SERVER = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const authHeader = () => ({ Authorization: `Bearer ${getAccessToken()}` });

export type NotificationType =
  | 'publish_success'
  | 'publish_failed'
  | 'comment_added'
  | 'tiktok_disconnected'
  | 'idea_approved'
  | 'idea_rejected';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

class NotificationService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Initialize WebSocket connection for real-time notifications.
   * Passes userId explicitly so the backend can join the dedicated
   * notif:${userId} room on connect (see notificationWebSocketService.ts).
   */
  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const token = getAccessToken();
        if (!token) {
          reject(new Error('No auth token'));
          return;
        }

        this.socket = io(SOCKET_SERVER, {
          auth: { userId, token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (err) => {
          console.error('[NotificationService] Connection error:', err);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /** Subscribe to newly pushed notifications (real-time). */
  onNewNotification(callback: (notification: AppNotification) => void): void {
    if (!this.socket) return;
    this.socket.on('notification:new', callback);
  }

  offNewNotification(): void {
    if (!this.socket) return;
    this.socket.off('notification:new');
  }

  /** GET /notifications?unread=true */
  async listNotifications(onlyUnread = false): Promise<AppNotification[]> {
    const res = await axios.get(`${API}/notifications`, {
      headers: authHeader(),
      params: onlyUnread ? { unread: 'true' } : undefined,
    });
    return res.data.data.notifications || [];
  }

  /** GET /notifications/unread-count */
  async getUnreadCount(): Promise<number> {
    const res = await axios.get(`${API}/notifications/unread-count`, {
      headers: authHeader(),
    });
    return res.data.data.count || 0;
  }

  /** PUT /notifications/:id/read */
  async markAsRead(id: string): Promise<void> {
    await axios.put(`${API}/notifications/${id}/read`, {}, { headers: authHeader() });
  }

  /** PUT /notifications/read-all */
  async markAllAsRead(): Promise<void> {
    await axios.put(`${API}/notifications/read-all`, {}, { headers: authHeader() });
  }
}

export default new NotificationService();
