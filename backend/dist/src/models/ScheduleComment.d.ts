export interface ScheduleComment {
    id: string;
    schedule_id: string;
    user_id: string | null;
    comment_text: string;
    created_at: string;
    updated_at: string;
}
export interface ScheduleCommentDetail extends ScheduleComment {
    comment_id: string;
    author_user_id: string | null;
    author_email: string | null;
    author_name: string | null;
    author_photo_url: string | null;
    created_at_wib: string;
    updated_at_wib: string;
}
//# sourceMappingURL=ScheduleComment.d.ts.map