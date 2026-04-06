/**
 * jakartaTime.js
 * GMT+7 (WIB / Asia/Jakarta) time utilities using dayjs
 * All DB timestamps are stored UTC; this converts for display/logic
 * LeadFlow – Krench Chicken
 */

const dayjs = require('dayjs');
const utc   = require('dayjs/plugin/utc');
const tz    = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(tz);

const TIMEZONE = 'Asia/Jakarta';

/**
 * Current time in WIB as dayjs object
 */
const nowJakarta = () => dayjs().tz(TIMEZONE);

/**
 * Convert a UTC date/string to WIB dayjs object
 */
const toJakarta = (utcDate) => dayjs(utcDate).tz(TIMEZONE);

/**
 * Convert a UTC date/string to WIB ISO string
 */
const toJakartaISO = (utcDate) => dayjs(utcDate).tz(TIMEZONE).toISOString();

/**
 * Format a UTC date to human readable WIB string
 * e.g. "04 April 2026, 14:30 WIB"
 */
const formatJakarta = (utcDate, format = 'DD MMMM YYYY, HH:mm [WIB]') => {
  return dayjs(utcDate).tz(TIMEZONE).format(format);
};

/**
 * Convert a WIB datetime string to UTC for DB storage
 * Input: "2026-04-04T14:30:00" (assumed WIB)
 * Output: UTC Date object
 */
const jakartaToUTC = (wibDateString) => {
  return dayjs.tz(wibDateString, TIMEZONE).utc().toDate();
};

/**
 * Check if a scheduled_at (UTC) has passed WIB "now"
 */
const isScheduleTimeReached = (scheduledAtUTC) => {
  return dayjs(scheduledAtUTC).isBefore(dayjs());
};

module.exports = {
  TIMEZONE,
  nowJakarta,
  toJakarta,
  toJakartaISO,
  formatJakarta,
  jakartaToUTC,
  isScheduleTimeReached,
};