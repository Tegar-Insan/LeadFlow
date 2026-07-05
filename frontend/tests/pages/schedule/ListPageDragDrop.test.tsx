/**
 * ListPageDragDrop.test.tsx
 * Drag-and-drop on ListPage's Scheduled tab: dragging a card onto a different
 * date's group reschedules it to that date (keeping its existing time-of-day),
 * reusing useSchedule's dragDrop the same way CalendarPage.tsx already does.
 * Past-date drops are blocked with the same guard/alert as CalendarPage.tsx's
 * handleDrop. Dates are computed relative to "now" so this test never goes
 * stale (see progress.md's lesson about hardcoded dates becoming past dates).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import ListPage from '../../../src/pages/schedule/ListPage';
import AuthContext from '../../../src/context/AuthContext';
import { ConfirmProvider } from '../../../src/context/ConfirmContext';
import { useSchedule } from '../../../src/hooks/useSchedule';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'Asia/Jakarta';

vi.mock('../../../src/hooks/useSchedule', () => ({
  useSchedule: vi.fn(),
}));

vi.mock('../../../src/services/scheduleService', () => ({
  fetchSchedulesForList: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));

vi.mock('../../../src/services/mediaService', () => ({
  fetchMediaBySchedule: vi.fn().mockResolvedValue({ data: { data: { assets: [] } } }),
  uploadMedia: vi.fn(),
  deleteMediaAsset: vi.fn(),
}));

vi.mock('../../../src/services/tiktokService', () => ({
  getTikTokAuthUrl: vi.fn(),
  getTikTokStatus: vi.fn().mockResolvedValue(null),
  disconnectTikTok: vi.fn(),
}));

vi.mock('../../../src/services/commentsService', () => ({
  listComments: vi.fn().mockResolvedValue([]),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock('../../../src/context/NotificationContext', () => ({
  useNotification: () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  }),
}));

vi.mock('../../../src/components/common/AIChatbot', () => ({ default: () => null }));
vi.mock('../../../src/components/common/TikTokLoginButton', () => ({ default: () => null }));
vi.mock('../../../src/components/Schedule/ContentLibrarySidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock('../../../src/components/Schedule/ScheduleModal', () => ({ default: () => null }));

const mockUseSchedule = vi.mocked(useSchedule);

// jsdom doesn't implement DataTransfer — build a fake one like DragDropSlot.test.tsx does.
function makeDragEvent(type: 'dragOver' | 'drop' | 'dragStart', el: Element, dataTransferOverrides = {}) {
  const evt = createEvent[type](el);
  Object.defineProperty(evt, 'dataTransfer', {
    value: { dropEffect: '', effectAllowed: '', setData: vi.fn(), getData: () => '', ...dataTransferOverrides },
  });
  return evt;
}

const now = dayjs().tz(TZ);
// Both in the future relative to whenever this test runs.
const dayA = now.add(2, 'day').hour(10).minute(0).second(0).millisecond(0);
const dayB = now.add(3, 'day').hour(19).minute(0).second(0).millisecond(0);
const pastDay = now.subtract(1, 'day').hour(10).minute(0).second(0).millisecond(0);

const dayAKey = dayA.format('YYYY-MM-DD');
const dayBKey = dayB.format('YYYY-MM-DD');
const pastDayKey = pastDay.format('YYYY-MM-DD');

function scheduleFixture(id: string, when: dayjs.Dayjs) {
  return {
    id,
    custom_caption: `Post ${id}`,
    custom_hashtags: [],
    status: 'scheduled',
    scheduled_at: when.utc().toISOString(),
    created_at: when.subtract(1, 'day').utc().toISOString(),
    title: `Post ${id}`,
  };
}

function renderListPage(schedules: Record<string, unknown>[], dragDrop = vi.fn(), drafts: Record<string, unknown>[] = []) {
  mockUseSchedule.mockReturnValue({
    schedules,
    drafts,
    loading: false,
    error: null,
    loadMonth: vi.fn(),
    addSchedule: vi.fn(),
    editSchedule: vi.fn(),
    removeSchedule: vi.fn(),
    publishNow: vi.fn().mockResolvedValue({ ok: true, message: 'Published' }),
    addToQueue: vi.fn().mockResolvedValue({ ok: true, message: 'Added to queue' }),
    dragDrop,
  } as any);

  render(
    <AuthContext.Provider
      value={{
        user: { userId: 'u-1', roleName: 'marketing_staff', fullName: 'Test User' },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        otpPending: false,
        otpEmail: null,
        dashboardPath: '/calendar',
        login: vi.fn(),
        verifyOTP: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      } as any}
    >
      <ConfirmProvider>
        <MemoryRouter initialEntries={['/calendar/list']}>
          <ListPage />
        </MemoryRouter>
      </ConfirmProvider>
    </AuthContext.Provider>,
  );

  return { dragDrop };
}

describe('ListPage drag-and-drop (Scheduled tab)', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('dragging a card onto a different date group reschedules it to that date, keeping its time-of-day', () => {
    const { dragDrop } = renderListPage([
      scheduleFixture('sched-a', dayA),
      scheduleFixture('sched-b', dayB),
    ]);

    const card = screen.getByText('Post sched-a').closest('.list-card') as HTMLElement;
    const targetGroup = screen.getByText('Post sched-b').closest('.space-y-3') as HTMLElement;
    expect(card).toBeTruthy();
    expect(targetGroup).toBeTruthy();

    fireEvent(card, makeDragEvent('dragStart', card, { getData: () => 'sched-a' }));
    fireEvent(targetGroup, makeDragEvent('dragOver', targetGroup));
    fireEvent(targetGroup, makeDragEvent('drop', targetGroup, {
      getData: (key: string) => (key === 'scheduleId' ? 'sched-a' : ''),
    }));

    expect(dragDrop).toHaveBeenCalledWith('sched-a', dayBKey, '10:00');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('sets the dragged schedule id via dataTransfer.setData on drag start', () => {
    renderListPage([scheduleFixture('sched-a', dayA)]);
    const card = screen.getByText('Post sched-a').closest('.list-card') as HTMLElement;
    const setData = vi.fn();

    fireEvent(card, makeDragEvent('dragStart', card, { setData }));

    expect(setData).toHaveBeenCalledWith('scheduleId', 'sched-a');
  });

  it('blocks dropping onto a past date group and alerts instead of calling dragDrop', () => {
    const { dragDrop } = renderListPage([
      scheduleFixture('sched-a', dayA),
      scheduleFixture('sched-old', pastDay),
    ]);

    const targetGroup = screen.getByText('Post sched-old').closest('.space-y-3') as HTMLElement;
    fireEvent(targetGroup, makeDragEvent('dragOver', targetGroup));
    fireEvent(targetGroup, makeDragEvent('drop', targetGroup, {
      getData: (key: string) => (key === 'scheduleId' ? 'sched-a' : ''),
    }));

    expect(dragDrop).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Cannot move a post to a past date.');
  });

  it('cards are not draggable while viewing the Drafts tab', () => {
    const draft = {
      id: 'draft-a',
      custom_caption: 'Draft Post',
      custom_hashtags: [],
      status: 'draft',
      scheduled_at: null,
      created_at: dayA.utc().toISOString(),
      title: 'Draft Post',
    };
    renderListPage([scheduleFixture('sched-a', dayA)], vi.fn(), [draft]);

    fireEvent.click(screen.getByRole('button', { name: /^Drafts/ }));

    const draftCard = screen.getByText('Draft Post').closest('.list-card') as HTMLElement;
    expect(draftCard.getAttribute('draggable')).toBe('false');
  });
});
