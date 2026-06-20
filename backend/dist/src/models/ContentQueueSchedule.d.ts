type ScheduleRow = Record<string, unknown>;
export declare const getSchedulesByMonth: (year: number, month: number) => Promise<ScheduleRow[]>;
export declare const getDraftSchedules: () => Promise<ScheduleRow[]>;
export declare const getScheduleById: (id: string) => Promise<ScheduleRow | null>;
export declare const createSchedule: ({ idea_id, created_by, title, description, caption, hashtags, scheduled_at, status, priority, }: {
    idea_id?: string | null;
    created_by: string;
    title?: string;
    description?: string | null | undefined;
    caption?: string | null | undefined;
    hashtags?: string[];
    scheduled_at?: string | null;
    status?: string | null;
    priority?: number;
}) => Promise<ScheduleRow>;
export declare const updateSchedule: (id: string, updates: Record<string, unknown>) => Promise<ScheduleRow>;
export declare const moveSchedule: (id: string, newScheduledAt: string) => Promise<ScheduleRow>;
export declare const deleteSchedule: (id: string) => Promise<void>;
export declare const getSchedulesForListView: (userId: string, filter: "day" | "week" | "month", dateStr: string) => Promise<ScheduleRow[]>;
export {};
//# sourceMappingURL=ContentQueueSchedule.d.ts.map