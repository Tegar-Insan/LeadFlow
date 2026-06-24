export interface ScheduleComment {
    id: string;
    schedule_id: string;
    user_id: string | null;
    comment_text: string;
    created_at: string;
    updated_at: string;
}
export interface ScheduleCommentDetail {
    comment_id: string;
    schedule_id: string;
    comment_text: string;
    author_user_id: string | null;
    author_email: string | null;
    author_name: string | null;
    author_photo_url: string | null;
    created_at_wib: string;
    updated_at_wib: string;
}
export interface AuthorProfile {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
}
export declare function listBySchedule(scheduleId: string): Promise<ScheduleCommentDetail[]>;
export declare function getScheduleStatus(scheduleId: string): Promise<{
    id: string;
    status: string;
} | null>;
export declare function getScheduleOwner(scheduleId: string): Promise<string | null>;
export declare function create({ scheduleId, userId, commentText, }: {
    scheduleId: string;
    userId: string;
    commentText: string;
}): Promise<{
    id: string;
    created_at: string;
}>;
export declare function getAuthorProfile(userId: string): Promise<AuthorProfile>;
export declare function findById(commentId: string): Promise<{
    id: string;
    user_id: string | null;
    schedule_id: string;
} | null>;
export declare function remove(commentId: string): Promise<void>;
//# sourceMappingURL=ScheduleComment.d.ts.map