import dayjs from 'dayjs';
import './dayjsPlugins.ts';
import { utc, timezone } from './dayjsPlugins.ts';
import type { Dayjs } from 'dayjs';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TIMEZONE = 'Asia/Jakarta';

const dayjsWithTimezone = dayjs as typeof dayjs & {
  tz: (date: string | Date | number, timezone: string) => Dayjs;
};

export const nowJakarta = (): Dayjs => (dayjs as any)().tz(TIMEZONE);

export const toJakarta = (utcDate: string | Date | number): Dayjs => (dayjs as any)(utcDate).tz(TIMEZONE);

export const toJakartaISO = (utcDate: string | Date | number): string =>
  (dayjs as any)(utcDate).tz(TIMEZONE).toISOString();

export const formatJakarta = (
  utcDate: string | Date | number,
  format = 'DD MMMM YYYY, HH:mm [WIB]',
): string => (dayjs(utcDate) as any).tz(TIMEZONE).format(format);

export const jakartaToUTC = (wibDateString: string): Date =>
  (dayjsWithTimezone.tz(wibDateString, TIMEZONE) as any).utc().toDate();

export const isScheduleTimeReached = (scheduledAtUTC: string | Date | number): boolean =>
  dayjs(scheduledAtUTC).isBefore(dayjs());
