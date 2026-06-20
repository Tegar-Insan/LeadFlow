interface ChatMessage {
    role: string;
    content: string;
}
export declare const chatWithAnthropic: (messages: ChatMessage[]) => Promise<{
    visibleText: string;
    schedules: Record<string, unknown>[];
    model: string;
}>;
export declare const analyzeTikTokData: () => Promise<Record<string, unknown>>;
export {};
//# sourceMappingURL=anthropicService.d.ts.map