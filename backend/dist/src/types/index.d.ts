import type { Request } from 'express';
export interface JwtPayload {
    userId: string;
    roleId: string;
    roleName: string;
    email: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}
export type UserRole = 'admin' | 'business_owner' | 'marketing_staff';
export interface SuccessOptions {
    message?: string;
    data?: unknown;
    statusCode?: number;
}
export interface ErrorOptions {
    message?: string;
    errors?: unknown;
    statusCode?: number;
}
export interface InternalMessageDTO {
    id: string;
    senderId: string;
    receiverId: string;
    messageText: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface UserMessageDTO {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
}
export interface ConversationDTO {
    userId: string;
    userName: string;
    userEmail: string;
    latestMessage?: string;
    latestMessageTime?: string;
    unreadCount: number;
}
export interface SendMessageRequest {
    receiverId: string;
    messageText: string;
}
export interface GetMessagesQuery {
    recipientId: string;
    limit?: number;
    offset?: number;
}
export interface DeleteMessageRequest {
    messageId: string;
}
//# sourceMappingURL=index.d.ts.map