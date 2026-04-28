export const TIMEZONE: "Asia/Jakarta";
/**
 * Current time in WIB as dayjs object
 */
export function nowJakarta(): dayjs.Dayjs;
/**
 * Convert a UTC date/string to WIB dayjs object
 */
export function toJakarta(utcDate: any): dayjs.Dayjs;
/**
 * Convert a UTC date/string to WIB ISO string
 */
export function toJakartaISO(utcDate: any): string;
/**
 * Format a UTC date to human readable WIB string
 * e.g. "04 April 2026, 14:30 WIB"
 */
export function formatJakarta(utcDate: any, format?: string): string;
/**
 * Convert a WIB datetime string to UTC for DB storage
 * Input: "2026-04-04T14:30:00" (assumed WIB)
 * Output: UTC Date object
 */
export function jakartaToUTC(wibDateString: any): Date;
/**
 * Check if a scheduled_at (UTC) has passed WIB "now"
 */
export function isScheduleTimeReached(scheduledAtUTC: any): boolean;
import dayjs = require("dayjs");
//# sourceMappingURL=jakartaTime.d.ts.map