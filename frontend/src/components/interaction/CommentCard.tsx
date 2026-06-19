import type { ScheduleCommentDetail } from '../../services/commentsService';

type Props = {
  comment: ScheduleCommentDetail;
};

export default function CommentCard({ comment }: Props) {
  const initial = comment.author_name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex gap-3 py-3 border-b border-surface-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand">
        {comment.author_photo_url ? (
          <img
            src={comment.author_photo_url}
            alt={comment.author_name ?? ''}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-text-primary">
            {comment.author_name ?? 'Unknown'}
          </span>
          <span className="text-[10px] text-text-muted">{comment.created_at_wib}</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed break-words">
          {comment.comment_text}
        </p>
      </div>
    </div>
  );
}
