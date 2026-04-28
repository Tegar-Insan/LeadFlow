/**
 * CalendarView.jsx
 * Dark monthly calendar — Figma-aligned
 * LeadFlow – Krench Chicken
 */
import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc       from 'dayjs/plugin/utc';
import timezone  from 'dayjs/plugin/timezone';
import isBefore  from 'dayjs/plugin/isSameOrBefore';
import { buildMonthGrid, TZ } from '../../utils/formatDate';
import { InlineLoader } from '../common/KineticLoader';

dayjs.extend(isBefore);

dayjs.extend(utc);
dayjs.extend(timezone);

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_DOT = {
  draft:     'bg-gold',
  planned:   'bg-gold',
  scheduled: 'bg-brand',
  uploaded:  'bg-brand',
  published: 'bg-success',
  failed:    'bg-red-500',
};

const DayCell = ({ cell, schedules = [], onDrop, onDayClick, onCardClick }) => {
  const [isOver, setIsOver] = useState(false);
  const visible  = schedules.slice(0, 5);
  const overflow = schedules.length - 5;

  // Past if the cell date is before today (WIB)
  const isPast = cell.iso
    ? dayjs.tz(cell.iso, TZ).startOf('day').isBefore(dayjs().tz(TZ).startOf('day'))
    : false;

  return (
    <div
      onDragOver={isPast ? undefined : e => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={isPast ? undefined : () => setIsOver(false)}
      onDrop={isPast ? undefined : e => {
        e.preventDefault(); setIsOver(false);
        const id = e.dataTransfer.getData('scheduleId');
        if (id) onDrop?.(id, cell.iso);
      }}
      onClick={isPast ? undefined : () => onDayClick?.(cell.iso)}
      className={`
        min-h-[150px] p-2 border-r border-b border-white/[0.05] flex flex-col gap-1
        transition-colors
        ${isPast && cell.isCurrentMonth ? 'calendar-past-day-cell' : ''}
        ${isPast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${!cell.isCurrentMonth ? 'bg-surface opacity-60' : (isPast ? 'bg-surface' : 'bg-surface-raised hover:bg-white/[0.03]')}
        ${cell.isToday ? '!bg-brand/[0.08]' : ''}
        ${isOver ? '!bg-brand/[0.08]' : ''}
      `}
    >
      {/* Day number */}
      <div className="flex justify-end">
        <span className={`
          w-7 h-7 flex items-center justify-center rounded-full text-sm font-headline font-bold
          ${cell.isToday
            ? 'bg-brand text-black'
            : isPast ? 'text-text-muted' : cell.isCurrentMonth ? 'text-text-primary' : 'text-text-muted'}
        `}>
          {cell.day}
        </span>
      </div>

      {/* Not Available label for past dates */}
      {isPast && cell.isCurrentMonth && (
        <div className="flex items-center justify-center flex-1 pointer-events-none">
          <span className="text-[10px] font-headline font-bold text-red-500 uppercase tracking-[0.22em]">
            Not Available
          </span>
        </div>
      )}

      {/* Schedule items */}
      <div className="space-y-0.5 flex-1">
        {!isPast && visible.map(s => {
          const dot  = STATUS_DOT[s.status] || STATUS_DOT.draft;
          const time = s.scheduled_at
            ? dayjs(s.scheduled_at).tz(TZ).format('HH:mm')
            : null;
          return (
            <div
              key={s.id}
              draggable
              onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('scheduleId', s.id); }}
              onClick={e => { e.stopPropagation(); onCardClick?.(s); }}
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-brand/40 transition-all cursor-pointer group"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[11px] text-text-primary font-body truncate font-medium flex-1">
                {time && <span className="text-text-muted mr-1">{time}</span>}
                {s.custom_caption || s.title || 'Untitled'}
              </span>
            </div>
          );
        })}
        {!isPast && overflow > 0 && (
          <p className="text-[11px] text-text-muted font-body px-1.5 py-0.5 font-medium">
            +{overflow} more
          </p>
        )}
      </div>
    </div>
  );
};

const CalendarView = ({ year, month, schedulesByDate = {}, onDrop, onDayClick, onCardClick, loading }) => {
  const grid = buildMonthGrid(year, month);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">

      {/* Weekday header */}
      <div className="grid grid-cols-7 bg-white/[0.03]">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`
            py-3 text-center text-[10px] font-headline font-bold uppercase tracking-widest border-r border-white/[0.04] last:border-r-0
            ${i >= 5 ? 'text-brand' : 'text-text-secondary'}
          `}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-surface-raised/70 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-text-secondary font-body text-sm">
              <InlineLoader size="sm" />
              Loading calendar…
            </div>
          </div>
        )}

        {grid.map(cell => (
          <DayCell
            key={cell.iso}
            cell={cell}
            schedules={schedulesByDate[cell.iso] || []}
            onDrop={onDrop}
            onDayClick={onDayClick}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
