// frontend/src/pages/content/GeneratedIdeasPage.tsx
// Session 9 — UC004/UC005 UX upgrade.
// Renders the Figma-style 2–3 approve/reject card flow.
// Stakeholder rule #2: this file existed before Session 9. We keep its
// component identity and add the new behaviour inside the same file.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LEADFLOW_BG,
  LEADFLOW_CARD,
  LEADFLOW_HEADER_GRADIENT,
} from '../../utils/contentModuleTheme';
import {
  approveIdea,
  generateDrafts,
  rejectIdea,
  type GeneratedScheduleDraft,
} from '../../services/contentService';
import { useNotification } from '../../context/NotificationContext';
import { fLongDateTime } from '../../utils/formatDate';

type CardState = 'idle' | 'approving' | 'rejecting' | 'fading';

interface DraftCardViewModel extends GeneratedScheduleDraft {
  ui_state: CardState;
}

export default function GeneratedIdeasPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useNotification();
  const [brief, setBrief] = useState('');
  const [lastBrief, setLastBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftCardViewModel[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function populateDrafts(briefText: string, append = false): Promise<void> {
    const normalizedBrief = briefText.trim();
    if (normalizedBrief.length < 5) {
      toast.error('Brief must be at least 5 characters');
      return;
    }

    if (!append) {
      setLastBrief(normalizedBrief);
    }

    setLoading(true);
    try {
      const resp = await generateDrafts(normalizedBrief);
      const enriched: DraftCardViewModel[] = resp.map((draft) => ({ ...draft, ui_state: 'idle' }));

      setDrafts((prev) => {
        if (!append) return enriched;
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...enriched.filter((item) => !seen.has(item.id))].slice(0, 3);
      });

      if (enriched.length === 0) {
        toast.warning('No valid ideas were returned. Try a different brief.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(): Promise<void> {
    await populateDrafts(brief, false);
  }

  async function handleApprove(idea: DraftCardViewModel): Promise<void> {
    setDrafts((prev) => prev.map((draft) => (draft.id === idea.id ? { ...draft, ui_state: 'approving' } : draft)));

    try {
      const result = await approveIdea(idea.id);
      toast.success('Added to calendar as draft');
      navigate('/calendar', {
        replace: true,
        state: result.schedule_id ? { createdScheduleId: result.schedule_id } : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed');
      setDrafts((prev) => prev.map((draft) => (draft.id === idea.id ? { ...draft, ui_state: 'idle' } : draft)));
    }
  }

  function openRejectPrompt(id: string): void {
    setRejectingId(id);
    setRejectReason('');
  }

  async function confirmReject(withReason: boolean): Promise<void> {
    if (!rejectingId) return;
    const id = rejectingId;
    const reason = withReason ? rejectReason.trim() || null : null;

    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ui_state: 'rejecting' } : draft)));
    setRejectingId(null);
    setRejectReason('');

    try {
      await rejectIdea(id, reason);
      toast.info('Idea rejected');
      setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ui_state: 'fading' } : draft)));

      window.setTimeout(() => {
        setDrafts((prev) => prev.filter((draft) => draft.id !== id));
        if (lastBrief.trim().length >= 5) {
          void populateDrafts(lastBrief, true);
        }
      }, 400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed');
      setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ui_state: 'idle' } : draft)));
    }
  }

  function cancelReject(): void {
    setRejectingId(null);
    setRejectReason('');
  }

  return (
    <div className={LEADFLOW_BG}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className={`${LEADFLOW_HEADER_GRADIENT} rounded-2xl p-6 mb-8 shadow-lg`}>
          <h1 className="text-3xl font-bold">AI Content Assistant</h1>
          <p className="text-white/90 mt-1">Generate trending TikTok schedule drafts for Krench Chicken</p>
        </div>

        {/* Brief input */}
        <div className={`${LEADFLOW_CARD} p-6 mb-8`}>
          <label htmlFor="brief" className="block text-sm font-medium text-gray-700 mb-2">
            What kind of TikTok content do you want this week?
          </label>
          <textarea
            id="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder="Tell me what kind of TikTok content you want this week..."
            className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:outline-none"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || brief.trim().length < 5}
            className="mt-4 w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'AI is thinking through your brief…' : '✨ Generate Ideas'}
          </button>
        </div>

        {/* Draft cards */}
        {drafts.map((draft, index) => (
          <div
            key={draft.id}
            className={`${LEADFLOW_CARD} mb-6 overflow-hidden transition-all duration-300 ${
              draft.ui_state === 'fading' ? 'opacity-0 scale-95' : 'opacity-100'
            }`}
          >
            <div className={`${LEADFLOW_HEADER_GRADIENT} px-6 py-4 flex justify-between items-center`}>
              <span className="text-sm font-bold tracking-wider">📹 {draft.category}</span>
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full">Idea {index + 1}</span>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{draft.idea_title}</h3>

              {draft.hook && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Hook</p>
                  <p className="text-gray-700 italic">"{draft.hook}"</p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Suggested Caption</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 italic">
                  {draft.caption}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {draft.hashtags.map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-green-700">📈 Est. Engagement</p>
                  <p className="text-sm text-green-900 capitalize">{draft.estimated_engagement}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-blue-700">🎵 Suggested Music</p>
                  <p className="text-sm text-blue-900">{draft.suggested_music || '—'}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-blue-700">⏱ Duration</p>
                  <p className="text-sm text-blue-900">{draft.estimated_duration}s</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-blue-700">📅 Best Time (WIB)</p>
                  <p className="text-sm text-blue-900">
                    {draft.best_time_to_post_wib ? fLongDateTime(draft.best_time_to_post_wib) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleApprove(draft)}
                  disabled={draft.ui_state !== 'idle'}
                  className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 transition"
                >
                  {draft.ui_state === 'approving' ? 'Adding…' : '✓ Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => openRejectPrompt(draft.id)}
                  disabled={draft.ui_state !== 'idle'}
                  className="flex-1 py-3 rounded-lg border-2 border-red-400 text-red-600 hover:bg-red-50 font-semibold disabled:opacity-50 transition"
                >
                  ✗ Reject
                </button>
              </div>

              {rejectingId === draft.id && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-2">Why reject? (optional)</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Video production not ready yet"
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-400 focus:outline-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => void confirmReject(false)}
                      className="flex-1 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium"
                    >
                      Skip & reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmReject(true)}
                      className="flex-1 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                    >
                      Reject with reason
                    </button>
                    <button
                      type="button"
                      onClick={cancelReject}
                      className="py-2 px-3 rounded-md bg-white border border-gray-300 text-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {drafts.length > 0 && !loading && (
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 transition"
          >
            Generate More Ideas
          </button>
        )}
      </div>
    </div>
  );
}
