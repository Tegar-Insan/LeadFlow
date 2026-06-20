import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import commentService from '../../services/commentService';
import CommentCard from './CommentCard';

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

interface CommentThreadProps {
  scheduleId: string;
  isReadOnly?: boolean;
}

export default function CommentThread({
  scheduleId,
  isReadOnly = false,
}: CommentThreadProps) {
  const { user } = useAuth();
  const { toast } = useNotification();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load initial comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true);
        const data = await commentService.getComments(scheduleId);
        setComments(data);

        // Join WebSocket room for real-time updates
        if (commentService.isConnected()) {
          commentService.joinScheduleRoom(scheduleId);
        }
      } catch (err: any) {
        console.error('[CommentThread] Failed to load comments:', err);
        toast.error('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [scheduleId]);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!commentService.isConnected()) return;

    // Subscribe to new comments
    commentService.onCommentAdded(scheduleId, (comment: Comment) => {
      setComments((prev) => {
        // Avoid duplicates
        if (prev.find((c) => c.comment_id === comment.comment_id)) {
          return prev;
        }
        return [...prev, comment];
      });
    });

    // Subscribe to deleted comments
    commentService.onCommentDeleted(scheduleId, (data: { comment_id: string }) => {
      setComments((prev) => prev.filter((c) => c.comment_id !== data.comment_id));
    });

    // Cleanup
    return () => {
      commentService.offCommentAdded(scheduleId);
      commentService.offCommentDeleted(scheduleId);
    };
  }, [scheduleId]);

  // Handle new comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await commentService.createComment(scheduleId, newComment);
      setNewComment('');
      toast.success('Comment posted');
    } catch (err: any) {
      console.error('[CommentThread] Failed to post comment:', err);
      toast.error(err?.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await commentService.deleteComment(commentId);
        toast.success('Comment deleted');
      } catch (err: any) {
        console.error('[CommentThread] Failed to delete comment:', err);
        toast.error(err?.response?.data?.message || 'Failed to delete comment');
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-text-muted text-sm">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment.comment_id}
              comment={comment}
              currentUserId={user?.userId}
              onDelete={isReadOnly ? undefined : handleDeleteComment}
              loading={submitting}
            />
          ))
        )}
      </div>

      {/* Comment Input (disabled if read-only) */}
      {!isReadOnly && (
        <form onSubmit={handleSubmitComment} className="border-t border-surface-border pt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={submitting}
            rows={3}
            className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-text-primary placeholder-text-muted text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setNewComment('')}
              disabled={submitting || !newComment.trim()}
              className="px-3 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-brand hover:bg-brand/90 text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
