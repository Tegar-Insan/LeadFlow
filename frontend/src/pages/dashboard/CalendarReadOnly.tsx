/**
 * CalendarReadOnly.tsx — Business Owner content calendar
 * Read-only schedule view with day/week/month filter and comment panel.
 * Business owner can annotate content cards for the marketing team.
 */

import React, { useState, useEffect } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import SmallSidebar from '../../components/common/smallsidebar';
import DashboardNavbar from '../../components/common/DashboardNavbar';
import { SlotCard } from '../../components/Schedule/ContentCard';
import CommentCard from '../../components/interaction/CommentCard';
import { nowWIB } from '../../utils/formatDate';
import {
  fetchMonthSchedules,
  listComments,
  createComment,
  type OwnerSchedule,
  type ScheduleCommentDetail,
} from '../../services/ownerCalendarService';
import { useCalendarSocket } from '../../hooks/useCalendarSocket';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';
type ViewMode = 'day' | 'week' | 'month';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_DOT: Record<string, string> = {
  published: 'bg-emerald-500',
  scheduled: 'bg-blue-500',
  uploaded:  'bg-amber-500',
};

function schedulesForDate(schedules: OwnerSchedule[], date: Dayjs): OwnerSchedule[] {
  return schedules.filter(s => {
    if (!s.scheduled_at) return false;
    return dayjs(s.scheduled_at).tz(TZ).format('YYYY-MM-DD') === date.format('YYYY-MM-DD');
  });
}

// Monday-first week start offset
function mondayOffset(d: Dayjs): number {
  return (d.day() + 6) % 7; // Sun→6, Mon→0, Tue→1 …
}

function buildMonthGrid(anchor: Dayjs): Dayjs[][] {
  const firstDay = anchor.startOf('month');
  const lastDay  = anchor.endOf('month');
  const gridStart = firstDay.subtract(mondayOffset(firstDay), 'day');

  const weeks: Dayjs[][] = [];
  let cursor = gridStart;
  while (cursor.isBefore(lastDay) || cursor.isSame(lastDay, 'day')) {
    weeks.push(Array.from({ length: 7 }, (_, i) => cursor.add(i, 'day')));
    cursor = cursor.add(7, 'day');
  }
  return weeks;
}

function buildWeekDays(anchor: Dayjs): Dayjs[] {
  const monday = anchor.subtract(mondayOffset(anchor), 'day');
  return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'));
}

