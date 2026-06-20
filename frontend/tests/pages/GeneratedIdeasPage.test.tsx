// frontend/tests/pages/GeneratedIdeasPage.test.tsx
// Session 10 — updated for: no-navigate on approve, Content Library sidebar wired.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { type Mock } from 'vitest';
import GeneratedIdeasPage from '../../src/pages/content/GeneratedIdeasPage';

// ── Service mocks ────────────────────────────────────────────────
vi.mock('../../src/services/contentService', () => ({
  generateDrafts: vi.fn(),
  approveIdea: vi.fn(),
  rejectIdea: vi.fn(),
}));

vi.mock('../../src/services/scheduleService', () => ({
  fetchDrafts: vi.fn().mockResolvedValue({
    data: { data: { drafts: [] } },
  }),
}));

// Stub layout components that require AuthProvider / other contexts
vi.mock('../../src/components/common/smallsidebar', () => ({
  default: () => null,
}));
vi.mock('../../src/components/content/GeneratedIdeasList', () => ({
  default: () => null,
}));
vi.mock('../../src/components/Schedule/ContentLibrarySidebar', () => ({
  default: ({ drafts }: { drafts?: any[] }) => (
    <div data-testid="content-library">
      {(drafts ?? []).map((d: any) => (
        <div key={d.id} data-testid={`library-card-${d.id}`}>{d.content_title}</div>
      ))}
    </div>
  ),
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

// ── Imports after mocks ──────────────────────────────────────────
import {
  generateDrafts,
  approveIdea,
  rejectIdea,
  type GeneratedScheduleDraft,
  type ApproveIdeaResult,
} from '../../src/services/contentService';
import { fetchDrafts } from '../../src/services/scheduleService';

// ── Fixtures ─────────────────────────────────────────────────────
const sampleDrafts: GeneratedScheduleDraft[] = [
  {
    id: 'idea-1',
    prompt_id: 'p-1',
    content_title: 'Spicy Wings Monday',
    tiktok_caption: 'Come try our hottest drop 🔥',
    hashtag: ['#KrenchChicken', '#BogorFood'],
    category: 'PROMOTION',
    status: 'pending_validation',
    ai_model_used: 'claude-sonnet-4-6',
    generated_image_url: null,
  },
  {
    id: 'idea-2',
    prompt_id: 'p-1',
    content_title: 'Behind the Fryer',
    tiktok_caption: 'From 6AM to lunch ⏰',
    hashtag: ['#KrenchChicken', '#BehindTheScenes'],
    category: 'BEHIND-THE-SCENES',
    status: 'pending_validation',
    ai_model_used: 'claude-sonnet-4-6',
    generated_image_url: null,
  },
];

const approveResult: ApproveIdeaResult = {
  idea_id: 'idea-1',
  schedule_id: 'sched-abc',
  schedule_status: 'draft',
  content_title: 'Spicy Wings Monday',
  tiktok_caption: 'Come try our hottest drop 🔥',
  hashtag: ['#KrenchChicken', '#BogorFood'],
  category: 'PROMOTION',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/calendar/ideas']}>
      <GeneratedIdeasPage />
    </MemoryRouter>,
  );
}

async function generateAndWait() {
  fireEvent.change(screen.getByPlaceholderText(/Deskripsikan/i), {
    target: { value: '3 konten TikTok minggu ini untuk Krench' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Generate Ideas/i }));
  await screen.findByText('Spicy Wings Monday');
}

// ── Tests ─────────────────────────────────────────────────────────
describe('GeneratedIdeasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one card per returned draft after Generate', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    renderPage();
    await generateAndWait();
    expect(screen.getByText('Spicy Wings Monday')).toBeInTheDocument();
    expect(screen.getByText('Behind the Fryer')).toBeInTheDocument();
  });

  it('Approve calls approveIdea with the correct idea id', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (approveIdea as Mock).mockResolvedValue(approveResult);
    renderPage();
    await generateAndWait();

    fireEvent.click(screen.getAllByRole('button', { name: /Approve/i })[0]!);

    await waitFor(() => {
      expect(approveIdea).toHaveBeenCalledTimes(1);
      expect(approveIdea).toHaveBeenCalledWith('idea-1');
    });
  });

  it('Approve does NOT navigate away — page stays on /calendar/ideas', async () => {
    // MemoryRouter's location does not change — verify by confirming the page
    // heading is still present after approval.
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (approveIdea as Mock).mockResolvedValue(approveResult);
    renderPage();
    await generateAndWait();

    fireEvent.click(screen.getAllByRole('button', { name: /Approve/i })[0]!);
    await waitFor(() => expect(approveIdea).toHaveBeenCalled());

    // Page heading must still be present — proves we did not navigate away
    expect(screen.getByRole('heading', { name: /Generate Ideas/i })).toBeInTheDocument();
  });

  it('Approve adds the draft card to the Content Library sidebar', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (approveIdea as Mock).mockResolvedValue(approveResult);
    renderPage();
    await generateAndWait();

    fireEvent.click(screen.getAllByRole('button', { name: /Approve/i })[0]!);
    await waitFor(() => expect(approveIdea).toHaveBeenCalled());

    // The sidebar mock renders a card with data-testid="library-card-{schedule_id}"
    await waitFor(() => {
      expect(screen.getByTestId('library-card-sched-abc')).toBeInTheDocument();
      expect(screen.getByTestId('library-card-sched-abc')).toHaveTextContent('Spicy Wings Monday');
    });
  });

  it('loads existing drafts from the nested API envelope', async () => {
    (fetchDrafts as Mock).mockResolvedValue({
      data: {
        data: {
          drafts: [
            {
              id: 'draft-existing-1',
              content_title: 'Existing Draft',
              tiktok_caption: 'From existing source',
              status: 'draft',
              created_at: '2026-05-20T09:00:00.000Z',
              custom_caption: 'Existing Draft',
            },
          ],
        },
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('library-card-draft-existing-1')).toBeInTheDocument();
      expect(screen.getByTestId('library-card-draft-existing-1')).toHaveTextContent('Existing Draft');
    });
  });

  it('Reject click opens reason prompt and sends payload', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (rejectIdea as Mock).mockResolvedValue({ idea_id: 'idea-2' });
    renderPage();
    await generateAndWait();

    // Open reject for second card — all Reject buttons (including Approve row): pick last non-Approve
    const rejectButtons = screen.getAllByRole('button', { name: /^Reject$/i });
    fireEvent.click(rejectButtons[1]!);

    const reasonBox = await screen.findByPlaceholderText(/Contoh:/i);
    fireEvent.change(reasonBox, { target: { value: 'Music licence issue' } });
    // "Reject" button inside the reason panel confirms with reason
    const confirmButtons = screen.getAllByRole('button', { name: /^Reject$/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(rejectIdea).toHaveBeenCalledWith('idea-2', 'Music licence issue');
    });
  });

  it('Reject without reason sends null', async () => {
    (generateDrafts as Mock).mockResolvedValue(sampleDrafts);
    (rejectIdea as Mock).mockResolvedValue({ idea_id: 'idea-1' });
    renderPage();
    await generateAndWait();

    fireEvent.click(screen.getAllByRole('button', { name: /^Reject$/i })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: /Skip & Reject/i }));

    await waitFor(() => {
      expect(rejectIdea).toHaveBeenCalledWith('idea-1', null);
    });
  });
});
