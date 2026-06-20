export declare function create({ promptText, userId }: {
    promptText: string;
    userId: string;
}): Promise<{
    id: string;
}>;
export declare function findById(promptId: string, userId: string): Promise<Record<string, unknown> | null>;
export declare function listByUser(userId: string): Promise<unknown[]>;
//# sourceMappingURL=Prompt.d.ts.map