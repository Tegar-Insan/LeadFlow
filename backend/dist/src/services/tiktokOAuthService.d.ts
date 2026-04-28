export declare function verifyOAuthState(state: string): {
    userId: string;
    codeVerifier: string;
};
export declare function buildAuthorizeUrl(userId: string): string;
export declare function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<Record<string, unknown>>;
export declare function fetchUserInfo(accessToken: string): Promise<Record<string, unknown>>;
export declare function upsertTiktokAccount(userId: string, tokens: Record<string, unknown>, userInfo: Record<string, unknown>): Promise<void>;
export declare function getAccountStatusForUser(userId: string): Promise<Record<string, unknown> | null>;
export declare function getConnectedAccountForUser(userId: string): Promise<Record<string, unknown> | null>;
export declare function markDisconnected(userId: string, reason: string): Promise<void>;
//# sourceMappingURL=tiktokOAuthService.d.ts.map