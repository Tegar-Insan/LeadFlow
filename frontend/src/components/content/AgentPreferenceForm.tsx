// frontend/src/components/content/AgentPreferenceForm.tsx
// Agentic Mode (PLAN.md §13) — run-once only this slice (no daily/recurring
// toggle yet; agent_schedules CRUD + Cloud Scheduler aren't wired).
import { useState } from 'react';
import Button from '../common/button';
import Switch from '../common/Switch';
import type { TriggerAgentPayload } from '../../services/agentService';

interface AgentPreferenceFormProps {
  onSubmit: (payload: TriggerAgentPayload) => void;
  submitting: boolean;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const inDaysISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function AgentPreferenceForm({ onSubmit, submitting }: AgentPreferenceFormProps): JSX.Element {
  const [contentPreference, setContentPreference] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [timeInput, setTimeInput] = useState('19:00');
  const [preferredTimes, setPreferredTimes] = useState<string[]>(['19:00']);
  const [ideasPerDay, setIdeasPerDay] = useState(3);
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(inDaysISO(6));
  const [customImageStyle, setCustomImageStyle] = useState(false);
  const [imageStyle, setImageStyle] = useState('');

  function addHashtag(): void {
    const tag = hashtagInput.trim().replace(/^#?/, '#');
    if (tag.length <= 1) return;
    if (!hashtags.includes(tag)) setHashtags((prev) => [...prev, tag]);
    setHashtagInput('');
  }

  function removeHashtag(tag: string): void {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  }

  function addTime(): void {
    if (!timeInput || preferredTimes.includes(timeInput)) return;
    setPreferredTimes((prev) => [...prev, timeInput].sort());
  }

  function removeTime(time: string): void {
    setPreferredTimes((prev) => prev.filter((t) => t !== time));
  }

  const isValid =
    contentPreference.trim().length >= 5 &&
    preferredTimes.length > 0 &&
    dateFrom <= dateTo &&
    ideasPerDay >= 1;

  function handleSubmit(): void {
    if (!isValid || submitting) return;
    onSubmit({
      content_preference: contentPreference.trim(),
      hashtags,
      preferred_times: preferredTimes,
      image_style: customImageStyle && imageStyle.trim() ? imageStyle.trim() : undefined,
      ideas_per_day: ideasPerDay,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  return (
    <div className="rounded-3xl border border-gray-300 bg-white overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
      <div className="px-6 py-6 space-y-6">

        {/* Content preference */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            Content Preference
          </p>
          <textarea
            value={contentPreference}
            onChange={(e) => setContentPreference(e.target.value)}
            rows={3}
            placeholder="Apa ide konten yang paling kamu mau? Misal: behind-the-scenes dapur, promo weekend, testimoni pelanggan…"
            disabled={submitting}
            className="w-full rounded-2xl bg-gray-50 border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none resize-none focus:border-brand/40 focus:bg-white transition-all font-body leading-relaxed min-h-[90px]"
          />
        </div>

        {/* Hashtags */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            Hashtags
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
              placeholder="KrenchChicken"
              disabled={submitting}
              className="flex-1 rounded-xl bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand/40 focus:bg-white transition-all font-body"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addHashtag} disabled={submitting}>
              Add
            </Button>
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  disabled={submitting}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-brand/[0.08] border border-brand/[0.18] text-brand/80 font-body hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  {tag} ×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preferred posting times */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            Preferred Posting Times (WIB)
          </p>
          <div className="flex gap-2">
            <input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              disabled={submitting}
              className="rounded-xl bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand/40 focus:bg-white transition-all font-body"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTime} disabled={submitting}>
              Add Time
            </Button>
          </div>
          {preferredTimes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {preferredTimes.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => removeTime(time)}
                  disabled={submitting}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300 text-gray-600 font-body hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  {time} WIB ×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            Date Range (WIB)
          </p>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={submitting}
              className="flex-1 rounded-xl bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand/40 focus:bg-white transition-all font-body"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={submitting}
              className="flex-1 rounded-xl bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand/40 focus:bg-white transition-all font-body"
            />
          </div>
        </div>

        {/* Ideas per day */}
        <div>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-gray-600 mb-2">
            How Many Ideas
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIdeasPerDay((n) => Math.max(1, n - 1))}
              disabled={submitting}
              className="w-9 h-9 rounded-xl border border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-headline font-bold text-gray-900">{ideasPerDay}</span>
            <button
              type="button"
              onClick={() => setIdeasPerDay((n) => Math.min(10, n + 1))}
              disabled={submitting}
              className="w-9 h-9 rounded-xl border border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Custom image style toggle */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3.5">
          <Switch
            checked={customImageStyle}
            onChange={setCustomImageStyle}
            label="Customize image style"
            description="Off uses Krench Chicken's default brand-locked look"
            disabled={submitting}
          />
          {customImageStyle && (
            <input
              type="text"
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              placeholder="e.g. bright daylight, top-down flat lay"
              disabled={submitting}
              className="w-full mt-3 rounded-xl bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand/40 transition-all font-body"
            />
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={!isValid}
          loading={submitting}
          className="w-full"
        >
          Run Agent Now
        </Button>

        {!isValid && !submitting && (
          <p className="text-[11px] text-gray-400 font-body text-center">
            Fill in a content preference, at least one posting time, and a valid date range.
          </p>
        )}
      </div>
    </div>
  );
}
