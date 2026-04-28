import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSchedule = vi.fn();

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

vi.mock('../../src/components/common/Sidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock('../../src/components/common/Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('../../src/components/Schedule/ContentCard', () => ({
  LibraryCard: ({ schedule }: any) => <div>{schedule.custom_caption || schedule.title}</div>,
}));

import Marketingdashboard from '../../src/pages/dashboard/Marketingdashboard';
import AuthContext from '../../src/context/AuthContext';

describe('Marketingdashboard draft content section', () => {
  beforeEach(() => {
    mockUseSchedule.mockReturnValue({
      schedules: [
        { id: 'scheduled-1', title: 'Scheduled Item', custom_caption: 'Scheduled Item', status: 'scheduled', scheduled_at: '2026-05-03T03:00:00Z' },
      ],
      drafts: [
        { id: 'draft-1', title: 'Draft Item', custom_caption: 'Draft Item', status: 'draft', scheduled_at: null },
      ],
      loading: false,
      error: null,
      removeSchedule: vi.fn().mockResolvedValue(undefined),
      publishNow: vi.fn().mockResolvedValue({ ok: true, message: 'Published' }),
    });
  });

  it('shows draft-first content by default and supports filter switching', async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: { roleName: 'marketing_staff' },
            roleName: 'marketing_staff',
            isAuthenticated: true,
          }}
        >
          <Marketingdashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/draft content library/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /drafts/i })).toBeInTheDocument();
    expect(screen.getByText('Draft Item')).toBeInTheDocument();
    expect(screen.queryByText('Scheduled Item')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /scheduled/i }));

    await waitFor(() => {
      expect(screen.getByText('Scheduled Item')).toBeInTheDocument();
      expect(screen.queryByText('Draft Item')).not.toBeInTheDocument();
    });
  });
});