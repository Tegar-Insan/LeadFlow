export interface GeneratedScheduleDraft {
    id: string;
    prompt_id: string;
    idea_title: string;
    hook: string;
    caption: string;
    hashtags: string[];
    suggested_music: string;
    estimated_duration: number;
    estimated_engagement: 'low' | 'medium' | 'high';
    best_time_to_post_wib: string;
    category: 'BEHIND-THE-SCENES' | 'MENU-SHOWCASE' | 'PROMOTION' | 'TESTIMONIAL' | 'TRENDING';
    status: 'pending_validation';
    ai_model_used: string;
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
//# sourceMappingURL=contentIdeaService.d.ts.map