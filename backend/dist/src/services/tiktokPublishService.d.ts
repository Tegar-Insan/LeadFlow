export declare function publishScheduledContent(scheduleId: any): Promise<{
    success: boolean;
    status: string;
    message: string;
    publishId?: never;
    uploadUrl?: never;
    mode?: never;
} | {
    success: boolean;
    status: string;
    message: string;
    publishId: any;
    uploadUrl: any;
    mode: string;
} | {
    success: boolean;
    status: string;
    message: any;
    publishId: any;
    uploadUrl: any;
    mode?: never;
}>;
export declare function publishNowBySchedule(scheduleId: any): Promise<{
    success: boolean;
    status: string;
    message: string;
    publishId?: never;
    uploadUrl?: never;
    mode?: never;
} | {
    success: boolean;
    status: string;
    message: string;
    publishId: any;
    uploadUrl: any;
    mode: string;
} | {
    success: boolean;
    status: string;
    message: any;
    publishId: any;
    uploadUrl: any;
    mode?: never;
}>;
//# sourceMappingURL=tiktokPublishService.d.ts.map