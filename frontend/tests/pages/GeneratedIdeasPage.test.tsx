// frontend/tests/pages/GeneratedIdeasPage.test.tsx
// Session 9 — card rendering, approve wiring, reject prompt.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { type Mock } from 'vitest';
import GeneratedIdeasPage from '../../src/pages/content/GeneratedIdeasPage';

vi.mock('../../src/services/contentService', () => ({
  generateDrafts: vi.fn(),
  approveIdea: vi.fn(),
  rejectIdea: vi.fn(),
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

vi.mock('../../src/utils/formatDate', () => ({
  fLongDateTime: (iso: string) => (iso ? iso.slice(0, 16) : '—'),
}));

import {
  generateDrafts,
  approveIdea,
  rejectIdea,
  type GeneratedScheduleDraft,
} from '../../src/services/contentService';

const sampleDrafts: GeneratedScheduleDraft[] = [
  {
    id: 'idea-1',
    prompt_id: 'p-1',
    idea_title: 'Spicy Wings Monday',
    hook: 'POV: you heard the crunch',
    caption: 'Come try our hottest drop 🔥',
    hashtags: ['#KrenchChicken', '#BogorFood'],
    suggested_music: 'Trending pop',
    estimated_duration: 30,
    estimated_engagement: 'high',
    best_time_to_post_wib: '2026-05-02T19:00:00+07:00',
    category: 'PROMOTION',
    status: 'pending_validation',
    ai_model_used: 'claude-sonnet-4-6',
  },
  {
    id: 'idea-2',
    prompt_id: 'p-1',
    idea_title: 'Behind the Fryer',
    hook: 'How we prep fresh daily',
    caption: 'From 6AM to lunch ⏰',
    hashtags: ['#KrenchChicken', '#BehindTheScenes'],
    suggested_music: 'Lofi',
    estimated_duration: 45,
    estimated_engagement: 'medium',
    best_time_to_post_wib: '2026-05-03T12:00:00+07:00',
    category: 'BEHIND-THE-SCENES',
    status: 'pending_validation',
    ai_model_used: 'claude-sonnet-4-6',
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <GeneratedIdeasPage />
    </MemoryRouter>,
  );
}

describe('GeneratedIdeasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one card per returned draft after Generate', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/promotion/i), {
      target: { value: 'Generate promo content for this week' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate Ideas/i }));

    await waitFor(() => {
      expect(screen.getByText('Spicy Wings Monday')).toBeInTheDocument();
      expect(screen.getByText('Behind the Fryer')).toBeInTheDocument();
    });
  });

  it('Approve click removes the approved card from the page', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (approveIdea as Mock).mockResolvedValue({
      idea_id: 'idea-1',
      schedule_id: 'sched-abc',
      schedule_status: 'draft',
    });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/promotion/i), {
      target: { value: 'Generate promo content for this week' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate Ideas/i }));
    await screen.findByText('Spicy Wings Monday');

    const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
    fireEvent.click(approveButtons[0]!);

    await waitFor(() => {
      expect(approveIdea).toHaveBeenCalledWith('idea-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Spicy Wings Monday')).not.toBeInTheDocument();
    });
  });

  it('Reject click opens reason prompt and sends payload', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (rejectIdea as Mock).mockResolvedValue({ idea_id: 'idea-2' });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/promotion/i), {
      target: { value: 'Generate promo content for this week' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate Ideas/i }));
    await screen.findByText('Behind the Fryer');

    const rejectButtons = screen.getAllByRole('button', { name: /Reject/i });
    // click the second card's reject
    fireEvent.click(rejectButtons[1]!);

    // reason prompt appears
    const reasonBox = await screen.findByPlaceholderText(/ready yet/i);
    fireEvent.change(reasonBox, { target: { value: 'Music licence issue' } });
    fireEvent.click(screen.getByRole('button', { name: /Reject with reason/i }));

    await waitFor(() => {
      expect(rejectIdea).toHaveBeenCalledWith('idea-2', 'Music licence issue');
    });
  });

  it('Reject without reason sends null', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (rejectIdea as Mock).mockResolvedValue({ idea_id: 'idea-1' });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/promotion/i), {
      target: { value: 'Generate promo content for this week' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate Ideas/i }));
    await screen.findByText('Spicy Wings Monday');

    const rejectButtons = screen.getAllByRole('button', { name: /Reject/i });
    fireEvent.click(rejectButtons[0]!);

    fireEvent.click(await screen.findByRole('button', { name: /Skip & reject/i }));

    await waitFor(() => {
      expect(rejectIdea).toHaveBeenCalledWith('idea-1', null);
    });
  });
});
