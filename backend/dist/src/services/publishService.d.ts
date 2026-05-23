type PublishResult = {
    scheduleId: string;
    status: 'published' | 'failed';
    reason?: string | undefined;
    publishId?: string | undefined;
    mode?: string | undefined;
};
type ScheduleRow = {
    id: string;
    scheduled_at: string;
    status: string;
    auto_publish: boolean;
    tiktok_account_id: string | null;
};
export declare function getDueSchedules(limit?: number): Promise<ScheduleRow[]>;
export declare function runAutoPublishBatch(limit?: number): Promise<{
    checked: number;
    published: number;
    failed: number;
    results: PublishResult[];
}>;
export {};
//# sourceMappingURL=publishService.d.ts.map