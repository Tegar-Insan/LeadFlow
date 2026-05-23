import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationDTO } from '../../types/interaction';

interface DMCardProps {
  conversation: ConversationDTO;
  isSelected?: boolean;
  onClick: () => void;
}

const DMCard: React.FC<DMCardProps> = ({
  conversation,
  isSelected = false,
  onClick,
}) => {
  const timeAgo = conversation.latestMessageTime
    ? formatDistanceToNow(new Date(conversation.latestMessageTime), { addSuffix: true })
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 mb-2 rounded-lg text-left transition-colors relative
        ${
          isSelected
            ? 'bg-brand/20 border border-brand/50'
            : 'bg-surface-light/5 hover:bg-surface-light/10 border border-surface-light/20'
        }`}
    >
      {/* Unread badge */}
      {conversation.unreadCount > 0 && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </span>
        </div>
      )}

      {/* User name */}
      <div className="font-semibold text-text-primary truncate pr-6">
        {conversation.userName}
      </div>

      {/* User email (secondary) */}
      <div className="text-xs text-text-secondary truncate mb-1">
        {conversation.userEmail}
      </div>

      {/* Latest message preview */}
      <div className="text-sm text-text-secondary truncate mb-1">
        {conversation.latestMessage || 'No messages yet'}
      </div>

      {/* Time ago */}
      <div className="text-xs text-text-muted">
        {timeAgo}
      </div>
    </button>
  );
};

export default DMCard;
