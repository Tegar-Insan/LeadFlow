// frontend/tests/components/CommentThread.test.tsx
// Session 9 — UC015 tests for the inline draft-only comment panel inside CalendarPage.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CalendarPage from '../../src/pages/schedule/CalendarPage';
import AuthContext from '../../src/context/AuthContext';
import { ConfirmProvider } from '../../src/context/ConfirmContext';
import { useSchedule } from '../../src/hooks/useSchedule';

vi.mock('../../src/hooks/useSchedule', () => ({
  useSchedule: vi.fn(),
}));

vi.mock('../../src/services/commentsService', () => ({
  listComments: vi.fn().mockResolvedValue([]),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock('../../src/services/mediaService', () => ({
  fetchMediaBySchedule: vi.fn().mockResolvedValue({ data: { data: { assets: [] } } }),
  uploadMedia: vi.fn(),
  deleteMediaAsset: vi.fn(),
}));

vi.mock('../../src/services/tiktokService', () => ({
  getTikTokAuthUrl: vi.fn(),
  getTikTokStatus: vi.fn().mockResolvedValue(null),
  disconnectTikTok: vi.fn(),
}));

vi.mock('../../src/context/NotificationContext', () => ({
  useNotification: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  }),
}));

vi.mock('../../src/components/common/AIChatbot', () => ({
  default: () => null,
}));

vi.mock('../../src/components/common/TikTokLoginButton', () => ({
  default: () => null,
}));

vi.mock('../../src/components/Schedule/WeeklyCalendarView', () => ({
  default: () => <div data-testid="weekly-view" />,
}));

vi.mock('../../src/components/Schedule/CalendarView', () => ({
  default: () => <div data-testid="month-view" />,
}));

vi.mock('../../src/components/Schedule/ContentLibrarySidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock('../../src/components/media/MediaUploader', () => ({
  default: () => <div data-testid="media-uploader" />,
}));

vi.mock('../../src/components/media/MediaPreview', () => ({
  default: () => <div data-testid="media-preview" />,
}));

const mockUseSchedule = vi.mocked(useSchedule);

function renderCalendarPage(schedule: Record<string, unknown>) {
  mockUseSchedule.mockReturnValue({
    year: 2026,
    month: 5,
    schedules: [schedule],
    schedulesByDate: {},
    drafts: [],
    loading: false,
    error: null,
    prevMonth: vi.fn(),
    nextMonth: vi.fn(),
    goToToday: vi.fn(),
    navigateToDate: vi.fn(),
    loadMonth: vi.fn(),
    addSchedule: vi.fn(),
    editSchedule: vi.fn(),
    removeSchedule: vi.fn(),
    publishNow: vi.fn().mockResolvedValue({ ok: true, message: 'Published' }),
    addToQueue: vi.fn().mockResolvedValue({ ok: true, message: 'Added to queue' }),
    dragDrop: vi.fn(),
  });

  return render(
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
      }}
    >
      <ConfirmProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/calendar',
              state: { createdScheduleId: schedule.id },
            },
          ]}
        >
          <CalendarPage />
        </MemoryRouter>
      </ConfirmProvider>
    </AuthContext.Provider>,
  );
}

describe('CommentThread (inline in CalendarPage detail modal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows textarea when schedule is draft', async () => {
    renderCalendarPage({
      id: 'sched-1',
      status: 'draft',
      scheduled_at: '2026-05-02T19:00:00Z',
      custom_caption: 'hello',
      custom_hashtags: [],
      created_by_name: 'Test User',
      platform: 'TikTok',
      privacy_level: 'PUBLIC_TO_EVERYONE',
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    });
  });

  it('shows locked note when schedule is published', async () => {
    renderCalendarPage({
      id: 'sched-2',
      status: 'published',
      scheduled_at: '2026-04-01T19:00:00Z',
      custom_caption: 'already live',
      custom_hashtags: [],
      created_by_name: 'Test User',
      platform: 'TikTok',
      privacy_level: 'PUBLIC_TO_EVERYONE',
    });

    await waitFor(() => {
      expect(screen.getByText(/comments are locked after publish/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/add a comment/i)).not.toBeInTheDocument();
    });
  });
});
