/**
 * Send a multi-turn conversation to Anthropic Claude.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{ visibleText: string, schedule: object|null, model: string }>}
 */
export function chatWithAnthropic(messages: Array<{
    role: string;
    content: string;
}>): Promise<{
    visibleText: string;
    schedule: object | null;
    model: string;
}>;
/**
 * Trigger a fresh Bright Data fetch + Claude TikTok analysis via Python FastAPI.
 */
export function analyzeTikTokData(): Promise<any>;
//# sourceMappingURL=anthropicService.d.ts.map