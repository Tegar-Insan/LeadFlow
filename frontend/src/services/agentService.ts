// frontend/src/services/agentService.ts
// Agentic Mode (PLAN.md §13). VITE_API_BASE_URL already includes /api — do
// NOT prefix paths with /api again (see contentService.ts's own reminder).

import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface TriggerAgentPayload {
  content_preference: string;
  hashtags: string[];
  preferred_times: string[];
  image_style?: string;
  ideas_per_day: number;
  date_from: string;
  date_to: string;
}

export interface AgentRun {
  id: string;
  schedule_id: string | null;
  trigger_source: 'manual' | 'cron';
  status: 'running' | 'success' | 'partial' | 'failed';
  ideas_requested: number;
  ideas_created: number;
  current_step: string | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
  updated_at: string;
}

// Thrown by getAgentRun on a 429 so callers (AgentRunningPanel's poll loop)
// can back off instead of treating it like any other transient failure.
// retryAfterMs comes from rateLimiter.ts's makeHandler body when present.
export class AgentRunRateLimitError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super('Agent run status rate limit exceeded');
    this.name = 'AgentRunRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

const DEFAULT_RATE_LIMIT_RETRY_MS = 60_000;

// ── Agent schedule settings (Phase 2) ───────────────────────────────────────

export interface AgentScheduleSettings {
  id: string;
  content_preference: string;
  hashtags: string[];
  preferred_times: string[];
  image_style: string | null;
  ideas_per_day: number;
  run_time: string;
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string;
}

export async function getAgentSettings(): Promise<AgentScheduleSettings | null> {
  const res = await axios.get(`${BASE}/agent/settings`, { headers: authHeaders() });
  return res.data.data;
}

export async function patchAgentSettings(
  data: Partial<Omit<AgentScheduleSettings, 'id' | 'created_by'>>,
): Promise<AgentScheduleSettings> {
  const res = await axios.patch(`${BASE}/agent/settings`, data, { headers: authHeaders() });
  return res.data.data;
}

export async function triggerTodayAgent(): Promise<{ triggered: boolean; reason?: string; run_id?: string }> {
  const res = await axios.post(`${BASE}/agent/trigger-today`, {}, { headers: authHeaders() });
  return res.data.data;
}

export async function triggerAgent(payload: TriggerAgentPayload): Promise<{ run_id: string }> {
  const res = await axios.post(`${BASE}/agent/trigger`, payload, { headers: authHeaders() });
  return res.data.data;
}

export async function getAgentRun(runId: string): Promise<AgentRun> {
  try {
    const res = await axios.get(`${BASE}/agent/runs/${runId}`, { headers: authHeaders() });
    return res.data.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      const retryAfterMs = Number(err.response.data?.retryAfterMs) || DEFAULT_RATE_LIMIT_RETRY_MS;
      throw new AgentRunRateLimitError(retryAfterMs);
    }
    throw err;
  }
}
