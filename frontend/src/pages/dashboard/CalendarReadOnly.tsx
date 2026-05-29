/**
 * CalendarReadOnly.tsx — Read-only calendar view for Business Owner
 * Displays published/scheduled content without edit capabilities
 * LeadFlow – Krench Chicken
 */

import React, { useState, useEffect, useContext } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import CalendarView from '../../components/Schedule/CalendarView';
import SmallSidebar from '../../components/common/smallsidebar';
import DashboardNavbar from '../../components/common/DashboardNavbar';
import useAuth from '../../hooks/useAuth';
import api from '../../services/authService';
import { nowWIB, getGreeting } from '../../utils/formatDate';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';

export default function CalendarReadOnly() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().tz(TZ));

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const year = currentMonth.year();
      const month = currentMonth.month() + 1;
      const res = await api.get(`/calendar?year=${year}&month=${month}`);
      if (res.data.success) {
        // Filter to only show published/scheduled content
        const filtered = (res.data.data || []).filter(s =>
          ['published', 'scheduled', 'uploaded'].includes(s.status)
        );
        setSchedules(filtered);
      }
    } catch (err) {
      console.error('[CalendarReadOnly] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const now = nowWIB();
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-surface flex">
      <SmallSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar />
        <main className="flex-1 p-8 animate-fade-in overflow-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">
              Content Calendar
            </p>
            <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight mb-1">
              {greeting}, <span className="text-brand">{user?.fullName?.split(' ')[0] || 'Owner'}</span>
            </h1>
            <p className="text-text-secondary text-base font-body">
              View published and scheduled content · {now.format('DD MMMM YYYY')}
            </p>
          </div>

          {/* Calendar View */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-text-secondary">Loading calendar...</div>
            </div>
          ) : (
            <CalendarView
              schedules={schedules}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              readOnly={true}
            />
          )}

          {/* Info Banner */}
          <div className="mt-8 p-4 bg-surface-raised border border-surface-border rounded-lg">
            <p className="text-text-secondary text-sm font-body">
              💡 This is a read-only view showing published and scheduled content. To make changes, contact your marketing team.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
