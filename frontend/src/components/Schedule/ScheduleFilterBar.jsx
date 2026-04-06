/**
 * ScheduleFilterBar.jsx
 * Month navigation + view filters for the Calendar
 * LeadFlow – Krench Chicken
 */

import React from 'react';
import { fMonthYear } from '../../utils/formatDate';

const ScheduleFilterBar = ({
  year, month,
  onPrev, onNext, onToday,
  onCreateNew,
  view, setView,
  loading,
}) => {
  const displayDate = new Date(year, month - 1, 1);

  return (
    <div className="flex items-center justify-between gap-3 mb-4">

      {/* Left: navigation */}
      <div className="flex items-center gap-2">
        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors disabled:opacity-40"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Month / Year */}
        <h2 className="font-syne font-bold text-lg text-white min-w-[160px] text-center">
          {fMonthYear(displayDate)}
        </h2>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors disabled:opacity-40"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Today */}
        <button
          onClick={onToday}
          className="px-3 h-8 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-white/5"
        >
          Today
        </button>
      </div>

      {/* Right: view toggle + new button */}
      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-white/5">
          {['month', 'week', 'list'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 h-7 rounded-md text-xs font-semibold transition-all duration-150
                ${view === v
                  ? 'bg-zinc-700 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* New schedule */}
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1.5 px-4 h-8 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-red-900/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>
    </div>
  );
};

export default ScheduleFilterBar;