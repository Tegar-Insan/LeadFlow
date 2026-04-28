import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSchedule = vi.fn();
const mockGetTikTokStatus = vi.fn();

vi.mock('../../src/hooks/useSchedule', () => ({
  useSchedule: () => mockUseSchedule(),
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

vi.mock('../../src/services/tiktokService', () => ({
  getTikTokAuthUrl: vi.fn(),
  getTikTokStatus: (...args: unknown[]) => mockGetTikTokStatus(...args),
  disconnectTikTok: vi.fn(),
}));

vi.mock('../../src/components/Schedule/WeeklyCalendarView', () => ({
  default: () => <div data-testid="weekly-calendar-view" />,
}));

vi.mock('../../src/components/Schedule/CalendarView', () => ({
  default: () => <div data-testid="calendar-view" />,
}));

vi.mock('../../src/components/Schedule/ContentLibrarySidebar', () => ({
  default: () => <div data-testid="content-library-sidebar" />,
}));

vi.mock('../../src/components/media/MediaUploader', () => ({
  default: () => <div data-testid="media-uploader" />,
}));

vi.mock('../../src/components/media/MediaPreview', () => ({
  default: () => <div data-testid="media-preview" />,
}));

vi.mock('../../src/components/common/AIChatbot', () => ({
  default: () => <div data-testid="ai-chatbot" />,
}));

vi.mock('../../src/components/common/TikTokLoginButton', () => ({
  default: () => <div data-testid="tiktok-login-button" />,
}));

import CalendarPage from '../../src/pages/schedule/CalendarPage';
import AuthContext from '../../src/context/AuthContext';

describe('CalendarPage post filter dropdown', () => {
  beforeEach(() => {
    mockGetTikTokStatus.mockResolvedValue(false);
    mockUseSchedule.mockReturnValue({
      year: 2026,
      month: 4,
      schedules: [],
      schedulesByDate: {},
      drafts: [],
      loading: false,
      error: null,
      prevMonth: vi.fn(),
      nextMonth: vi.fn(),
      goToToday: vi.fn(),
      loadMonth: vi.fn(),
      addSchedule: vi.fn(),
      editSchedule: vi.fn(),
      removeSchedule: vi.fn(),
      publishNow: vi.fn(),
      dragDrop: vi.fn(),
    });
  });

  it('shows All Post, Drafts, Scheduled, and Published in the post filter menu', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <AuthContext.Provider
          value={{
            user: { roleName: 'marketing_staff' },
            roleName: 'marketing_staff',
            isAuthenticated: true,
          }}
        >
          <CalendarPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => expect(mockGetTikTokStatus).toHaveBeenCalled());

    const toggle = screen.getAllByRole('button', { name: /^all post$/i })[0];
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^all post$/i })).toHaveLength(2);
      expect(screen.getByRole('button', { name: /drafts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /scheduled/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /published/i })).toBeInTheDocument();
    });
  });
});