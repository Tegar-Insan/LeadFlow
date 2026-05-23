// src/services/InteractionService.ts
import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const authHeader = () => ({
  Authorization: `Bearer ${getAccessToken()}`,
});

export interface ActiveUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  isActive: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  userId: string;
  userName: string;
  userEmail: string;
  latestMessage: string;
  latestMessageTime: string;
  unreadCount: number;
}

/**
 * GET /api/message/users/active
 * Fetch all active users (marketing staff + business owner combined)
 * Processed data: sorted by name, filtered for active status
 */
export const getActiveUsers = async (): Promise<ActiveUser[]> => {
  try {
    const res = await axios.get(`${API}/message/users/active`, {
      headers: authHeader(),
    });

    const users = res.data.data.users || [];

    // Process and filter data before returning to component
    return users
      .filter((user: any) => user.is_active === true)
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        fullName: user.user_profiles?.full_name || 'Unknown User',
        phone: user.user_profiles?.phone || '',
        role: user.roles?.name || 'unknown',
        isActive: user.is_active,
      }))
      .sort((a: ActiveUser, b: ActiveUser) => a.fullName.localeCompare(b.fullName));
  } catch (err) {
    console.error('InteractionService.getActiveUsers error:', err);
    throw err;
  }
};

/**
 * GET /api/message
 * Fetch all conversations for current user
 * Processed data: sorted by latest message time
 */
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const res = await axios.get(`${API}/message`, {
      headers: authHeader(),
    });

    const conversations = res.data.data.conversations || [];

    // Process and sort by latest message time
    return conversations
      .map((conv: any) => ({
        userId: conv.userId,
        userName: conv.userName,
        userEmail: conv.userEmail,
        latestMessage: conv.latestMessage,
        latestMessageTime: conv.latestMessageTime,
        unreadCount: conv.unreadCount || 0,
      }))
      .sort(
        (a: Conversation, b: Conversation) =>
          new Date(b.latestMessageTime).getTime() -
          new Date(a.latestMessageTime).getTime()
      );
  } catch (err) {
    console.error('InteractionService.getConversations error:', err);
    throw err;
  }
};

/**
 * GET /api/message/:userId
 * Fetch message history with a specific user
 * Processed data: converted to camelCase, sorted by time
 */
export const getMessages = async (
  recipientId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> => {
  try {
    const res = await axios.get(`${API}/message/${recipientId}`, {
      params: { limit, offset },
      headers: authHeader(),
    });

    const messages = res.data.data.messages || [];

    // Process and sort by time (oldest first)
    return messages
      .map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        messageText: msg.messageText,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }))
      .sort(
        (a: Message, b: Message) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  } catch (err) {
    console.error('InteractionService.getMessages error:', err);
    throw err;
  }
};

/**
 * POST /api/message
 * Send a new message to a recipient
 * Processed data: validates message text, converts timestamps
 */
export const sendMessage = async (
  recipientId: string,
  messageText: string
): Promise<Message> => {
  try {
    // Validate message text before sending
    if (!messageText || messageText.trim().length === 0) {
      throw new Error('Message text cannot be empty');
    }

    if (messageText.length > 5000) {
      throw new Error('Message text cannot exceed 5000 characters');
    }

    const res = await axios.post(
      `${API}/message`,
      {
        receiverId: recipientId,
        messageText: messageText.trim(),
      },
      { headers: authHeader() }
    );

    const msg = res.data.data.message;

    // Process response
    return {
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      messageText: msg.messageText,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    };
  } catch (err) {
    console.error('InteractionService.sendMessage error:', err);
    throw err;
  }
};

/**
 * PUT /api/message/:messageId
 * Update message (mark as read or edit text)
 * Processed data: validates updates, converts timestamps
 */
export const updateMessage = async (
  messageId: string,
  updates: { isRead?: boolean; messageText?: string }
): Promise<Message> => {
  try {
    // Validate message text if editing
    if (updates.messageText !== undefined) {
      if (updates.messageText.trim().length === 0) {
        throw new Error('Message text cannot be empty');
      }
      if (updates.messageText.length > 5000) {
        throw new Error('Message text cannot exceed 5000 characters');
      }
    }

    const res = await axios.put(
      `${API}/message/${messageId}`,
      {
        isRead: updates.isRead,
        messageText: updates.messageText,
      },
      { headers: authHeader() }
    );

    const msg = res.data.data.message;

    // Process response
    return {
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      messageText: msg.messageText,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    };
  } catch (err) {
    console.error('InteractionService.updateMessage error:', err);
    throw err;
  }
};

/**
 * DELETE /api/message/:messageId
 * Delete a message (sender only)
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    await axios.delete(`${API}/message/${messageId}`, {
      headers: authHeader(),
    });
  } catch (err) {
    console.error('InteractionService.deleteMessage error:', err);
    throw err;
  }
};

/**
 * GET /api/message/unread/count
 * Get unread message count for current user
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const res = await axios.get(`${API}/message/unread/count`, {
      headers: authHeader(),
    });

    return res.data.data.unreadCount || 0;
  } catch (err) {
    console.error('InteractionService.getUnreadCount error:', err);
    return 0; // Return 0 on error to avoid breaking UI
  }
};

/**
 * Mark all messages in a conversation as read
 * Processed data: batch update via Promise.all
 */
export const markConversationAsRead = async (
  messages: Message[]
): Promise<void> => {
  try {
    const unreadMessages = messages.filter((msg) => !msg.isRead);

    if (unreadMessages.length === 0) return;

    await Promise.all(
      unreadMessages.map((msg) =>
        updateMessage(msg.id, { isRead: true }).catch((err) => {
          console.warn(`Failed to mark message ${msg.id} as read:`, err);
        })
      )
    );
  } catch (err) {
    console.error('InteractionService.markConversationAsRead error:', err);
    throw err;
  }
};
