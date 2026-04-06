/**
 * CalendarView.jsx
 * Clean white monthly calendar — Google Calendar style
 * LeadFlow – Krench Chicken
 */
import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc      from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { buildMonthGrid, TZ } from '../../utils/formatDate';

dayjs.extend(utc);
dayjs.extend(timezone);

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_DOT = {
  draft:     'bg-zinc-400',
  planned:   'bg-blue-400',
  scheduled: 'bg-pink-500',
  uploaded:  'bg-purple-500',
  published: 'bg-emerald-500',
  failed:    'bg-red-500',
};

const DayCell = ({ cell, schedules = [], onDrop, onDayClick, onCardClick }) => {
  const [isOver, setIsOver] = useState(false);
  const visible  = schedules.slice(0, 3);
  const overflow = schedules.length - 3;

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={e => {
        e.preventDefault(); setIsOver(false);
        const id = e.dataTransfer.getData('scheduleId');
        if (id) onDrop?.(id, cell.iso);
      }}
      onClick={() => onDayClick?.(cell.iso)}
      className={`
        min-h-[110px] p-2 border-r border-b border-zinc-200 flex flex-col gap-1
        cursor-pointer transition-colors
        ${!cell.isCurrentMonth ? 'bg-zinc-50' : 'bg-white hover:bg-zinc-50'}
        ${cell.isToday ? '!bg-pink-50' : ''}
        ${isOver ? '!bg-blue-50' : ''}
      `}
    >
      {/* Day number */}
      <div className="flex justify-end">
        <span className={`
          w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
          ${cell.isToday
            ? 'bg-pink-500 text-white'
            : cell.isCurrentMonth ? 'text-zinc-700' : 'text-zinc-300'}
        `}>
          {cell.day}
        </span>
      </div>

      {/* Schedule items */}
      <div className="space-y-0.5 flex-1" onClick={e => e.stopPropagation()}>
        {visible.map(s => {
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
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-white border border-zinc-100 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[11px] text-zinc-700 truncate font-medium flex-1">
                {time && <span className="text-zinc-400 mr-1">{time}</span>}
                {s.custom_caption || s.title || 'Untitled'}
              </span>
            </div>
          );
        })}
        {overflow > 0 && (
          <p className="text-[11px] text-zinc-400 px-1.5 py-0.5 font-medium">
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
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-zinc-200 bg-white shadow-sm">

      {/* Weekday header */}
      <div className="grid grid-cols-7 bg-white border-b border-zinc-200">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`
            py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-zinc-100 last:border-r-0
            ${i >= 5 ? 'text-pink-400' : 'text-zinc-400'}
          `}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
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