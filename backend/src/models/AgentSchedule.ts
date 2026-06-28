import { supabaseAdmin } from '../config/supabase.ts';
import { nowJakarta, jakartaToUTC } from '../utils/jakartaTime.ts';

// ── Settings CRUD (Phase 2) ──────────────────────────────────────────────────

export interface AgentSettings {
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

const SETTINGS_COLS =
  'id, content_preference, hashtags, preferred_times, image_style, ideas_per_day, run_time, active, last_run_at, next_run_at, created_by';

export async function getSettingsForUser(userId: string): Promise<AgentSettings | null> {
  const { data, error } = await supabaseAdmin
    .from('agent_schedules')
    .select(SETTINGS_COLS)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as AgentSettings;
}

export async function upsertSettingsForUser(
  userId: string,
  payload: Partial<Omit<AgentSettings, 'id' | 'created_by'>>,
): Promise<AgentSettings> {
  const existing = await getSettingsForUser(userId);

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('agent_schedules')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select(SETTINGS_COLS)
      .single();
    if (error || !data) throw new Error(`Failed to update agent settings: ${error?.message}`);
    return data as AgentSettings;
  }

  const { data, error } = await supabaseAdmin
    .from('agent_schedules')
    .insert({ ...payload, created_by: userId, frequency: 'daily' })
    .select(SETTINGS_COLS)
    .single();
  if (error || !data) throw new Error(`Failed to create agent settings: ${error?.message}`);
  return data as AgentSettings;
}

export interface ActiveSchedule {
  id: string;
  content_preference: string;
  hashtags: string[];
  preferred_times: string[];
  image_style: string | null;
  ideas_per_day: number;
  run_time: string;
  created_by: string;
}

export interface CanRunResult {
  canRun: boolean;
  schedule?: ActiveSchedule;
  reason?: 'no_active_schedule' | 'already_ran_today';
}

export async function getActiveScheduleForUser(userId: string): Promise<ActiveSchedule | null> {
  const { data, error } = await supabaseAdmin
    .from('agent_schedules')
    .select('id, content_preference, hashtags, preferred_times, image_style, ideas_per_day, run_time, created_by')
    .eq('created_by', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ActiveSchedule;
}

export async function hasRunToday(userId: string): Promise<boolean> {
  const nowWIB = nowJakarta();
  const todayStart = jakartaToUTC(
    (nowWIB as any).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
  ).toISOString();
  const todayEnd = jakartaToUTC(
    (nowWIB as any).endOf('day').format('YYYY-MM-DD HH:mm:ss'),
  ).toISOString();

  const { data } = await supabaseAdmin
    .from('agent_runs')
    .select('id')
    .eq('triggered_by', userId)
    .in('status', ['running', 'success', 'partial'])
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)
    .limit(1)
    .maybeSingle();

  return !!data;
}

export async function canUserRunAgentToday(userId: string): Promise<CanRunResult> {
  const schedule = await getActiveScheduleForUser(userId);
  if (!schedule) return { canRun: false, reason: 'no_active_schedule' };

  const alreadyRan = await hasRunToday(userId);
  if (alreadyRan) return { canRun: false, reason: 'already_ran_today' };

  return { canRun: true, schedule };
}
