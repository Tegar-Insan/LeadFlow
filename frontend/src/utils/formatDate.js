// src/utils/formatDate.js
// GMT+7 Jakarta (WIB) timezone date formatting using dayjs

import dayjs from 'dayjs';
import utc      from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export const JAKARTA_TZ = 'Asia/Jakarta';

/** Current time in Jakarta */
export const nowJakarta = () => dayjs().tz(JAKARTA_TZ);

/** Convert any date to Jakarta dayjs object */
export const toJakarta = (date) => dayjs(date).tz(JAKARTA_TZ);

/** Format a date in Jakarta time
 *  @param {string|Date} date
 *  @param {string} fmt  e.g. 'DD MMM YYYY · HH:mm [WIB]'
 */
export function formatJakarta(date, fmt = 'DD MMM YYYY · HH:mm') {
  return toJakarta(date).format(fmt);
}

/** Format as "2 hours ago" etc. in Jakarta context */
export const fromNowJakarta = (date) => toJakarta(date).fromNow();

/** Get greeting based on Jakarta hour */
export function getGreeting() {
  const hour = nowJakarta().hour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Format for display in schedule slots: "08:30 WIB" */
export const formatTime = (date) => toJakarta(date).format('HH:mm [WIB]');

/** Format for calendar header: "Monday, 15 January 2025" */
export const formatCalendarDate = (date) => toJakarta(date).format('dddd, DD MMMM YYYY');

/** Short date: "15 Jan" */
export const formatShort = (date) => toJakarta(date).format('DD MMM');

