/**
 * useSchedule.js
 * Custom hook — content calendar state & operations
 * LeadFlow – Krench Chicken
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import utc     from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  fetchCalendarMonth,
  fetchDrafts,
  createSchedule,
  updateSchedule,
  moveSchedule,
  deleteSchedule,
  publishScheduleNow,
} from '../services/scheduleService';
import { TZ, nowWIB } from '../utils/formatDate';

dayjs.extend(utc);
dayjs.extend(timezone);

export const useSchedule = () => {
  const today = nowWIB();

  const [year,         setYear]         = useState(today.year());
  const [month,        setMonth]        = useState(today.month() + 1); // 1-indexed
  const [schedules,    setSchedules]    = useState([]);
  const [drafts,       setDrafts]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // Refs that always hold the latest state — used inside dragDrop to avoid
  // stale closures when looking up the original schedule before overwriting it.
  const schedulesRef = useRef([]);
  const draftsRef    = useRef([]);
  useEffect(() => { schedulesRef.current = schedules; }, [schedules]);
  useEffect(() => { draftsRef.current    = drafts;    }, [drafts]);

  // ── Fetch month data ──────────────────────────────────────
  const loadMonth = useCallback(async (y, m) => {
    setLoading(true);
    setError(null);
    try {
      const [calRes, draftRes] = await Promise.all([
        fetchCalendarMonth(y, m),
        fetchDrafts(),
      ]);
      setSchedules(calRes.data.data.schedules  || []);
      setDrafts(draftRes.data.data.drafts      || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMonth(year, month);
  }, [year, month, loadMonth]);

  // ── Month navigation ──────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToToday = () => {
    const t = nowWIB();
    setYear(t.year());
    setMonth(t.month() + 1);
  };

  // ── CRUD helpers (optimistic updates) ─────────────────────
  const addSchedule = useCallback(async (payload) => {
    const status = payload?.status || (payload?.scheduled_at ? 'scheduled' : 'draft');
    const normalizedPayload = {
      ...payload,
      status,
      scheduled_at: status === 'draft' ? null : payload?.scheduled_at ?? null,
    };

    const res = await createSchedule(normalizedPayload);
    const s   = res.data.data.schedule;
    if (s.scheduled_at) {
      const d = dayjs(s.scheduled_at).tz(TZ);
      if (d.year() === year && d.month() + 1 === month) {
        setSchedules(prev => [...prev, s]);
      }
    } else {
      setDrafts(prev => [s, ...prev]);
    }
    return s;
  }, [year, month]);

  const editSchedule = useCallback(async (id, payload) => {
    const res = await updateSchedule(id, payload);
    const s   = res.data.data.schedule;
    const isDraft = !s.scheduled_at || s.status === 'draft';

    setSchedules(prev => {
      const withoutCurrent = prev.filter(x => x.id !== id);
      return isDraft ? withoutCurrent : [...withoutCurrent, s];
    });

    setDrafts(prev => {
      const withoutCurrent = prev.filter(x => x.id !== id);
      return isDraft ? [s, ...withoutCurrent] : withoutCurrent;
    });

    return s;
  }, []);

  const removeSchedule = useCallback(async (id) => {
    await deleteSchedule(id);
    setSchedules(prev => prev.filter(x => x.id !== id));
    setDrafts(prev    => prev.filter(x => x.id !== id));
  }, []);

  const publishNow = useCallback(async (id) => {
    try {
      const res = await publishScheduleNow(id);
      const data = res?.data?.data || {};
      const nextStatus = data?.status === 'failed' ? 'failed' : 'published';

      setSchedules(prev => prev.map(x => (x.id === id ? { ...x, status: nextStatus } : x)));
      setDrafts(prev => prev.filter(x => x.id !== id));

      return {
        ok: nextStatus === 'published',
        status: nextStatus,
        message: res?.data?.message || data?.message || 'Publish request completed',
      };
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to publish content';
      setSchedules(prev => prev.map(x => (x.id === id ? { ...x, status: 'failed' } : x)));
      return { ok: false, status: 'failed', message };
    }
  }, []);

  const dragDrop = useCallback(async (id, newDateISO, timeStr = '10:00') => {
    // Combine date + time → WIB → UTC ISO
    const wibStr = `${newDateISO}T${timeStr}:00`;
    const utcISO = dayjs.tz(wibStr, TZ).utc().toISOString();
    const res    = await moveSchedule(id, utcISO);
    const s      = res.data.data.schedule;

    // The API response only returns raw DB columns — computed fields like
    // primary_asset_url, primary_asset_mime, created_by_name are NOT included.
    // Find the original entry (from either list) and re-attach those fields so
    // thumbnails don't disappear from the sidebar and calendar slot after a drag.
    const original = schedulesRef.current.find(x => x.id === id)
                  || draftsRef.current.find(x => x.id === id);

    const merged = original
      ? {
          ...s,
          primary_asset_url:  original.primary_asset_url  ?? null,
          primary_asset_type: original.primary_asset_type ?? null,
          primary_asset_mime: original.primary_asset_mime ?? null,
          created_by_name:    original.created_by_name    ?? null,
          slide_count:        original.slide_count        ?? 1,
        }
      : s;

    // Remove from drafts if it was there
    setDrafts(prev => prev.filter(x => x.id !== id));
    // Add / update in the scheduled list with computed fields intact
    setSchedules(prev => {
      const inList = prev.find(x => x.id === id);
      return inList
        ? prev.map(x => x.id === id ? merged : x)
        : [...prev, merged];
    });
    return merged;
  }, []);

  // ── Schedules grouped by date string "YYYY-MM-DD" (WIB) ───
  const schedulesByDate = schedules.reduce((acc, s) => {
    if (!s.scheduled_at) return acc;
    const key = dayjs(s.scheduled_at).tz(TZ).format('YYYY-MM-DD');
    acc[key]  = acc[key] ? [...acc[key], s] : [s];
    return acc;
  }, {});

  return {
    year, month,
    schedules, schedulesByDate,
    drafts,
    loading, error,
    prevMonth, nextMonth, goToToday,
    loadMonth: () => loadMonth(year, month),
    addSchedule,
    editSchedule,
    removeSchedule,
    publishNow,
    dragDrop,
  };
};
