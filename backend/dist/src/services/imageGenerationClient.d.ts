export interface IdeaImageContext {
    content_title: string;
    tiktok_caption: string;
    category?: string;
    style_hint?: string;
}
export interface GeneratedIdeaImage {
    imageBase64: string;
    mimeType: string;
    model: string;
}
/**
 * Requests a GPT Image 2.0 image for the given idea from ai-analyzer.
 * Returns null on any failure — callers must treat that as "no image yet"
 * and continue, never as a reason to fail idea generation.
 */
export declare function requestIdeaImage(idea: IdeaImageContext): Promise<GeneratedIdeaImage | null>;
/**
 * Requests one GPT Image 2.0 image per idea, sequentially. Sequential —
 * not Promise.all — because ai-analyzer serializes generation behind a
 * semaphore(1) (gpt-image-1 rate limit); firing these concurrently would
 * burn each request's 60s timeout while it sits queued server-side (see
 * requestIdeaImage above and contentIdeaService.ts for the same fix).
 * One failed idea never stops the rest — each slot independently resolves
 * to its image or null.
 */
export declare function requestIdeaImages(ideas: IdeaImageContext[]): Promise<Array<GeneratedIdeaImage | null>>;
//# sourceMappingURL=imageGenerationClient.d.ts.map