// src/pages/interaction/InternalMessage.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  getActiveUsers,
  getConversations,
  getMessages,
  sendMessage as sendMessageAPI,
  updateMessage,
} from '../../services/InteractionService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

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

interface Conversation {
  userId: string;
  userName: string;
  userEmail: string;
  latestMessage: string;
  latestMessageTime: string;
  unreadCount: number;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const convs = await getConversations();
        setConversations(convs);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    };

    loadConversations();
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

      // Update conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.userId === message.senderId
            ? {
                ...conv,
                latestMessage: message.messageText,
                latestMessageTime: message.createdAt,
              }
            : conv
        )
      );
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

  const selectedConversation = conversations.find((c) => c.userId === selectedUserId);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - User List */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <p className="text-sm text-gray-500">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </p>
        </div>

        {/* Active Users Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
              Active Users ({activeUsers.length})
            </p>

            {activeUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No active users</p>
            ) : (
              <div className="space-y-1">
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
                    <div className="font-medium text-sm">{usr.fullName}</div>
                    <div className="text-xs opacity-70">{usr.role}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversations Section */}
          {conversations.length > 0 && (
            <div className="border-t border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
                Recent Conversations
              </p>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => {
                      setSelectedUserId(conv.userId);
                      setTypingUsers(new Set());
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedUserId === conv.userId
                        ? 'bg-brand text-white'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{conv.userName}</div>
                        <div className="text-xs opacity-70 truncate">
                          {conv.latestMessage}
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUserId && selectedConversation ? (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedConversation.userName}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedConversation.userEmail}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {loading && messages.length === 0 ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === user?.userId ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.senderId === user?.userId
                          ? 'bg-brand text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{msg.messageText}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                        {msg.senderId === user?.userId && msg.isRead && ' ✓✓'}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* Typing Indicator */}
              {typingUsers.size > 0 && selectedUserId && typingUsers.has(selectedUserId) && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || !isConnected}
                  className="px-6 py-2 bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">No Conversation Selected</p>
              <p className="text-sm">Select a user from the left to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
