export declare const TIKTOK_CONFIG: {
    readonly clientKey: string;
    readonly clientSecret: string;
    readonly redirectUri: string;
    readonly frontendUrl: string;
    readonly mediaPublicBaseUrl: string;
    readonly authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/";
    readonly tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/";
    readonly userInfoUrl: "https://open.tiktokapis.com/v2/user/info/";
    readonly publishVideoInitUrl: "https://open.tiktokapis.com/v2/post/publish/video/init/";
    readonly publishInboxVideoInitUrl: "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
    readonly publishPhotoInitUrl: "https://open.tiktokapis.com/v2/post/publish/content/init/";
    readonly publishStatusFetchUrl: "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
    readonly scopes: "user.info.profile,user.info.stats,video.publish,video.upload,video.list";
};
export declare function validateTikTokConfig(): void;
//# sourceMappingURL=tiktok.d.ts.map