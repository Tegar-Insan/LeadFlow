// frontend/tests/components/AgentRunningPanel.test.tsx
// Covers the 429-aware exponential backoff in the agent-run polling loop:
// normal polling stays on the 4s base interval, a 429 doubles the wait
// (honoring the server's retryAfterMs floor) capped at 60s, and a
// subsequent successful poll resets the interval back to 4s.
//
// Uses fake timers + act() rather than @testing-library/react's `waitFor`
// (which polls via a real setInterval that fake timers would freeze) —
// vi.advanceTimersByTimeAsync flushes both the mocked timer queue and the
// microtask continuations chained off it.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AgentRunningPanel from '../../src/components/content/AgentRunningPanel';
import { getAgentRun, AgentRunRateLimitError, type AgentRun } from '../../src/services/agentService';

vi.mock('../../src/services/agentService', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/agentService')>(
    '../../src/services/agentService',
  );
  return { ...actual, getAgentRun: vi.fn() };
});

const mockGetAgentRun = vi.mocked(getAgentRun);

function makeRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: 'run-1',
    schedule_id: null,
    trigger_source: 'manual',
    status: 'running',
    ideas_requested: 3,
    ideas_created: 0,
    current_step: null,
    error_message: null,
    triggered_by: 'user-1',
    created_at: '2026-06-24T00:00:00Z',
    updated_at: '2026-06-24T00:00:00Z',
    ...overrides,
  };
}

async function flush(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('AgentRunningPanel polling backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetAgentRun.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls again at the base 4s interval after a normal successful poll', async () => {
    mockGetAgentRun.mockResolvedValue(makeRun());
    render(<AgentRunningPanel runId="run-1" onDone={vi.fn()} />);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(1);

    await flush(0);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(1);

    await flush(3999);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(1);

    await flush(1);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially after a 429 and surfaces a retry message', async () => {
    mockGetAgentRun.mockRejectedValueOnce(new AgentRunRateLimitError(8000));
    render(<AgentRunningPanel runId="run-1" onDone={vi.fn()} />);
    await flush(0);

    expect(screen.getByText(/rate limited/i)).toBeInTheDocument();

    // Should NOT retry at the base 4s — it must honor the 8s floor from the server.
    await flush(4000);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(1);

    mockGetAgentRun.mockResolvedValueOnce(makeRun());
    await flush(4001);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(2);
  });

  it('doubles the backoff on consecutive 429s, then resets to 4s on success', async () => {
    mockGetAgentRun.mockRejectedValueOnce(new AgentRunRateLimitError(4000));
    render(<AgentRunningPanel runId="run-1" onDone={vi.fn()} />);
    await flush(0);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(1);

    // 1st 429: backoff -> max(4000*2, 4000) = 8000ms
    mockGetAgentRun.mockRejectedValueOnce(new AgentRunRateLimitError(4000));
    await flush(8000);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(2);

    // 2nd 429: backoff -> max(8000*2, 4000) = 16000ms
    mockGetAgentRun.mockResolvedValueOnce(makeRun());
    await flush(16000);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(3);

    // Reset to base 4s after the success above.
    mockGetAgentRun.mockResolvedValueOnce(makeRun());
    await flush(4000);
    expect(mockGetAgentRun).toHaveBeenCalledTimes(4);
  });

  it('shows current_step from the run when present, replacing the static caption', async () => {
    mockGetAgentRun.mockResolvedValue(makeRun({ current_step: 'Searching trends via Tavily…' }));
    render(<AgentRunningPanel runId="run-1" onDone={vi.fn()} />);
    await flush(0);

    expect(screen.getByText('Searching trends via Tavily…')).toBeInTheDocument();
    expect(screen.queryByText(/Searching trends, writing copy/i)).not.toBeInTheDocument();
  });

  it('falls back to the static caption when current_step is null', async () => {
    mockGetAgentRun.mockResolvedValue(makeRun({ current_step: null }));
    render(<AgentRunningPanel runId="run-1" onDone={vi.fn()} />);
    await flush(0);

    expect(screen.getByText(/Searching trends, writing copy/i)).toBeInTheDocument();
  });

  it('calls onDone once the run leaves the running state', async () => {
    const onDone = vi.fn();
    mockGetAgentRun.mockResolvedValue(makeRun({ status: 'success', ideas_created: 3 }));
    render(<AgentRunningPanel runId="run-1" onDone={onDone} />);
    await flush(0);

    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });
});
