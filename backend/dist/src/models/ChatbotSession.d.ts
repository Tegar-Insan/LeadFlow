export type ChatRole = 'user' | 'assistant';
export type ChatMessageType = 'text' | 'schedule_recommendation';
export interface ChatbotMessageRow {
    id: string;
    session_id: string;
    role: ChatRole;
    content: string;
    message_type: ChatMessageType;
    schedules: Record<string, unknown>[] | null;
    ai_model_used: string | null;
    created_at: string;
}
export interface ChatbotSessionRow {
    id: string;
    user_id: string;
    title: string | null;
    last_message_at: string;
    created_at: string;
    updated_at: string;
}
export declare function getOrCreateActiveSession(userId: string): Promise<ChatbotSessionRow>;
export declare function getRecentMessages(sessionId: string, limit?: number): Promise<ChatbotMessageRow[]>;
export declare function appendMessage(params: {
    sessionId: string;
    role: ChatRole;
    content: string;
    messageType?: ChatMessageType;
    schedules?: Record<string, unknown>[] | null;
    aiModelUsed?: string | null;
}): Promise<ChatbotMessageRow>;
export declare function listSessionsForUser(userId: string): Promise<ChatbotSessionRow[]>;
export declare function getOwnedSession(sessionId: string, userId: string): Promise<ChatbotSessionRow>;
export declare function getSessionMessages(sessionId: string, userId: string): Promise<ChatbotMessageRow[]>;
//# sourceMappingURL=ChatbotSession.d.ts.map