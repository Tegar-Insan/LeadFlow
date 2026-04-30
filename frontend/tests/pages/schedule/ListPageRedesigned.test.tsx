import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ListPage from '../../../src/pages/schedule/ListPage';

// Mock router useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useAuth hook
vi.mock('../../../src/hooks/useAuth', () => ({
  default: vi.fn(() => ({
    user: {
      id: 'user1',
      userId: 'user1',
      email: 'test@example.com',
      roleName: 'marketing_staff',
    },
  })),
}));

// Mock useSchedule hook
vi.mock('../../../src/hooks/useSchedule', () => ({
  useSchedule: vi.fn(() => ({
    schedules: [
      {
        id: 'sched1',
        custom_caption: 'Scheduled Post 1',
        custom_hashtags: ['#krench', '#chicken'],
        status: 'scheduled',
        scheduled_at: '2026-05-15T10:00:00Z',
        created_at: '2026-04-28T08:00:00Z',
        title: 'Post 1',
        idea: { hook: 'Delicious chicken' },
      },
      {
        id: 'sched2',
        custom_caption: 'Published Post',
        custom_hashtags: ['#food'],
        status: 'published',
        scheduled_at: '2026-05-10T14:00:00Z',
        created_at: '2026-04-27T08:00:00Z',
        title: 'Post 2',
        idea: { hook: 'Published content' },
      },
    ],
    drafts: [
      {
        id: 'draft1',
        custom_caption: 'Draft Post 1',
        custom_hashtags: ['#new'],
        status: 'draft',
        scheduled_at: null,
        created_at: '2026-04-28T12:00:00Z',
        title: 'Draft',
        idea: { hook: 'Draft idea' },
      },
    ],
    loading: false,
    removeSchedule: vi.fn(),
    publishNow: vi.fn(async () => ({ ok: true, status: 'published', message: 'Success' })),
  })),
}));

// Mock NotificationContext
vi.mock('../../../src/context/NotificationContext', () => ({
  useNotification: vi.fn(() => ({
    toast: { success: vi.fn(), error: vi.fn() },
  })),
}));

// Mock ContentLibrarySidebar
vi.mock('../../../src/components/Schedule/ContentLibrarySidebar', () => ({
  default: () => <div data-testid="content-sidebar">Content Library Sidebar</div>,
}));

// Mock ViewModeToggle
vi.mock('../../../src/components/Schedule/ViewModeToggle', () => ({
  default: ({ currentMode, onModeChange }: any) => (
    <button
      data-testid="view-mode-toggle"
      onClick={() => onModeChange(currentMode === 'list' ? 'grid' : 'list')}
    >
      {currentMode === 'list' ? 'List' : 'Calendar'}
    </button>
  ),
}));

// Mock Navbar
vi.mock('../../../src/components/common/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

describe('ListPage (Redesigned)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders full layout with sidebar, navbar, and content area', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('content-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
  });

  it('displays filter dropdown button with current filter and count', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts/i });
    expect(filterBtn).toHaveTextContent('All Post');
    expect(filterBtn).toHaveTextContent('(3)'); // 2 scheduled + 1 draft
  });

  it('opens filter dropdown when button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts/i });
    await user.click(filterBtn);

    // All filter options should be visible
    expect(screen.getByText(/All Post/)).toBeInTheDocument();
    expect(screen.getByText(/Drafts/)).toBeInTheDocument();
    expect(screen.getByText(/Scheduled/)).toBeInTheDocument();
    expect(screen.getByText(/Published/)).toBeInTheDocument();
  });

  it('filters content by section when option is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts/i });
    await user.click(filterBtn);

    // Click on "Drafts" option in the dropdown
    const draftButtons = screen.getAllByRole('button', { name: /Drafts/ });
    const draftOption = draftButtons[draftButtons.length - 1]; // Last one is in dropdown
    await user.click(draftOption);

    // Button should now show "Drafts (1)"
    expect(filterBtn).toHaveTextContent('Drafts');
    expect(filterBtn).toHaveTextContent('(1)');

    // Only draft post should be visible
    expect(screen.getByText('Draft Post 1')).toBeInTheDocument();
    expect(screen.queryByText('Scheduled Post 1')).not.toBeInTheDocument();
  });

  it('displays all content items in stacked list format', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    // All posts should be visible in "All Post" filter
    expect(screen.getByText('Scheduled Post 1')).toBeInTheDocument();
    expect(screen.getByText('Draft Post 1')).toBeInTheDocument();
    expect(screen.getByText('Published Post')).toBeInTheDocument();
  });

  it('shows correct status badges for each post', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    // Status badges should be present
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('displays "New Post" button for marketing staff', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const newPostBtn = screen.getByRole('button', { name: /\+ New Post/i });
    expect(newPostBtn).toBeInTheDocument();
  });

  it('navigates to calendar when "New Post" is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const newPostBtn = screen.getByRole('button', { name: /\+ New Post/i });
    await user.click(newPostBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/calendar', expect.any(Object));
  });

  it('toggles between list and calendar view', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const viewToggle = screen.getByTestId('view-mode-toggle');
    expect(viewToggle).toHaveTextContent('List');

    await user.click(viewToggle);

    // Should navigate back to calendar
    expect(mockNavigate).toHaveBeenCalledWith('/calendar');
  });

  it('shows hashtags for each post', () => {
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    expect(screen.getByText('#krench')).toBeInTheDocument();
    expect(screen.getByText('#chicken')).toBeInTheDocument();
    expect(screen.getByText('#new')).toBeInTheDocument();
  });

  it('closes filter dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByRole('button', { name: /filter posts/i });
    await user.click(filterBtn);

    // Click outside the dropdown
    await user.click(document.body);

    // Dropdown options should be hidden (only button text remains)
    const allPostElements = screen.getAllByText(/All Post/);
    expect(allPostElements.length).toBe(1); // Only in button
  });
});
