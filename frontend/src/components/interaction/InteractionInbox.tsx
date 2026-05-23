import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import useAuth from '../../hooks/useAuth';
import type { InternalMessageDTO } from '../../types/interaction';

interface InteractionInboxProps {
  messages: InternalMessageDTO[];
  recipientName?: string;
  loading?: boolean;
  onDeleteMessage?: (messageId: string) => void;
}

const InteractionInbox: React.FC<InteractionInboxProps> = ({
  messages,
  recipientName = 'User',
  loading = false,
  onDeleteMessage,
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-surface-light/20 border-t-brand rounded-full" />
          </div>
          <p className="mt-3 text-text-secondary">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-surface-light/10 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-text-primary font-semibold">No messages yet</p>
          <p className="text-text-secondary text-sm">Start a conversation with {recipientName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-surface overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwn = message.senderId === user?.id;
        const timestamp = format(new Date(message.createdAt), 'HH:mm');

        return (
          <div
            key={message.id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group
                ${
                  isOwn
                    ? 'bg-brand text-white'
                    : 'bg-surface-light/10 border border-surface-light/20 text-text-primary'
                }`}
            >
              {/* Message text */}
              <p className="text-sm break-words">{message.messageText}</p>

              {/* Timestamp */}
              <p
                className={`text-xs mt-1 ${
                  isOwn ? 'text-white/70' : 'text-text-secondary'
                }`}
              >
                {timestamp}
              </p>

              {/* Delete button (only for own messages) */}
              {isOwn && onDeleteMessage && (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-brand transition-opacity"
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default InteractionInbox;
