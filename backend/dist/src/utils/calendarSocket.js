// calendarSocket.ts
// Broadcast calendar mutation events to business_owner clients via socket.io.
// Call broadcastCalendarUpdate after any schedule create/update/move/delete/publish.
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'Asia/Jakarta';
export function broadcastCalendarUpdate(io, year, month) {
    io.to('calendar:updates').emit('calendar:updated', { year, month });
}
// Derive year/month from a scheduled_at ISO string (UTC).
// Falls back to the current WIB month when scheduledAt is absent.
export function broadcastCalendarUpdateFromDate(io, scheduledAt) {
    const d = scheduledAt
        ? dayjs(scheduledAt).tz(TZ)
        : dayjs().tz(TZ);
    broadcastCalendarUpdate(io, d.year(), d.month() + 1);
}
//# sourceMappingURL=calendarSocket.js.map