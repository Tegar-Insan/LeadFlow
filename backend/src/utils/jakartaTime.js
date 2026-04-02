// src/utils/jakartaTime.js
// Dayjs GMT+7 (Asia/Jakarta / WIB) timezone utility
// All scheduled content times are stored in UTC and displayed in Jakarta time

const dayjs = require('dayjs');
const utc      = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const JAKARTA_TZ = 'Asia/Jakarta';

/**
 * Get current Jakarta time as a dayjs object
 */
function nowJakarta() {
  return dayjs().tz(JAKARTA_TZ);
}

/**
 * Convert a UTC date string or Date to Jakarta dayjs
 * @param {string|Date} date
 */
function toJakarta(date) {
  return dayjs(date).tz(JAKARTA_TZ);
}

/**
 * Format a date in Jakarta timezone
 * @param {string|Date} date
 * @param {string} fmt  - dayjs format string
 */
function formatJakarta(date, fmt = 'YYYY-MM-DD HH:mm:ss') {
  return toJakarta(date).format(fmt);
}

/**
 * Convert a Jakarta local time string to UTC ISO string for DB storage
 * @param {string} jakartaDateStr - e.g. "2025-08-15 14:30:00"
 */
function jakartaToUTC(jakartaDateStr) {
  return dayjs.tz(jakartaDateStr, JAKARTA_TZ).utc().toISOString();
}

/**
 * Check if a UTC scheduled time has passed (is due for publishing)
 * @param {string} scheduledUtc - UTC ISO string from DB
 */
function isDue(scheduledUtc) {
  return dayjs().utc().isAfter(dayjs(scheduledUtc).utc());
}

module.exports = { JAKARTA_TZ, nowJakarta, toJakarta, formatJakarta, jakartaToUTC, isDue };
