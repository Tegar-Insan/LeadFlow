// frontend/src/components/content/AgentScheduleCard.tsx
// Phase 2: User ↔ Agent relationship — lets marketing_staff configure the
// daily auto-trigger stored in agent_schedules and see today's run status.

import { useState, useEffect } from 'react';
import Switch from '../common/Switch';
import { InlineLoader } from '../common/KineticLoader';
import {
  getAgentSettings,
  patchAgentSettings,
  type AgentScheduleSettings,
} from '../../services/agentService';
import { useNotification } from '../../context/NotificationContext';

interface AgentScheduleCardProps {
  /** Called after a successful save so the parent can react (e.g. refresh today status) */
  onSaved?: (settings: AgentScheduleSettings) => void;
}

function isToday(isoString: string | null): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function fTime(isoString: string | null): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

export default function AgentScheduleCard({ onSaved }: AgentScheduleCardProps): JSX.Element {
  const { toast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AgentScheduleSettings | null>(null);

  // Form fields
  const [active, setActive]               = useState(false);
  const [runTime, setRunTime]             = useState('19:00');
  const [brief, setBrief]                 = useState('');
  const [ideasPerDay, setIdeasPerDay]     = useState(3);

  useEffect(() => {
    getAgentSettings()
      .then((s) => {
        setSettings(s);
        if (s) {
          setActive(s.active);
          setRunTime(s.preferred_times[0] ?? s.run_time ?? '19:00');
          setBrief(s.content_preference ?? '');
          setIdeasPerDay(s.ideas_per_day ?? 3);
        }
      })
      .catch(() => { /* silently — card shows empty/default state */ })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(): Promise<void> {
    if (brief.trim().length < 5) {
      toast.error('Brief minimal 5 karakter');
      return;
    }
    setSaving(true);
    try {
      const updated = await patchAgentSettings({
        active,
        run_time:           runTime,
        preferred_times:    [runTime],
        content_preference: brief.trim(),
        ideas_per_day:      ideasPerDay,
        hashtags:           settings?.hashtags ?? [],
        image_style:        settings?.image_style ?? null,
      });
      setSettings(updated);
      toast.success('Daily schedule disimpan');
      onSaved?.(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  // Derive today's status from last_run_at
  const ranToday     = isToday(settings?.last_run_at ?? null);
  const lastRunTime  = fTime(settings?.last_run_at ?? null);
  const isConfigured = !!settings;

  return (
    <div className="rounded-3xl border border-gray-300 bg-white overflow-hidden">
      {/* Brand accent stripe */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

      <div className="px-6 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-headline font-bold uppercase tracking-[0.28em] text-brand">
              Auto Schedule
            </p>
            <h2 className="text-base font-headline font-bold text-gray-900 mt-0.5">
              Daily Agent Schedule
            </h2>
          </div>

          {loading ? (
            <InlineLoader size="sm" />
          ) : (
            <Switch
              checked={active}
              onChange={setActive}
              label={active ? 'Active' : 'Inactive'}
              disabled={saving}
            />
          )}
        </div>

        {/* Today's status badge */}
        {!loading && (
          <div className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 border ${
            ranToday
              ? 'bg-green-50 border-green-200'
              : isConfigured && active
                ? 'bg-amber-50 border-amber-200'
                : 'bg-gray-50 border-gray-200'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              ranToday ? 'bg-green-500' : isConfigured && active ? 'bg-amber-400' : 'bg-gray-400'
            }`} />
            <p className={`text-xs font-body ${
              ranToday ? 'text-green-700' : isConfigured && active ? 'text-amber-700' : 'text-gray-500'
            }`}>
              {ranToday
                ? `Ran today at ${lastRunTime} WIB`
                : isConfigured && active
                  ? `Scheduled — next run at ${runTime} WIB`
                  : 'Not configured — save a schedule to enable auto-run'}
            </p>
          </div>
        )}

        {/* Run time */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            Run Time (WIB)
          </p>
          <input
            type="time"
            value={runTime}
            onChange={(e) => setRunTime(e.target.value)}
            disabled={saving || loading}
            className="rounded-xl bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand/40 focus:bg-white transition-all font-body disabled:opacity-50"
          />
          <p className="text-[10px] text-gray-400 font-body mt-1.5">
            Agent fires once daily at this time. Second opens are skipped automatically.
          </p>
        </div>

        {/* Brief */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            Daily Brief
          </p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="Apa fokus konten minggu ini? Contoh: promo ayam goreng weekend, gaya santai Gen-Z Bogor"
            disabled={saving || loading}
            className="w-full rounded-2xl bg-gray-50 border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none resize-none focus:border-brand/40 focus:bg-white transition-all font-body leading-relaxed min-h-[80px] disabled:opacity-50"
          />
        </div>

        {/* Ideas per day */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            Ideas per Day
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIdeasPerDay((n) => Math.max(1, n - 1))}
              disabled={saving || loading}
              className="w-9 h-9 rounded-xl border border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors text-lg leading-none"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-headline font-bold text-gray-900">
              {ideasPerDay}
            </span>
            <button
              type="button"
              onClick={() => setIdeasPerDay((n) => Math.min(5, n + 1))}
              disabled={saving || loading}
              className="w-9 h-9 rounded-xl border border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors text-lg leading-none"
            >
              +
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="w-full h-11 rounded-2xl bg-brand text-black text-sm font-headline font-bold hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_4px_20px_rgba(246,183,10,0.18)] hover:shadow-[0_4px_28px_rgba(246,183,10,0.32)] flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <InlineLoader size="sm" className="text-black" />
              Menyimpan…
            </>
          ) : (
            'Save Schedule'
          )}
        </button>
      </div>
    </div>
  );
}
