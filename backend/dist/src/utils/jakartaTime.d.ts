import type { Dayjs } from 'dayjs';
export declare const TIMEZONE = "Asia/Jakarta";
export declare const nowJakarta: () => Dayjs;
export declare const toJakarta: (utcDate: string | Date | number) => Dayjs;
export declare const toJakartaISO: (utcDate: string | Date | number) => string;
export declare const formatJakarta: (utcDate: string | Date | number, format?: string) => string;
export declare const jakartaToUTC: (wibDateString: string) => Date;
export declare const isScheduleTimeReached: (scheduledAtUTC: string | Date | number) => boolean;
//# sourceMappingURL=jakartaTime.d.ts.map