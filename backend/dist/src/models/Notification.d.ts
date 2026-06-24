export type NotificationType = 'publish_success' | 'publish_failed' | 'comment_added' | 'tiktok_disconnected' | 'idea_approved' | 'idea_rejected';
export interface NotificationRow {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    related_id: string | null;
    is_read: boolean;
    created_at: string;
}
export declare function createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedId?: string | null;
}): Promise<NotificationRow>;
export declare function listForUser(userId: string, options?: {
    limit?: number;
    onlyUnread?: boolean;
}): Promise<NotificationRow[]>;
export declare function getUnreadCount(userId: string): Promise<number>;
export declare function markAsRead(notificationId: string, userId: string): Promise<NotificationRow>;
export declare function markAllAsRead(userId: string): Promise<{
    updated_count: number;
}>;
//# sourceMappingURL=Notification.d.ts.map