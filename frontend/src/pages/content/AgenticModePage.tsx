// frontend/src/pages/content/AgenticModePage.tsx
// Agentic Mode (PLAN.md). Route: /calendar/ideas/agentic-mode.
// 3-state machine: Form -> Running -> Result. Run-once only this slice —
// daily/recurring auto-run needs agent_schedules CRUD + Cloud Scheduler,
// neither of which exist yet (see PLAN.md §13/§14, deferred to a later
// session so the toggle is never visible-but-broken).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerAgent, type AgentRun, type TriggerAgentPayload } from '../../services/agentService';
import { useSchedule } from '../../hooks/useSchedule';
import { useNotification } from '../../context/NotificationContext';
import SmallSidebar from '../../components/common/smallsidebar';
import ContentLibrarySidebar from '../../components/Schedule/ContentLibrarySidebar';
import AgentPreferenceForm from '../../components/content/AgentPreferenceForm';
import AgentRunningPanel from '../../components/content/AgentRunningPanel';
import AgentResultSummary from '../../components/content/AgentResultSummary';

type ViewState = 'form' | 'running' | 'result';

export default function AgenticModePage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useNotification();
  const { drafts: scheduleDrafts, schedules } = useSchedule();

  const [view, setView] = useState<ViewState>('form');
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [finishedRun, setFinishedRun] = useState<AgentRun | null>(null);

  async function handleSubmit(payload: TriggerAgentPayload): Promise<void> {
    setSubmitting(true);
    try {
      const { run_id } = await triggerAgent(payload);
      setRunId(run_id);
      setView('running');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start agent run');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone(run: AgentRun): void {
    setFinishedRun(run);
    setView('result');
    if (run.status === 'success') toast.success('Agent finished — drafts are ready to review');
    else if (run.status === 'partial') toast.warning('Agent finished with some ideas skipped');
    else toast.error('Agent run failed');
  }

  function handleRunAgain(): void {
    setRunId(null);
    setFinishedRun(null);
    setView('form');
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SmallSidebar />

      <div className="flex-1 flex">
        <ContentLibrarySidebar drafts={scheduleDrafts} schedules={schedules} />

        <div className="flex-1">
          <div className="relative max-w-3xl mx-auto px-5 py-8 lg:py-10">
            <div className="flex items-center gap-4 mb-8">
              <button
                type="button"
                onClick={() => navigate('/calendar/ideas')}
                className="w-9 h-9 rounded-xl border border-gray-300 bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="text-[10px] font-headline font-bold uppercase tracking-[0.28em] text-brand">
                  Agentic Mode
                </p>
                <h1 className="text-xl font-headline font-bold text-gray-900 mt-0.5">
                  Autonomous Content Agent
                </h1>
              </div>
            </div>

            {view === 'form' && (
              <AgentPreferenceForm onSubmit={handleSubmit} submitting={submitting} />
            )}

            {view === 'running' && runId && (
              <AgentRunningPanel runId={runId} onDone={handleDone} />
            )}

            {view === 'result' && finishedRun && (
              <AgentResultSummary run={finishedRun} onRunAgain={handleRunAgain} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
