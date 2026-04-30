import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ListPage from '../../../src/pages/schedule/ListPage';

// Mock the useSchedule hook
vi.mock('../../../src/hooks/useSchedule', () => ({
  useSchedule: vi.fn(() => ({
    schedules: [
      {
        id: '1',
        idea_id: '10',
        created_by: 'user1',
        content_status: 'scheduled',
        scheduled_at: '2026-05-01T10:00:00Z',
        auto_publish: true,
        created_at: '2026-04-28T08:00:00Z',
        idea: { idea_title: 'Scheduled Post', hook: 'Hook text', caption: 'Caption text' },
      },
    ],
    drafts: [
      {
        id: '2',
        idea_id: '11',
        created_by: 'user1',
        content_status: 'draft',
        scheduled_at: null,
        auto_publish: false,
        created_at: '2026-04-27T12:00:00Z',
        idea: { idea_title: 'Draft Post', hook: 'Draft hook', caption: 'Draft caption' },
      },
    ],
    loading: false,
    error: null,
  })),
}));

// Mock the NotificationContext
vi.mock('../../../src/context/NotificationContext', () => ({
  useNotification: vi.fn(() => ({
    toast: { success: vi.fn(), error: vi.fn() },
  })),
}));

describe('ListPage', () => {
  it('renders filter dropdown button', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /filter posts by section/i })).toBeInTheDocument();
  });

  it('opens dropdown when filter button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts by section/i });
    await user.click(filterBtn);

    // All filter options should be visible in the dropdown menu
    // We should see multiple instances now (button + dropdown items)
    const allPostOptions = screen.getAllByText(/All Post/);
    expect(allPostOptions.length).toBeGreaterThan(1);
    
    // Check for Drafts and Scheduled in dropdown
    const draftOptions = screen.getAllByText(/^Drafts/);
    expect(draftOptions.length).toBeGreaterThan(0);
    
    const scheduledOptions = screen.getAllByText(/^Scheduled/);
    expect(scheduledOptions.length).toBeGreaterThan(0);
    
    const publishedOptions = screen.getAllByText(/^Published/);
    expect(publishedOptions.length).toBeGreaterThan(0);
  });

  it('displays content cards in stacked layout', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    // Should show at least one card title
    expect(screen.getByText('Scheduled Post')).toBeInTheDocument();
    expect(screen.getByText('Draft Post')).toBeInTheDocument();
  });

  it('shows current filter with counter in dropdown button', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts by section/i });
    expect(filterBtn).toHaveTextContent('All Post');
    expect(filterBtn).toHaveTextContent('(2)');
  });

  it('filters by section when dropdown option is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts by section/i });
    
    // Open dropdown - initially shows "All Post (2)"
    await user.click(filterBtn);
    
    // Find all Drafts - one in dropdown (we click the second one)
    const allDraftElements = screen.getAllByText(/^Drafts/);
    // The dropdown menu item should be the one without the dropdown button structure
    const draftOption = allDraftElements[allDraftElements.length - 1];
    await user.click(draftOption);

    // Button should now show Drafts (with count 1)
    expect(filterBtn).toHaveTextContent('Drafts');
    expect(filterBtn).toHaveTextContent('(1)');
  });

  it('closes dropdown after selecting an option', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts by section/i });
    await user.click(filterBtn);

    // Find Drafts option in dropdown (there should be multiple instances)
    const draftOptions = screen.getAllByText(/^Drafts/);
    await user.click(draftOptions[draftOptions.length - 1]);

    // After closing, dropdown options should not be visible anymore
    // Only the button text should remain (single instance of "Drafts")
    const remainingDrafts = screen.getAllByText(/^Drafts/);
    expect(remainingDrafts.length).toBe(1);
  });

  it('renders back button to navigate to calendar', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /back|calendar/i })).toBeInTheDocument();
  });
});
