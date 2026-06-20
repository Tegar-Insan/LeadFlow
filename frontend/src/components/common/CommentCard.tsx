import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Comment {
  comment_id: string;
  schedule_id: string;
  comment_text: string;
  author_user_id?: string;
  author_email?: string;
  author_name?: string;
  author_photo_url?: string;
  created_at_wib: string;
  updated_at_wib: string;
}

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
  loading?: boolean;
}

export default function CommentCard({
  comment,
  currentUserId,
  onDelete,
  loading = false,
}: CommentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isAuthor = currentUserId && comment.author_user_id === currentUserId;

  const handleDelete = async () => {
    if (!onDelete || !isAuthor) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.comment_id);
    } finally {
      setIsDeleting(false);
    }
  };

  const initials = comment.author_name
    ? comment.author_name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="flex gap-3 px-3 py-3 bg-surface-raised rounded-lg border border-surface-border hover:bg-surface-overlay transition-colors group">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.author_photo_url ? (
          <img
            src={comment.author_photo_url}
            alt={comment.author_name || 'User'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Name, Email, Time */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-text-primary text-sm">
            {comment.author_name || 'Anonymous'}
          </span>
          <span className="text-text-muted text-xs">
            {comment.author_email || 'no-email'}
          </span>
          <span className="text-text-muted text-xs ml-auto">
            {comment.created_at_wib}
          </span>
        </div>

        {/* Comment Text */}
        <p className="text-text-secondary text-sm mt-1.5 leading-relaxed break-words">
          {comment.comment_text}
        </p>

        {/* Edit indicator if updated */}
        {comment.updated_at_wib !== comment.created_at_wib && (
          <p className="text-text-muted text-xs mt-1.5">
            (edited {comment.updated_at_wib})
          </p>
        )}
      </div>

      {/* Delete button (author only) */}
      {isAuthor && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || loading}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete comment"
        >
          <svg
            className="w-4 h-4 text-text-muted hover:text-brand transition-colors disabled:opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