/* ── Month cell ──────────────────────────────────────────────────────── */
function MonthCell({
  date,
  schedules,
  isCurrentMonth,
  isToday,
  onCardClick,
}: {
  date: Dayjs;
  schedules: OwnerSchedule[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onCardClick: (s: OwnerSchedule) => void;
}) {
  const daySched = schedulesForDate(schedules, date);

  return (
    <div
      className={`min-h-[110px] p-1.5 border-b border-r border-brand/15 ${
        isCurrentMonth ? 'bg-white' : 'bg-surface-raised/50'
      }`}
    >
      {/* Day number */}
      <div className="flex items-center justify-end mb-1">
        <span
          className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
            isToday
              ? 'bg-brand text-black'
              : isCurrentMonth
              ? 'text-text-primary'
              : 'text-text-muted'
          }`}
        >
          {date.date()}
        </span>
      </div>

      {/* Content cards */}
      <div className="space-y-1">
        {daySched.map(s => (
          <div
            key={s.id}
            className="border-2 border-brand rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <SlotCard schedule={s} onClick={() => onCardClick(s)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Week column ─────────────────────────────────────────────────────── */
function WeekColumn({
  date,
  schedules,
  isToday,
  onCardClick,
}: {
  date: Dayjs;
  schedules: OwnerSchedule[];
  isToday: boolean;
  onCardClick: (s: OwnerSchedule) => void;
}) {
  const daySched = schedulesForDate(schedules, date);

  return (
    <div
      className={`flex-1 min-h-[200px] p-2 border-r border-brand/15 last:border-r-0 ${
        isToday ? 'bg-brand/5' : 'bg-white'
      }`}
    >
      <span
        className={`text-[11px] font-semibold block mb-2 ${
          isToday ? 'text-brand' : 'text-text-muted'
        }`}
      >
        {date.format('D')}
      </span>
      <div className="space-y-1.5">
        {daySched.map(s => (
          <div
            key={s.id}
            className="border-2 border-brand rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <SlotCard schedule={s} onClick={() => onCardClick(s)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function CalendarReadOnly() {
  const [viewMode, setViewMode]             = useState<ViewMode>('month');
  const [currentDate, setCurrentDate]       = useState<Dayjs>(() => dayjs().tz(TZ));
  const [schedules, setSchedules]           = useState<OwnerSchedule[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<OwnerSchedule | null>(null);
  const [comments, setComments]             = useState<ScheduleCommentDetail[]>([]);
  const [commentText, setCommentText]       = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const today = dayjs().tz(TZ);

  // Fetch schedules when visible month changes
  useEffect(() => {
    setLoading(true);
    fetchMonthSchedules(currentDate.year(), currentDate.month() + 1)
      .then(setSchedules)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentDate.year(), currentDate.month()]);

  // Real-time: re-fetch when marketing staff mutates a schedule for the visible month
  useCalendarSocket((year, month) => {
    if (year === currentDate.year() && month === currentDate.month() + 1) {
      fetchMonthSchedules(year, month).then(setSchedules).catch(console.error);
    }
  });

  // Fetch comments when a card is opened
  useEffect(() => {
    if (!selectedSchedule) { setComments([]); return; }
    setLoadingComments(true);
    listComments(selectedSchedule.id)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoadingComments(false));
  }, [selectedSchedule?.id]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !selectedSchedule) return;
    setSubmitting(true);
    try {
      await createComment(selectedSchedule.id, commentText.trim());
      setCommentText('');
      const updated = await listComments(selectedSchedule.id);
      setComments(updated);
    } catch (err) {
      console.error('[CalendarReadOnly] comment submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'month') setCurrentDate(d => d.add(dir, 'month'));
    else if (viewMode === 'week') setCurrentDate(d => d.add(dir * 7, 'day'));
    else setCurrentDate(d => d.add(dir, 'day'));
  };

  const goToday = () => setCurrentDate(dayjs().tz(TZ));

  const weekDays = buildWeekDays(currentDate);

  const headerLabel =
    viewMode === 'month'
      ? currentDate.format('MMMM YYYY')
      : viewMode === 'week'
      ? `${weekDays[0].format('D MMM')} – ${weekDays[6].format('D MMM YYYY')}`
      : currentDate.format('dddd, D MMMM YYYY');

  return (
    <div className="min-h-screen bg-surface flex">
      <SmallSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar />

        <main className="flex-1 p-6 animate-fade-in overflow-auto">

          {/* Header — no greeting, just label */}
          <div className="mb-5">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-1">
              Content Calendar
            </p>
            <p className="text-text-muted text-sm font-body">
              {nowWIB().format('DD MMMM YYYY')} · Published &amp; scheduled content
            </p>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between mb-4 gap-4">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-surface-raised border border-brand/20 p-1 rounded-lg">
              {(['day', 'week', 'month'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                    viewMode === v
                      ? 'bg-brand text-black shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-xs font-semibold border border-surface-border rounded-md text-text-secondary hover:border-brand hover:text-brand transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-md border border-surface-border flex items-center justify-center text-text-secondary hover:border-brand hover:text-brand transition-colors text-base leading-none"
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-text-primary min-w-[200px] text-center">
                {headerLabel}
              </span>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 rounded-md border border-surface-border flex items-center justify-center text-text-secondary hover:border-brand hover:text-brand transition-colors text-base leading-none"
              >
                ›
              </button>
            </div>
          </div>

          {/* Calendar — yellow border wrapper */}
          <div className="border-2 border-brand rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-64 bg-white">
                <span className="text-text-secondary text-sm">Loading calendar…</span>
              </div>
            ) : (
              <>
                {/* Day-of-week header (month + week views) */}
                {viewMode !== 'day' && (
                  <div className="grid grid-cols-7 bg-brand/10 border-b border-brand/20">
                    {DAY_LABELS.map(label => (
                      <div
                        key={label}
                        className="py-2 text-center text-[11px] font-bold text-brand uppercase tracking-wider"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}

                {/* Month grid */}
                {viewMode === 'month' && (
                  <div>
                    {buildMonthGrid(currentDate).map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7">
                        {week.map((day, di) => (
                          <MonthCell
                            key={di}
                            date={day}
                            schedules={schedules}
                            isCurrentMonth={day.month() === currentDate.month()}
                            isToday={day.isSame(today, 'day')}
                            onCardClick={setSelectedSchedule}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Week grid */}
                {viewMode === 'week' && (
                  <div className="flex">
                    {weekDays.map((day, i) => (
                      <WeekColumn
                        key={i}
                        date={day}
                        schedules={schedules}
                        isToday={day.isSame(today, 'day')}
                        onCardClick={setSelectedSchedule}
                      />
                    ))}
                  </div>
                )}

                {/* Day view */}
                {viewMode === 'day' && (
                  <div className="bg-white p-5">
                    <p
                      className={`text-sm font-bold mb-4 ${
                        currentDate.isSame(today, 'day') ? 'text-brand' : 'text-text-primary'
                      }`}
                    >
                      {currentDate.format('dddd, D MMMM YYYY')}
                    </p>
                    {schedulesForDate(schedules, currentDate).length === 0 ? (
                      <div className="text-center py-14 text-text-muted text-sm">
                        No content scheduled for this day.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {schedulesForDate(schedules, currentDate).map(s => (
                          <div
                            key={s.id}
                            className="border-2 border-brand rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          >
                            <SlotCard schedule={s} onClick={() => setSelectedSchedule(s)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4">
            {Object.entries(STATUS_DOT).map(([status, cls]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${cls}`} />
                <span className="text-[11px] text-text-muted capitalize">{status}</span>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Comment slide-over panel */}
      {selectedSchedule && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedSchedule(null)}
          />
          <div className="fixed right-0 top-0 h-full w-[380px] bg-white border-l-2 border-brand shadow-2xl z-50 flex flex-col">

            {/* Panel header */}
            <div className="p-4 border-b border-brand/20 bg-brand/5 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Content Detail
                </span>
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-brand hover:bg-brand/10 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <h3 className="text-sm font-semibold text-text-primary leading-snug">
                {selectedSchedule.title ?? selectedSchedule.custom_caption ?? 'Untitled'}
              </h3>
              {selectedSchedule.scheduled_at && (
                <p className="text-[11px] text-text-muted mt-1">
                  {dayjs(selectedSchedule.scheduled_at).tz(TZ).format('DD MMM YYYY · HH:mm [WIB]')}
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT[selectedSchedule.status] ?? 'bg-zinc-400'}`} />
                <span className="text-[10px] font-semibold text-text-secondary capitalize">
                  {selectedSchedule.status}
                </span>
              </div>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">
                Team Notes
              </p>
              {loadingComments ? (
                <div className="text-center text-text-muted text-xs py-8">Loading…</div>
              ) : comments.length === 0 ? (
                <div className="text-center text-text-muted text-xs py-10">
                  No notes yet. Add one below to inform the marketing team.
                </div>
              ) : (
                comments.map(c => <CommentCard key={c.comment_id} comment={c} />)
              )}
            </div>

            {/* Add comment input */}
            <div className="p-4 border-t border-brand/20 bg-surface-raised flex-shrink-0">
              <p className="text-[10px] font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                Add note for marketing team
              </p>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); }
                }}
                placeholder="Type a note… (Enter to post)"
                rows={3}
                className="w-full text-xs border border-brand/30 rounded-lg p-2.5 resize-none focus:outline-none focus:border-brand bg-white text-text-primary placeholder:text-text-muted transition-colors"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className="mt-2 w-full py-2 bg-brand text-black text-xs font-bold rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Posting…' : 'Post Note'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
