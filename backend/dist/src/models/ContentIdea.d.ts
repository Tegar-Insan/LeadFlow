export interface GeneratedScheduleDraft {
    id: string;
    prompt_id: string;
    content_title: string;
    tiktok_caption: string;
    hashtag: string[];
    category: 'BEHIND-THE-SCENES' | 'MENU-SHOWCASE' | 'PROMOTION' | 'TESTIMONIAL' | 'TRENDING';
    status: 'pending_validation';
    ai_model_used: string;
    generated_image_url: string | null;
}
export interface GenerationStep {
    stepNumber: number;
    title: string;
    status: 'completed';
    details: string;
    timestamp: string;
}
export interface GenerationWithSteps {
    steps: GenerationStep[];
    drafts: GeneratedScheduleDraft[];
}
export declare function generateScheduleDraftsFromBrief(brief: string, userId: string): Promise<GeneratedScheduleDraft[]>;
export declare function generateScheduleDraftsWithStepsFromBrief(brief: string, userId: string): Promise<GenerationWithSteps>;
export declare function listPendingIdeasForUser(userId: string): Promise<GeneratedScheduleDraft[]>;
export declare function clearPendingIdeasForUser(userId: string): Promise<{
    deleted_count: number;
}>;
export declare function listByPromptId(promptId: string): Promise<unknown[]>;
export declare function getIdeaOwner(ideaId: string): Promise<string | null>;
export declare function approveIdea(ideaId: string, userId: string): Promise<{
    idea_id: string;
    schedule_id: string | null;
    schedule_status: string | null;
    content_title: string | null;
    tiktok_caption: string | null;
    hashtag: string[];
    category: string | null;
}>;
export declare function rejectIdea(ideaId: string, userId: string, rejectedReason?: string | null): Promise<{
    idea_id: string;
}>;
//# sourceMappingURL=ContentIdea.d.ts.map