/**
 * formatDate.js
 * Frontend date utilities — all display in WIB (GMT+7 / Asia/Jakarta)
 * LeadFlow – Krench Chicken
 */

import dayjs from 'dayjs';
import utc   from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter  from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export const TZ = 'Asia/Jakarta';

/** Current time in WIB */
export const nowWIB = () => dayjs().tz(TZ);

/** Parse any date/UTC string → WIB dayjs */
export const toWIB = (date) => dayjs(date).tz(TZ);

/** Format for calendar cell header: "04" */
export const fDay = (date) => dayjs(date).tz(TZ).format('D');

/** "April 2026" */
export const fMonthYear = (date) => dayjs(date).tz(TZ).format('MMMM YYYY');

/** "04 Apr 2026" */
export const fShortDate = (date) => dayjs(date).tz(TZ).format('DD MMM YYYY');

/** "04 April 2026, 14:30 WIB" */
export const fLongDateTime = (date) =>
  dayjs(date).tz(TZ).format('DD MMMM YYYY, HH:mm [WIB]');

/** "14:30 WIB" */
export const fTime = (date) => dayjs(date).tz(TZ).format('HH:mm [WIB]');

/** "Thursday" */
export const fDayName = (date) => dayjs(date).tz(TZ).format('dddd');

/** ISO string for an input[type=datetime-local] value (WIB, no tz suffix) */
export const toDatetimeLocal = (date) =>
  dayjs(date).tz(TZ).format('YYYY-MM-DDTHH:mm');

/**
 * Build a WIB-aware datetime from a local datetime-input string
 * and return UTC ISO for API submission
 */
export const datetimeLocalToUTCiso = (localStr) =>
  dayjs.tz(localStr, TZ).utc().toISOString();

/** All dates in a calendar month grid (42 cells, Mon start) */
export const buildMonthGrid = (year, month) => {
  // month is 1-indexed
  const firstDay = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, TZ);
  // Monday = 1 in dayjs (0=Sun), adjust for Mon-start grid
  const startPad  = (firstDay.day() + 6) % 7; // days from Monday
  const daysInMonth = firstDay.daysInMonth();
  const totalCells  = Math.ceil((startPad + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const date = firstDay.subtract(startPad - i, 'day');
    cells.push({
      date:        date.toDate(),
      iso:         date.format('YYYY-MM-DD'),
      day:         date.date(),
      isCurrentMonth: date.month() + 1 === month,
      isToday:     date.isSame(nowWIB(), 'day'),
    });
  }
  return cells;
};

/** Check if two dates are same calendar day in WIB */
export const isSameDay = (a, b) =>
  dayjs(a).tz(TZ).isSame(dayjs(b).tz(TZ), 'day');

/** Is the date in the past (WIB)? */
export const isPast = (date) => dayjs(date).tz(TZ).isBefore(nowWIB());