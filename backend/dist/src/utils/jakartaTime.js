import dayjs from 'dayjs';
import "./dayjsPlugins.js";
import { utc, timezone } from "./dayjsPlugins.js";
dayjs.extend(utc);
dayjs.extend(timezone);
export const TIMEZONE = 'Asia/Jakarta';
const dayjsWithTimezone = dayjs;
export const nowJakarta = () => dayjs().tz(TIMEZONE);
export const toJakarta = (utcDate) => dayjs(utcDate).tz(TIMEZONE);
export const toJakartaISO = (utcDate) => dayjs(utcDate).tz(TIMEZONE).toISOString();
export const formatJakarta = (utcDate, format = 'DD MMMM YYYY, HH:mm [WIB]') => dayjs(utcDate).tz(TIMEZONE).format(format);
export const jakartaToUTC = (wibDateString) => dayjsWithTimezone.tz(wibDateString, TIMEZONE).utc().toDate();
export const isScheduleTimeReached = (scheduledAtUTC) => dayjs(scheduledAtUTC).isBefore(dayjs());
//# sourceMappingURL=jakartaTime.js.map