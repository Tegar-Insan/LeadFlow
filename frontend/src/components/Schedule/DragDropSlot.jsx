/**
 * DragDropSlot.jsx
 * A single calendar day cell — fully clickable + droppable target
 * Krench Chicken
 */

import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import ScheduleQueueCard from './ScheduleQueueCard';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'Asia/Jakarta';

const DragDropSlot = ({
  cell,
  schedules = [],
  onDrop,
  onDayClick,
  onCardClick,
  draggingId,
  maxVisible = 3,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const id = e.dataTransfer.getData('scheduleId');
    if (id) onDrop?.(id, cell.iso);
  };

  // Click on the cell background → create new schedule.
  // MUST check e.target === e.currentTarget so that clicks on child card elements
  // (which call stopPropagation) don't accidentally trigger schedule creation.
  // The old `e.currentTarget.contains(e.target)` was always true and would fire
  // even when stopPropagation was skipped on any non-card child element.
  const handleCellClick = (e) => {
    if (e.target === e.currentTarget) {
      onDayClick?.(cell.iso);
    }
  };

  const visible  = schedules.slice(0, maxVisible);
  const overflow = schedules.length - maxVisible;

  // Determine if this cell is in the past (before today WIB)
  const isPast = cell.iso
    ? dayjs.tz(cell.iso, TZ).startOf('day').isBefore(dayjs().tz(TZ).startOf('day'))
    : false;

  return (
    <div
      onDragOver={isPast ? undefined : handleDragOver}
      onDragLeave={isPast ? undefined : handleDragLeave}
      onDrop={isPast ? undefined : handleDrop}
      onClick={isPast ? undefined : handleCellClick}
      className={`
        relative min-h-[100px] p-1.5 border-b border-r border-white/5
        flex flex-col gap-1 transition-colors duration-100
        ${isPast ? 'cursor-not-allowed opacity-50 bg-surface/60' : 'cursor-pointer'}
        ${!cell.isCurrentMonth ? 'opacity-35' : ''}
        ${cell.isToday        ? 'bg-amber-950/20' : (!isPast ? 'hover:bg-white/[0.02]' : '')}
        ${isDragOver          ? 'bg-brand/10 border-brand/40' : ''}
      `}
    >
      {/* Day number — top right */}
      <div className="flex justify-end">
        <span
          className={`
            w-6 h-6 flex items-center justify-center rounded-full
            text-xs font-semibold pointer-events-none
            ${cell.isToday
              ? 'bg-brand text-black'
              : isPast ? 'text-zinc-600' : 'text-zinc-400'}
          `}
        >
          {cell.day}
        </span>
      </div>

      {/* Not Available overlay for past dates */}
      {isPast && (
        <div className="flex items-center justify-center flex-1 pointer-events-none">
          <span className="text-[9px] font-body font-semibold text-zinc-600 uppercase tracking-wider">
            Not Available
          </span>
        </div>
      )}

      {/* Schedule cards — stop propagation so click on card doesn't open create modal */}
      {!isPast && visible.map((s) => (
        <div key={s.id} onClick={(e) => { e.stopPropagation(); onCardClick?.(s); }}>
          <ScheduleQueueCard
            schedule={s}
            isDragging={draggingId === s.id}
            compact
          />
        </div>
      ))}

      {/* Overflow */}
      {!isPast && overflow > 0 && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-zinc-400 px-1"
        >
          +{overflow} more
        </span>
      )}

      {/* Drop indicator */}
      {isDragOver && !isPast && (
        <div className="absolute inset-0 rounded border-2 border-dashed border-brand/50 pointer-events-none" />
      )}
    </div>
  );
};

export default DragDropSlot;