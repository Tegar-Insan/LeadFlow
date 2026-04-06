/**
 * DragDropSlot.jsx
 * A single calendar day cell — fully clickable + droppable target
 * LeadFlow – Krench Chicken
 */

import React, { useState } from 'react';
import ScheduleQueueCard from './ScheduleQueueCard';

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

  // Click on the cell background → create new schedule
  const handleCellClick = (e) => {
    // Only fire if the click was on the cell itself, not on a card
    if (e.target === e.currentTarget || e.currentTarget.contains(e.target)) {
      onDayClick?.(cell.iso);
    }
  };

  const visible  = schedules.slice(0, maxVisible);
  const overflow = schedules.length - maxVisible;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCellClick}
      className={`
        relative min-h-[100px] p-1.5 border-b border-r border-white/5
        flex flex-col gap-1 transition-colors duration-100 cursor-pointer
        ${!cell.isCurrentMonth ? 'opacity-35' : ''}
        ${cell.isToday        ? 'bg-red-950/20' : 'hover:bg-white/[0.02]'}
        ${isDragOver          ? 'bg-blue-950/30 border-blue-500/40' : ''}
      `}
    >
      {/* Day number — top right */}
      <div className="flex justify-end">
        <span
          className={`
            w-6 h-6 flex items-center justify-center rounded-full
            text-xs font-semibold pointer-events-none
            ${cell.isToday
              ? 'bg-red-500 text-white'
              : 'text-zinc-400'}
          `}
        >
          {cell.day}
        </span>
      </div>

      {/* Schedule cards — stop propagation so click on card doesn't open create modal */}
      {visible.map((s) => (
        <div key={s.id} onClick={(e) => { e.stopPropagation(); onCardClick?.(s); }}>
          <ScheduleQueueCard
            schedule={s}
            isDragging={draggingId === s.id}
            compact
          />
        </div>
      ))}

      {/* Overflow */}
      {overflow > 0 && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-zinc-400 px-1"
        >
          +{overflow} more
        </span>
      )}

      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-0 rounded border-2 border-dashed border-blue-400/50 pointer-events-none" />
      )}
    </div>
  );
};

export default DragDropSlot;