interface ChatMessage {
    role: string;
    content: string;
}
export declare const chatWithAnthropic: (messages: ChatMessage[]) => Promise<{
    visibleText: string;
    schedule: Record<string, unknown> | null;
    model: string;
}>;
export declare const analyzeTikTokData: () => Promise<Record<string, unknown>>;
export {};
//# sourceMappingURL=anthropicService.d.ts.map