// Frontend types for interaction/messaging module

export interface InternalMessageDTO {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
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
