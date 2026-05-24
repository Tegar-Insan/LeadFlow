import React, { useEffect, useRef } from 'react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

interface InteractionInboxProps {
  messages: Message[];
  loading: boolean;
  recipientName: string;
  recipientEmail?: string;
  currentUserId: string;
  messageInput: string;
  onInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  isConnected: boolean;
  typingUsers?: Set<string>;
  selectedUserId?: string | null;
}

export default function InteractionInbox({
  messages,
  loading,
  recipientName,
  recipientEmail,
  currentUserId,
  messageInput,
  onInputChange,
  onSend,
  isConnected,
  typingUsers,
  selectedUserId,
}: InteractionInboxProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim()) {
        onSend(e as unknown as React.FormEvent);
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const isTyping = typingUsers && selectedUserId && typingUsers.has(selectedUserId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-3 flex items-center gap-3 bg-white">
        <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-sm flex-shrink-0">
          {recipientName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {recipientName}
          </h3>
          {recipientEmail && (
            <p className="text-xs text-gray-500 truncate">{recipientEmail}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50 space-y-3">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No messages yet</p>
            <p className="text-xs text-gray-400">Say hello to {recipientName}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="break-words leading-relaxed">{msg.messageText}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isOwn && msg.isRead && (
                      <span className="ml-1">✓✓</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={onSend} className="border-t border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={messageInput}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? `Message ${recipientName}…` : 'Disconnected…'}
            disabled={!isConnected}
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || !isConnected}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-brand text-white rounded-full hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4 translate-x-px" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
      </form>
    </div>
  );
}
