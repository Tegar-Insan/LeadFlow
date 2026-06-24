// frontend/src/components/content/AgentResultSummary.tsx
// Agentic Mode (PLAN.md §13, simplified from "AgentResultGrid"). ai-analyzer's
// agent_runs only exposes counts, not the individual content_queue_schedules
// rows it created — showing real per-idea preview cards would need a new
// endpoint (GET /agent/runs/:id/schedules or similar). Until that exists,
// this is a status summary + a link to the real drafts in Content Library.
import { useNavigate } from 'react-router-dom';
import Button from '../common/button';
import type { AgentRun } from '../../services/agentService';

interface AgentResultSummaryProps {
  run: AgentRun;
  onRunAgain: () => void;
}

const STATUS_COPY: Record<AgentRun['status'], { title: string; tone: string }> = {
  success: { title: 'Done — all ideas created', tone: 'text-emerald-600' },
  partial: { title: 'Partially done', tone: 'text-amber-600' },
  failed: { title: 'Run failed', tone: 'text-red-600' },
  running: { title: 'Still running', tone: 'text-gray-600' },
};

export default function AgentResultSummary({ run, onRunAgain }: AgentResultSummaryProps): JSX.Element {
  const navigate = useNavigate();
  const copy = STATUS_COPY[run.status];

  return (
    <div className="rounded-3xl border border-gray-300 bg-white px-8 py-12 flex flex-col items-center gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
        <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <p className={`text-sm font-headline font-bold ${copy.tone}`}>{copy.title}</p>
        <p className="text-xs text-gray-500 font-body mt-1">
          {run.ideas_created} of {run.ideas_requested} ideas were created as drafts.
        </p>
        {run.error_message && (
          <p className="text-[11px] text-red-500 font-body mt-2 max-w-sm">{run.error_message}</p>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <Button variant="secondary" onClick={onRunAgain}>
          Run Again
        </Button>
        <Button variant="primary" onClick={() => navigate('/calendar/ideas')}>
          View in Content Library
        </Button>
      </div>
    </div>
  );
}
