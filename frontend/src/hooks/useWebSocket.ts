// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const { toast } = useNotification();

  // Initialize socket connection
  useEffect(() => {
    if (!user?.userId) return;

    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || `ws://${window.location.hostname}:5000`;

    socketRef.current = io(wsUrl, {
      auth: {
        userId: user.userId,
        token: localStorage.getItem('token'),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('[WebSocket] Connected:', socketRef.current?.id);
      socketRef.current?.emit('user-online', { userId: user.userId });
    });

    socketRef.current.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
    });

    socketRef.current.on('connect_error', (error: any) => {
      console.error('[WebSocket] Connection error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.userId]);

  // Send message via WebSocket
  const sendMessageWS = useCallback(
    (recipientId: string, messageId: string, messageText: string, createdAt: string) => {
      if (!socketRef.current?.connected || !user?.userId) {
        console.warn('[WebSocket] Socket not ready');
        return;
      }

      socketRef.current.emit('send-message', {
        recipientId,
        messageId,
        messageText,
        senderId: user.userId,
        createdAt,
      });
    },
    [user?.userId]
  );

  // Mark message as read via WebSocket
  const markAsReadWS = useCallback((messageId: string) => {
    if (!socketRef.current?.connected || !user?.userId) return;

    socketRef.current.emit('mark-as-read', {
      messageId,
      userId: user.userId,
    });
  }, [user?.userId]);

  // Typing indicator
  const sendTypingWS = useCallback(
    (recipientId: string) => {
      if (!socketRef.current?.connected || !user?.userId) return;

      socketRef.current.emit('typing', {
        recipientId,
        senderName: user.email || 'User',
      });
    },
    [user?.userId, user?.email]
  );

  // Stop typing indicator
  const stopTypingWS = useCallback((recipientId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('stop-typing', {
      recipientId,
    });
  }, []);

  // Listen for incoming messages
  const onReceiveMessage = useCallback(
    (callback: (message: any) => void) => {
      if (!socketRef.current) return;

      socketRef.current.off('receive-message');
      socketRef.current.on('receive-message', callback);
    },
    []
  );

  // Listen for message read status
  const onMessageRead = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return;

    socketRef.current.off('message-read');
    socketRef.current.on('message-read', callback);
  }, []);

  // Listen for typing status
  const onUserTyping = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return;

    socketRef.current.off('user-typing');
    socketRef.current.on('user-typing', callback);
  }, []);

  // Listen for stop typing status
  const onUserStopTyping = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return;

    socketRef.current.off('user-stop-typing');
    socketRef.current.on('user-stop-typing', callback);
  }, []);

  // Listen for user online/offline status
  const onUserStatus = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return;

    socketRef.current.off('user-status');
    socketRef.current.on('user-status', callback);
  }, []);

  // Listen for message sent confirmation
  const onMessageSent = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return;

    socketRef.current.off('message-sent');
    socketRef.current.on('message-sent', callback);
  }, []);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    sendMessageWS,
    markAsReadWS,
    sendTypingWS,
    stopTypingWS,
    onReceiveMessage,
    onMessageRead,
    onUserTyping,
    onUserStopTyping,
    onUserStatus,
    onMessageSent,
  };
};
