import { useState, useCallback, useContext, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import type { ConversationDTO, InternalMessageDTO } from '../types/interaction';

interface UseInteractionReturn {
  messages: InternalMessageDTO[];
  conversations: ConversationDTO[];
  currentRecipient: ConversationDTO | null;
  loading: boolean;
  error: string | null;
  getConversations: () => Promise<void>;
  getMessages: (recipientId: string) => Promise<void>;
  sendMessage: (recipientId: string, messageText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  selectConversation: (recipientId: string) => void;
  clearError: () => void;
  unreadCount: number;
  getUnreadCount: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function useInteraction(): UseInteractionReturn {
  const authContext: any = useContext(AuthContext);
  const token = authContext?.token || localStorage.getItem('token');

  const [messages, setMessages] = useState<InternalMessageDTO[]>([]);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [currentRecipient, setCurrentRecipient] = useState<ConversationDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch all conversations (sidebar)
  const getConversations = useCallback(async () => {
    if (!token) {
      setError('Unauthorized: No token found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/message`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.data?.conversations || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(message);
      console.error('useInteraction.getConversations error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch messages with a specific user
  const getMessages = useCallback(
    async (recipientId: string) => {
      if (!token) {
        setError('Unauthorized: No token found');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          recipientId,
          limit: '50',
          offset: '0',
        });

        const response = await fetch(`${API_BASE_URL}/message/${recipientId}?${params}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch messages');
        }

        const data = await response.json();
        setMessages(data.data?.messages || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch messages';
        setError(message);
        console.error('useInteraction.getMessages error:', err);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Send message
  const sendMessage = useCallback(
    async (recipientId: string, messageText: string) => {
      if (!token) {
        setError('Unauthorized: No token found');
        return;
      }

      if (!messageText.trim()) {
        setError('Message cannot be empty');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiverId: recipientId,
            messageText: messageText.trim(),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to send message');
        }

        const data = await response.json();
        const newMessage = data.data?.message;

        // Add new message to messages list
        if (newMessage) {
          setMessages((prev) => [...prev, newMessage]);
        }

        // Refresh conversations to update latest message
        await getConversations();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        console.error('useInteraction.sendMessage error:', err);
        throw err;
      }
    },
    [token, getConversations]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!token) {
        setError('Unauthorized: No token found');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/message/${messageId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to delete message');
        }

        // Remove deleted message from messages list
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete message';
        setError(message);
        console.error('useInteraction.deleteMessage error:', err);
        throw err;
      }
    },
    [token]
  );

  // Get unread count
  const getUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/message/unread/count`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setUnreadCount(data.data?.unreadCount || 0);
    } catch (err) {
      console.error('useInteraction.getUnreadCount error:', err);
    }
  }, [token]);

  // Select conversation
  const selectConversation = useCallback(
    (recipientId: string) => {
      const recipient = conversations.find((conv) => conv.userId === recipientId);
      if (recipient) {
        setCurrentRecipient(recipient);
        getMessages(recipientId);
      }
    },
    [conversations, getMessages]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch conversations on mount
  useEffect(() => {
    getConversations();
    getUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      getConversations();
      getUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [getConversations, getUnreadCount]);

  return {
    messages,
    conversations,
    currentRecipient,
    loading,
    error,
    getConversations,
    getMessages,
    sendMessage,
    deleteMessage,
    selectConversation,
    clearError,
    unreadCount,
    getUnreadCount,
  };
}
