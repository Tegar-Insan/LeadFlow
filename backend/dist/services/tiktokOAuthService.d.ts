export function buildAuthorizeUrl(userId: any): string;
export function verifyOAuthState(state: any): {
    userId: any;
    codeVerifier: any;
};
export function exchangeCodeForTokens(code: any, codeVerifier: any): Promise<any>;
export function fetchUserInfo(accessToken: any): Promise<{
    open_id: any;
    display_name: any;
    avatar_url: any;
    follower_count: number;
}>;
export function upsertTiktokAccount(userId: any, tokens: any, userInfo: any): Promise<void>;
export function getAccountStatusForUser(userId: any): Promise<({
    error: true;
} & "Received a generic string") | null>;
export function getConnectedAccountForUser(userId: any): Promise<{
    id: any;
    owner_user_id: any;
    connection_status: any;
    access_token_encrypted: any;
} | null>;
export function markDisconnected(userId: any, reason: any): Promise<void>;
//# sourceMappingURL=tiktokOAuthService.d.ts.map