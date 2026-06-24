import { useState, useRef, useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import TikTokLoginButton from './TikTokLoginButton';
import Notification from './Notification';
import ViewModeToggle from '../Schedule/ViewModeToggle';

const POST_FILTER_OPTIONS = [
  { key: 'allpost',   label: 'All Post'  },
  { key: 'drafts',    label: 'Drafts'    },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
];

const YELLOW = '#f6b70a';

interface CalendarNavbarProps {
  view: string;
  year: number;
  month: number;
  weekLabel: string;
  selectedDay: Dayjs;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: string) => void;
  onModeChange: (mode: 'grid' | 'list') => void;
  postFilter: string;
  onFilterChange: (f: string) => void;
  allPostCount: number;
  draftCount: number;
  scheduledCount: number;
  publishedCount: number;
  canEdit: boolean;
  onNewPost: () => void;
  onGenerateIdea: () => void;
  tiktokStatus: any;
  tiktokLoading: boolean;
  onConnectTikTok: () => void;
  onDisconnectTikTok: () => void;
  onProfile: () => void;
  onMenuToggle?: () => void;
}

export default function CalendarNavbar({
  view, year, month, weekLabel, selectedDay,
  onPrev, onNext, onToday, onViewChange, onModeChange,
  postFilter, onFilterChange,
  allPostCount, draftCount, scheduledCount, publishedCount,
  canEdit, onNewPost, onGenerateIdea,
  tiktokStatus, tiktokLoading, onConnectTikTok, onDisconnectTikTok,
  onProfile, onMenuToggle,
}: CalendarNavbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentFilter = POST_FILTER_OPTIONS.find(o => o.key === postFilter) ?? POST_FILTER_OPTIONS[0]!;
  const currentFilterCount =
    postFilter === 'allpost'   ? allPostCount :
    postFilter === 'drafts'    ? draftCount :
    postFilter === 'scheduled' ? scheduledCount :
    publishedCount;

  const countForOption = (key: string) =>
    key === 'allpost' ? allPostCount :
    key === 'drafts'  ? draftCount :
    key === 'scheduled' ? scheduledCount :
    publishedCount;

  const dateLabel =
    view === 'week' ? weekLabel :
    view === 'day'  ? selectedDay.format('dddd, MMMM D, YYYY') :
    dayjs(new Date(year, month - 1)).format('MMMM YYYY');

  return (
    <header className="calendar-topbar relative z-40 flex items-center min-w-0 gap-1.5 sm:gap-2 lg:gap-3 px-2.5 sm:px-3.5 lg:px-5 py-2 lg:py-3 flex-shrink-0">

      {/* Mobile menu toggle */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {/* Filter (icon-only) */}
      <div className="relative z-50 flex-shrink-0" ref={filterRef}>
        <button
          type="button"
          onClick={() => setIsFilterOpen(prev => !prev)}
          className="toolbar-pill relative w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex-shrink-0 flex items-center justify-center"
          title={`Filter: ${currentFilter.label} (${currentFilterCount})`}
          aria-label="Filter posts"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7.5 9v6l-3 1.5v-7.5L3 4.5z" />
          </svg>
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-400 text-black text-[9px] font-bold flex items-center justify-center leading-none">
            {currentFilterCount}
          </span>
        </button>

        {isFilterOpen && (
          <div className="absolute top-full left-0 mt-2 min-w-[160px] bg-white border border-slate-300 rounded-xl shadow-lg z-[70] overflow-hidden">
            {POST_FILTER_OPTIONS.map(item => {
              const active = postFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { onFilterChange(item.key); setIsFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-body font-semibold flex items-center justify-between transition-colors ${
                    active ? 'bg-amber-100 text-amber-800' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`inline-flex min-w-4 h-4 px-1 rounded-full items-center justify-center text-[10px] ${
                    active ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {countForOption(item.key)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center min-w-0 gap-1 sm:gap-1.5 lg:gap-2 ml-auto">

        {/* Today */}
        <button
          onClick={onToday}
          className="toolbar-pill px-2 sm:px-3 lg:px-4 h-7 sm:h-8 lg:h-9 text-[10px] sm:text-[11px] lg:text-xs font-body font-semibold transition-colors hover:bg-slate-50 flex-shrink-0 whitespace-nowrap"
        >
          Today
        </button>

        {/* View-mode group: Day/Week/Month + Calendar/List */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <div className="flex items-center rounded-full p-0.5 border border-slate-300 bg-white">
            {['Day', 'Week', 'Month'].map(v => (
              <button
                key={v}
                onClick={() => onViewChange(v.toLowerCase())}
                className={`px-1.5 sm:px-2.5 lg:px-3 h-6 sm:h-7 lg:h-8 rounded-full text-[10px] sm:text-[11px] lg:text-xs font-body font-semibold transition-all whitespace-nowrap ${
                  view === v.toLowerCase()
                    ? 'toolbar-pill-active'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <ViewModeToggle currentMode="grid" onModeChange={onModeChange} />
        </div>

        {/* Date-nav group: prev / date / next, kept as one tight unit */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-1 sm:ml-2 lg:ml-3">
          <button
            onClick={onPrev}
            className="toolbar-pill w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 flex items-center justify-center transition-colors hover:bg-slate-50 flex-shrink-0"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-[10px] sm:text-sm lg:text-base font-body font-semibold text-slate-900 text-center tracking-wide truncate px-1 min-w-[70px] sm:min-w-[120px] lg:min-w-[160px]">
            {dateLabel}
          </span>

          <button
            onClick={onNext}
            className="toolbar-pill w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 flex items-center justify-center transition-colors hover:bg-slate-50 flex-shrink-0"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Notifications */}
        <Notification />

        {/* TikTok connect button */}
        {canEdit && (
          <div className="flex-shrink-0">
            <TikTokLoginButton
              connected={!!tiktokStatus}
              needsReconnect={tiktokStatus?.needs_reconnect === true}
              accountName={tiktokStatus?.tiktok_display_name || tiktokStatus?.tiktok_account_name}
              onConnect={onConnectTikTok}
              onDisconnect={onDisconnectTikTok}
              loading={tiktokLoading}
            />
          </div>
        )}

        {/* Generate ideas */}
        {canEdit && (
          <button
            onClick={onGenerateIdea}
            style={{ background: YELLOW, borderColor: YELLOW }}
            className="h-7 sm:h-8 lg:h-9 px-2.5 sm:px-3 lg:px-4 rounded-full border text-white text-[10px] sm:text-[11px] lg:text-xs font-headline font-bold transition-colors hover:opacity-90 shadow-[0_8px_16px_rgba(246,183,10,0.25)] flex-shrink-0 whitespace-nowrap"
            title="Generate ideas"
          >
            Generate ideas
          </button>
        )}

        {/* New Post */}
        {canEdit && (
          <button
            onClick={onNewPost}
            style={{ background: YELLOW, borderColor: YELLOW }}
            className="h-7 sm:h-8 lg:h-9 px-2.5 sm:px-3 lg:px-4 rounded-full border text-white text-[10px] sm:text-[11px] lg:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors hover:opacity-90 shadow-[0_8px_16px_rgba(246,183,10,0.25)] flex-shrink-0 whitespace-nowrap"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </button>
        )}
      </div>
    </header>
  );
}
