/**
 * useSchedule.js
 * Custom hook — content calendar state & operations
 * LeadFlow – Krench Chicken
 */

import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import utc     from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  fetchCalendarMonth,
  fetchDrafts,
  fetchScheduleById,
  createSchedule,
  updateSchedule,
  moveSchedule,
  deleteSchedule,
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
    const res = await createSchedule(payload);
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
    setSchedules(prev => prev.map(x => x.id === id ? s : x));
    setDrafts(prev    => prev.map(x => x.id === id ? s : x));
    return s;
  }, []);

  const removeSchedule = useCallback(async (id) => {
    await deleteSchedule(id);
    setSchedules(prev => prev.filter(x => x.id !== id));
    setDrafts(prev    => prev.filter(x => x.id !== id));
  }, []);

  const dragDrop = useCallback(async (id, newDateISO, timeStr = '10:00') => {
    // Combine date + time → WIB → UTC ISO
    const wibStr = `${newDateISO}T${timeStr}:00`;
    const utcISO = dayjs.tz(wibStr, TZ).utc().toISOString();
    const res    = await moveSchedule(id, utcISO);
    const s      = res.data.data.schedule;
    // Remove from drafts if it was there
    setDrafts(prev => prev.filter(x => x.id !== id));
    // Refresh month schedules
    setSchedules(prev => {
      const exists = prev.find(x => x.id === id);
      return exists ? prev.map(x => x.id === id ? s : x) : [...prev, s];
    });
    return s;
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
    dragDrop,
  };
};
