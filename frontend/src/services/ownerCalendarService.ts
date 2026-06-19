// ownerCalendarService.ts
// Read-only schedule fetching for Business Owner calendar view.
// Comments are writable — BO can annotate content for the marketing team.

import api from './authService';
import {
  listComments,
  createComment,
  type ScheduleCommentDetail,
} from './commentsService';

export type { ScheduleCommentDetail };

export interface OwnerSchedule {
  id: string;
  title: string | null;
  custom_caption: string | null;
  status: string;
  scheduled_at: string | null;
  primary_asset_url: string | null;
  primary_asset_type: string | null;
  auto_publish: boolean;
  duration_seconds: number | null;
  slide_count: number;
}

export async function fetchMonthSchedules(
  year: number,
  month: number,
): Promise<OwnerSchedule[]> {
  // Dedicated BO endpoint — status filter (published/scheduled/uploaded) applied at DB level
  const res = await api.get(`/dashboard/calendar?year=${year}&month=${month}`);
  if (!res.data.success) throw new Error(res.data.message ?? 'Fetch failed');
  return res.data.data?.schedules ?? [];
}

export { listComments, createComment };
