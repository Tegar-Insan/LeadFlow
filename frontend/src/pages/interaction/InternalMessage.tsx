// src/pages/interaction/InternalMessage.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  getActiveUsers,
  getMessages,
  sendMessage as sendMessageAPI,
  updateMessage,
} from '../../services/InteractionService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import InteractionInbox from '../../components/interaction/InteractionInbox';

export interface User {
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

export default function InternalMessage() {
  const { user } = useAuth();
  const { toast } = useNotification();
  const {
    isConnected,
    sendMessageWS,
    markAsReadWS,
    sendTypingWS,
    stopTypingWS,
    onReceiveMessage,
    onMessageRead,
    onUserTyping,
    onUserStopTyping,
  } = useWebSocket();

  // State management
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load active users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const users = await getActiveUsers();
        setActiveUsers(users);
      } catch (err) {
        console.error('Failed to load active users:', err);
        toast.error('Failed to load active users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Load messages when selected user changes
  useEffect(() => {
    if (!selectedUserId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const msgs = await getMessages(selectedUserId);
        setMessages(msgs);

        // Mark received messages as read
        for (const msg of msgs) {
          if (msg.receiverId === user?.userId && !msg.isRead) {
            try {
              await updateMessage(msg.id, { isRead: true });
              markAsReadWS(msg.id);
            } catch (err) {
              console.warn(`Failed to mark message ${msg.id} as read`, err);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedUserId, user?.userId]);

  // WebSocket: Listen for incoming messages
  useEffect(() => {
    if (!isConnected) return;

    onReceiveMessage((message: Message) => {
      // Only add if it's from the selected conversation
      if (message.senderId === selectedUserId || message.receiverId === selectedUserId) {
        setMessages((prev) => [...prev, message]);
      }

    });
  }, [isConnected, selectedUserId, onReceiveMessage]);

  // WebSocket: Listen for message read status
  useEffect(() => {
    if (!isConnected) return;

    onMessageRead((data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, isRead: true } : msg
        )
      );
    });
  }, [isConnected, onMessageRead]);

  // WebSocket: Listen for typing indicators
  useEffect(() => {
    if (!isConnected) return;

    onUserTyping((data: any) => {
      setTypingUsers((prev) => new Set([...prev, data.senderId]));
    });
  }, [isConnected, onUserTyping]);

  // WebSocket: Listen for stop typing
  useEffect(() => {
    if (!isConnected) return;

    onUserStopTyping((data: any) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.senderId);
        return next;
      });
    });
  }, [isConnected, onUserStopTyping]);

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId || !messageInput.trim()) {
      toast.error('Please select a user and enter a message');
      return;
    }

    try {
      const newMessage = await sendMessageAPI(selectedUserId, messageInput);

      // Add to local state
      setMessages((prev) => [...prev, newMessage]);

      // Send via WebSocket
      sendMessageWS(
        selectedUserId,
        newMessage.id,
        newMessage.messageText,
        newMessage.createdAt
      );

      // Clear input
      setMessageInput('');

      // Stop typing indicator
      stopTypingWS(selectedUserId);
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(user?.userId || '');
        return next;
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    }
  };

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setMessageInput(value);

    if (!selectedUserId) return;

    // Send typing indicator
    sendTypingWS(selectedUserId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingWS(selectedUserId);
    }, 1000);
  };

  const selectedUser = activeUsers.find((u) => u.id === selectedUserId) ?? null;

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Messages</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Active Users */}
          <div className="p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              All Users ({activeUsers.length})
            </p>
            {activeUsers.length === 0 ? (
              <p className="text-xs text-gray-400 px-1">No active users</p>
            ) : (
              <div className="space-y-0.5">
                {activeUsers.map((usr) => (
                  <button
                    key={usr.id}
                    onClick={() => {
                      setSelectedUserId(usr.id);
                      setTypingUsers(new Set());
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedUserId === usr.id
                        ? 'bg-brand text-white'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="font-medium text-sm leading-tight">{usr.fullName}</div>
                    <div className={`text-xs mt-0.5 ${selectedUserId === usr.id ? 'text-white/70' : 'text-gray-400'}`}>
                      {usr.role}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 overflow-hidden">
        {selectedUserId && selectedUser ? (
          <InteractionInbox
            messages={messages}
            loading={loading}
            recipientName={'fullName' in selectedUser ? selectedUser.fullName : ''}
            recipientEmail={'email' in selectedUser ? selectedUser.email : undefined}
            currentUserId={user?.userId ?? ''}
            messageInput={messageInput}
            onInputChange={handleInputChange}
            onSend={handleSendMessage}
            isConnected={isConnected}
            typingUsers={typingUsers}
            selectedUserId={selectedUserId}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700">Select a conversation</p>
              <p className="text-sm text-gray-400 mt-1">Choose a user from the left to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
