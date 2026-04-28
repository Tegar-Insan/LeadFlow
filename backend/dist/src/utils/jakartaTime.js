import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);
export const TIMEZONE = 'Asia/Jakarta';
export const nowJakarta = () => dayjs().tz(TIMEZONE);
export const toJakarta = (utcDate) => dayjs(utcDate).tz(TIMEZONE);
export const toJakartaISO = (utcDate) => dayjs(utcDate).tz(TIMEZONE).toISOString();
export const formatJakarta = (utcDate, format = 'DD MMMM YYYY, HH:mm [WIB]') => dayjs(utcDate).tz(TIMEZONE).format(format);
export const jakartaToUTC = (wibDateString) => dayjs.tz(wibDateString, TIMEZONE).utc().toDate();
export const isScheduleTimeReached = (scheduledAtUTC) => dayjs(scheduledAtUTC).isBefore(dayjs());
//# sourceMappingURL=jakartaTime.js.map