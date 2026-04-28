export function getDueSchedules(limit?: number): Promise<{
    id: any;
    scheduled_at: any;
    status: any;
    auto_publish: any;
    tiktok_account_id: any;
}[]>;
export function runAutoPublishBatch(limit?: number): Promise<{
    checked: number;
    published: number;
    failed: number;
    results: ({
        scheduleId: any;
        status: string;
        reason: string;
        publishId?: never;
        mode?: never;
    } | {
        scheduleId: any;
        status: string;
        reason: any;
        publishId: any;
        mode: any;
    })[];
}>;
//# sourceMappingURL=publishService.d.ts.map