import React, { useState, useRef, useEffect } from 'react';

interface ReplyBoxProps {
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const ReplyBox: React.FC<ReplyBoxProps> = ({
  onSendMessage,
  loading = false,
  disabled = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    if (message.length > 5000) {
      setError('Message cannot exceed 5000 characters');
      return;
    }

    try {
      setError(null);
      await onSendMessage(message);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border-t border-surface-light/20 p-4"
    >
      {/* Error message */}
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={1}
            maxLength={5000}
            className="w-full px-4 py-2 bg-surface-light/5 border border-surface-light/20 rounded-lg
              text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30
              resize-none max-h-[120px]
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {/* Character count */}
          <div className="absolute bottom-2 right-3 text-xs text-text-muted">
            {message.length}/5000
          </div>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || loading || !message.trim()}
          className="h-10 px-4 bg-brand hover:bg-brand/90 text-white rounded-lg font-semibold
            transition-colors flex items-center justify-center
            disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-2.972 5.951 2.972a1 1 0 001.169-1.409l-7-14z" />
            </svg>
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="mt-2 text-xs text-text-muted">
        Press Ctrl+Enter (or Cmd+Enter on Mac) to send
      </p>
    </form>
  );
};

export default ReplyBox;
