import { useState, useRef, useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import TikTokLoginButton from './TikTokLoginButton';
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
    <header className="calendar-topbar relative z-40 flex items-center gap-3 px-5 py-3 flex-shrink-0">

      {/* Mobile menu toggle */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-600 hover:text-slate-900 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {/* Page title */}
      <div className="hidden md:block">
        <p className="calendar-title text-xs font-body font-semibold uppercase tracking-[0.28em]">
          Marketing Calendar
        </p>
      </div>

      {/* Filter dropdown */}
      <div className="relative z-50 ml-2" ref={filterRef}>
        <button
          type="button"
          onClick={() => setIsFilterOpen(prev => !prev)}
          className="toolbar-pill px-4 h-9 text-xs font-body font-semibold inline-flex items-center gap-2"
          title="Filter posts"
        >
          <span>{currentFilter.label}</span>
          <span className="inline-flex min-w-4 h-4 px-1 rounded-full items-center justify-center text-[10px] bg-slate-100 text-slate-600">
            {currentFilterCount}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
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
      <div className="flex items-center gap-2 ml-auto">

        {/* Today */}
        <button
          onClick={onToday}
          className="toolbar-pill px-4 h-9 text-xs font-body font-semibold transition-colors hover:bg-slate-50"
        >
          Today
        </button>

        {/* Day / Week / Month toggle */}
        <div className="flex items-center rounded-full p-0.5 border border-slate-300 bg-white">
          {['Day', 'Week', 'Month'].map(v => (
            <button
              key={v}
              onClick={() => onViewChange(v.toLowerCase())}
              className={`px-3 h-8 rounded-full text-xs font-body font-semibold transition-all ${
                view === v.toLowerCase()
                  ? 'toolbar-pill-active'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Calendar / List toggle */}
        <ViewModeToggle currentMode="grid" onModeChange={onModeChange} />

        {/* Prev arrow */}
        <button
          onClick={onPrev}
          className="toolbar-pill w-9 h-9 flex items-center justify-center transition-colors hover:bg-slate-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Date label */}
        <span className="text-base font-body font-semibold text-slate-900 min-w-[220px] text-center tracking-wide">
          {dateLabel}
        </span>

        {/* Next arrow */}
        <button
          onClick={onNext}
          className="toolbar-pill w-9 h-9 flex items-center justify-center transition-colors hover:bg-slate-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* TikTok connect button */}
        {canEdit && (
          <TikTokLoginButton
            connected={!!tiktokStatus}
            needsReconnect={tiktokStatus?.needs_reconnect === true}
            accountName={tiktokStatus?.tiktok_display_name || tiktokStatus?.tiktok_account_name}
            onConnect={onConnectTikTok}
            onDisconnect={onDisconnectTikTok}
            loading={tiktokLoading}
          />
        )}

        {/* Generate ideas */}
        {canEdit && (
          <button
            onClick={onGenerateIdea}
            style={{ background: YELLOW, borderColor: YELLOW }}
            className="h-9 px-4 rounded-full border text-white text-xs font-headline font-bold transition-colors hover:opacity-90 shadow-[0_8px_16px_rgba(246,183,10,0.25)]"
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
            className="h-9 px-4 rounded-full border text-white text-xs font-semibold flex items-center gap-1.5 transition-colors hover:opacity-90 shadow-[0_8px_16px_rgba(246,183,10,0.25)]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </button>
        )}
      </div>
    </header>
  );
}
