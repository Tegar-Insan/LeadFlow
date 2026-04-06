/**
 * WeeklyCalendarView.jsx
 * Time-slot weekly/day grid with drag & drop
 * LeadFlow – Krench Chicken
 */
import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc      from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { SlotCard } from './ContentCard';
import { TZ } from '../../utils/formatDate';

dayjs.extend(utc);
dayjs.extend(timezone);

const HOURS    = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00–22:00
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WeeklyCalendarView = ({
  weekStart,        // dayjs — Monday WIB
  schedulesByDate,
  onDrop,
  onSlotClick,
  onCardClick,
  loading,
  mode = 'week',    // 'week' | 'day'
  selectedDay,      // dayjs — used in day mode
}) => {
  const [dragOverKey, setDragOverKey] = useState(null);
  const now = dayjs().tz(TZ);

  // Build day columns
  const days = mode === 'day'
    ? [{ dayjs: selectedDay || weekStart, iso: (selectedDay || weekStart).format('YYYY-MM-DD'), label: (selectedDay || weekStart).format('ddd'), date: (selectedDay || weekStart).date(), isToday: (selectedDay || weekStart).isSame(now, 'day') }]
    : Array.from({ length: 7 }, (_, i) => {
        const d = weekStart.add(i, 'day');
        return { dayjs: d, iso: d.format('YYYY-MM-DD'), label: DAY_KEYS[i], date: d.date(), isToday: d.isSame(now, 'day') };
      });

  const getSlotSchedules = (dateISO, hour) =>
    (schedulesByDate[dateISO] || []).filter(s => {
      if (!s.scheduled_at) return false;
      return dayjs(s.scheduled_at).tz(TZ).hour() === hour;
    });

  const isPast = (dateISO, hour) =>
    dayjs.tz(`${dateISO} ${String(hour).padStart(2,'0')}:00`, TZ).isBefore(now);

  const cellKey = (iso, hour) => `${iso}-${hour}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className="flex border-b border-zinc-200 bg-white flex-shrink-0">
        <div className="w-16 flex-shrink-0 border-r border-zinc-200" />
        {days.map(day => (
          <div key={day.iso}
            className={`flex-1 py-3 text-center border-r border-zinc-200 last:border-r-0 ${day.isToday ? 'bg-pink-50' : ''}`}>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{day.label}</p>
            <p className={`text-2xl font-bold mt-0.5 leading-none ${day.isToday ? 'text-pink-500' : 'text-zinc-800'}`}>
              {day.date}
            </p>
          </div>
        ))}
      </div>

      {/* Scrollable time rows */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="flex border-b border-zinc-100" style={{ minHeight: '100px' }}>
            {/* Time label */}
            <div className="w-16 flex-shrink-0 border-r border-zinc-200 flex items-start justify-end pr-2 pt-2">
              <span className="text-[11px] font-medium text-zinc-400">
                {String(hour).padStart(2,'0')}:00
              </span>
            </div>

            {/* Day cells */}
            {days.map(day => {
              const key       = cellKey(day.iso, hour);
              const past      = isPast(day.iso, hour);
              const isOver    = dragOverKey === key;
              const slotCards = getSlotSchedules(day.iso, hour);
              const isEmpty   = slotCards.length === 0;

              return (
                <div key={key}
                  onDragOver={e => { if (!past) { e.preventDefault(); setDragOverKey(key); }}}
                  onDragLeave={() => setDragOverKey(null)}
                  onDrop={e => { e.preventDefault(); setDragOverKey(null); const id = e.dataTransfer.getData('scheduleId'); if (id && !past) onDrop?.(id, day.iso, hour); }}
                  onClick={() => { if (!past && isEmpty) onSlotClick?.(day.iso, hour); }}
                  className={`
                    flex-1 border-r border-zinc-100 last:border-r-0 p-2 relative transition-colors duration-100
                    ${day.isToday ? 'bg-pink-50/30' : ''}
                    ${isOver ? 'bg-blue-50' : ''}
                    ${!past && isEmpty ? 'cursor-pointer hover:bg-zinc-50 group' : ''}
                    ${past && isEmpty ? 'cursor-default' : ''}
                  `}
                >
                  {/* Past empty */}
                  {past && isEmpty && (
                    <div className="flex items-center justify-center h-full min-h-[76px]">
                      <span className="text-[10px] text-zinc-300 font-medium select-none">Past time slot</span>
                    </div>
                  )}

                  {/* Future empty — + on hover */}
                  {!past && isEmpty && (
                    <div className="flex items-center justify-center h-full min-h-[76px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center">
                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Cards */}
                  <div className="space-y-2">
                    {slotCards.map(s => (
                      <SlotCard key={s.id} schedule={s} onClick={onCardClick} />
                    ))}
                  </div>

                  {/* Drop highlight */}
                  {isOver && (
                    <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendarView;