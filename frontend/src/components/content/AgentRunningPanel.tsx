// frontend/src/components/content/AgentRunningPanel.tsx
// Agentic Mode (PLAN.md §13). Polls GET /agent/runs/:id every 4s — no
// Socket.IO relay exists yet for live "agent:progress" events, so polling
// is the working substitute for this slice.
//
// 429s from the dedicated agent-run-status rate limiter (60 req/60s — see
// backend/src/middleware/rateLimiter.ts) back off exponentially instead of
// retrying at the fixed base interval, which is what previously turned one
// long-running agent job into a 429 storm. Any other error keeps the
// original fixed-interval retry; the backoff state only resets on a
// genuine successful response.
import { useEffect, useRef, useState } from 'react';
import { getAgentRun, AgentRunRateLimitError, type AgentRun } from '../../services/agentService';

interface AgentRunningPanelProps {
  runId: string;
  onDone: (run: AgentRun) => void;
}

const BASE_INTERVAL_MS = 4000;
const MAX_BACKOFF_MS = 60_000;

export default function AgentRunningPanel({ runId, onDone }: AgentRunningPanelProps): JSX.Element {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let backoffMs = BASE_INTERVAL_MS;

    async function poll(): Promise<void> {
      try {
        const latest = await getAgentRun(runId);
        if (cancelled) return;
        backoffMs = BASE_INTERVAL_MS;
        setRun(latest);
        setPollError(null);
        if (latest.status === 'running') {
          timer = setTimeout(poll, BASE_INTERVAL_MS);
        } else {
          onDoneRef.current(latest);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AgentRunRateLimitError) {
          backoffMs = Math.min(Math.max(backoffMs * 2, err.retryAfterMs), MAX_BACKOFF_MS);
          setPollError(`Rate limited — retrying in ${Math.round(backoffMs / 1000)}s…`);
          timer = setTimeout(poll, backoffMs);
        } else {
          setPollError('Could not reach the agent service — retrying…');
          timer = setTimeout(poll, BASE_INTERVAL_MS);
        }
      }
    }

    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [runId]);

  const requested = run?.ideas_requested ?? 0;
  const created = run?.ideas_created ?? 0;
  const pct = requested > 0 ? Math.min(100, Math.round((created / requested) * 100)) : 0;

  return (
    <div className="rounded-3xl border border-gray-300 bg-white px-8 py-14 flex flex-col items-center gap-5 text-center">
      <div className="flex items-end gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-brand animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, boxShadow: '0 0 8px rgba(246,183,10,0.6)' }}
          />
        ))}
      </div>
      <div>
        <p className="text-sm font-headline font-semibold text-gray-700">Agent is working…</p>
        <p className="text-xs text-gray-500 font-body mt-1">
          {run?.current_step || 'Searching trends, writing copy, generating images, and scheduling slots.'}
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-500 font-body mt-2">
          {created} of {requested} ideas created
        </p>
      </div>

      {pollError && (
        <p className="text-[11px] text-amber-600 font-body">{pollError}</p>
      )}
    </div>
  );
}
