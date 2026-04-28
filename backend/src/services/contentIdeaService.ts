// backend/src/services/contentIdeaService.ts
// Session 9 rewrite (2026-04-24):
//   OLD: returned a free-form chat string (UC004 Consult-style).
//   NEW: returns Array<GeneratedScheduleDraft>, 2–3 structured items,
//        inserts them into content_ideas with status='pending_validation'.
//
// Stakeholder Decision D1: model = claude-sonnet-4-6 (env: ANTHROPIC_CONTENT_MODEL)
// Stakeholder Decision D2: rejected ideas are SOFT-deleted (handled in IdeaValidationController)
// SRS Refs: UC004 Input Prompt Idea, UC005 Generate Content Idea

import { getAnthropicClient, ANTHROPIC_MODEL } from '../config/anthropic.ts';
import { supabaseAdmin as supabase } from '../config/supabase.ts';
import logger from '../utils/logger.ts';

// ---------------------------------------------------------------------------
// Public contract — what the frontend consumes
// ---------------------------------------------------------------------------
export interface GeneratedScheduleDraft {
  id: string;                            // content_ideas.id after insert
  prompt_id: string;
  idea_title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  suggested_music: string;
  estimated_duration: number;            // seconds
  estimated_engagement: 'low' | 'medium' | 'high';
  best_time_to_post_wib: string;         // ISO 8601 with +07:00 offset
  category:
    | 'BEHIND-THE-SCENES'
    | 'MENU-SHOWCASE'
    | 'PROMOTION'
    | 'TESTIMONIAL'
    | 'TRENDING';
  status: 'pending_validation';
  ai_model_used: string;
}

// Intermediate shape — only fields the model fills. DB-assigned fields are added after insert.
interface ModelDraft {
  idea_title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  suggested_music: string;
  estimated_duration: number;
  estimated_engagement: 'low' | 'medium' | 'high';
  best_time_to_post_wib: string;
  category: GeneratedScheduleDraft['category'];
}

const MODEL_ID = process.env.ANTHROPIC_CONTENT_MODEL ?? ANTHROPIC_MODEL;
const MAX_DRAFTS = 3;
const MIN_DRAFTS = 2;

// ---------------------------------------------------------------------------
// System prompt — forces the model to emit a JSON array matching ModelDraft[].
// WIB peak windows chosen per Indonesian TikTok audience research (11–13, 19–21).
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a TikTok marketing strategist for Krench Chicken, a fried chicken restaurant in Bogor, West Java, Indonesia.

Given a marketing brief, you produce EXACTLY 2 or 3 content ideas — no more, no fewer.

Return ONLY a valid JSON array. No prose, no markdown fences, no commentary before or after.

Each element must match this TypeScript shape exactly:
{
  "idea_title": string,                // <= 80 chars, punchy
  "hook": string,                      // opening line for first 3 seconds of video
  "caption": string,                   // full TikTok caption, 2–4 sentences
  "hashtags": string[],                // 4–7 items, each starts with '#'
  "suggested_music": string,           // e.g. "Trending Indonesian pop 2026"
  "estimated_duration": number,        // seconds, 15–60
  "estimated_engagement": "low" | "medium" | "high",
  "best_time_to_post_wib": string,     // ISO 8601 with "+07:00" offset, within next 7 days,
                                       // and within WIB peak windows: 11:00–13:00 OR 19:00–21:00
  "category": "BEHIND-THE-SCENES" | "MENU-SHOWCASE" | "PROMOTION" | "TESTIMONIAL" | "TRENDING"
}

Rules:
- Mix categories across the 2–3 ideas (do not return three of the same category).
- Hashtags must include "#KrenchChicken" and "#BogorFood" plus 2–5 contextual ones.
- best_time_to_post_wib must be a real future date within the next 7 days.
- Captions may mix English and casual Bahasa Indonesia — this matches the brand voice.`;

// ---------------------------------------------------------------------------
// Helper: parse and validate the model output
// ---------------------------------------------------------------------------
function parseModelOutput(raw: string): ModelDraft[] {
  // Strip code fences the model sometimes adds despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error('[contentIdeaService] JSON parse failed', { raw: cleaned.slice(0, 500), err });
    return [];
  }

  if (!Array.isArray(parsed)) {
    logger.error('[contentIdeaService] model returned non-array', { type: typeof parsed });
    return [];
  }

  const valid: ModelDraft[] = [];
  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ModelDraft).idea_title === 'string' &&
      typeof (item as ModelDraft).caption === 'string' &&
      Array.isArray((item as ModelDraft).hashtags) &&
      typeof (item as ModelDraft).best_time_to_post_wib === 'string'
    ) {
      valid.push(item as ModelDraft);
    } else {
      logger.warn('[contentIdeaService] skipping malformed draft', { item });
    }
  }

  // Hard clamp — never trust the model's count
  return valid.slice(0, MAX_DRAFTS);
}

// ---------------------------------------------------------------------------
// MAIN: generate drafts from a marketing brief
// ---------------------------------------------------------------------------
export async function generateScheduleDraftsFromBrief(
  brief: string,
  userId: string,
): Promise<GeneratedScheduleDraft[]> {
  if (!brief || brief.trim().length < 5) {
    throw new Error('Brief must be at least 5 characters');
  }

  // 1. Persist the prompt
  const { data: promptRow, error: promptErr } = await supabase
    .from('prompts')
    .insert({ prompt_text: brief.trim(), user_id: userId })
    .select('id')
    .single();

  if (promptErr || !promptRow) {
    logger.error('[contentIdeaService] failed to insert prompt', { promptErr });
    throw new Error('Failed to save prompt');
  }
  const promptId: string = promptRow.id;

  // 2. Call Claude Sonnet 4.6
  let modelDrafts: ModelDraft[] = [];
  try {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      throw new Error('Anthropic client not available');
    }

    const response = await anthropic.messages.create({
      model: MODEL_ID,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: brief.trim() }],
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;

    if (!textBlock) {
      logger.error('[contentIdeaService] no text block in Claude response');
      return [];
    }

    modelDrafts = parseModelOutput(textBlock.text);
  } catch (err) {
    logger.error('[contentIdeaService] Anthropic call failed', { err });
    throw new Error('AI generation failed');
  }

  if (modelDrafts.length < MIN_DRAFTS) {
    logger.warn('[contentIdeaService] model returned fewer than 2 valid drafts', {
      count: modelDrafts.length,
    });
    // We still insert what we have; the UI tells the user to regenerate if 0.
  }

  // 3. Insert each draft as a pending_validation idea
  const inserted: GeneratedScheduleDraft[] = [];
  for (const d of modelDrafts) {
    const { data: ideaRow, error: ideaErr } = await supabase
      .from('content_ideas')
      .insert({
        prompt_id: promptId,
        created_by: userId,
        idea_title: d.idea_title,
        hook: d.hook,
        caption: d.caption,
        hashtags: d.hashtags,
        suggested_music: d.suggested_music,
        estimated_duration: d.estimated_duration,
        status: 'pending_validation',
        ai_model_used: MODEL_ID, // explicit override of migration 005's 'gpt-4o' default
      })
      .select('id')
      .single();

    if (ideaErr || !ideaRow) {
      logger.error('[contentIdeaService] failed to insert idea', { ideaErr, draft: d });
      continue;
    }

    inserted.push({
      id: ideaRow.id,
      prompt_id: promptId,
      idea_title: d.idea_title,
      hook: d.hook,
      caption: d.caption,
      hashtags: d.hashtags,
      suggested_music: d.suggested_music,
      estimated_duration: d.estimated_duration,
      estimated_engagement: d.estimated_engagement,
      best_time_to_post_wib: d.best_time_to_post_wib,
      category: d.category,
      status: 'pending_validation',
      ai_model_used: MODEL_ID,
    });
  }

  logger.info('[contentIdeaService] drafts generated', {
    promptId,
    count: inserted.length,
    model: MODEL_ID,
  });

  return inserted;
}

// ---------------------------------------------------------------------------
// List currently-pending ideas for a user (soft-delete consequence: must filter)
// ---------------------------------------------------------------------------
export async function listPendingIdeasForUser(userId: string): Promise<GeneratedScheduleDraft[]> {
  const { data, error } = await supabase
    .from('content_ideas')
    .select(
      'id, prompt_id, idea_title, hook, caption, hashtags, suggested_music, ' +
        'estimated_duration, status, ai_model_used, created_at',
    )
    .eq('created_by', userId)
    .eq('status', 'pending_validation') // critical filter — soft-deleted rows would otherwise appear
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[contentIdeaService] failed to list pending ideas', { error });
    throw new Error('Failed to fetch pending ideas');
  }

  // Engagement/time/category are not columns — the UI falls back to defaults when listing historicals
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    prompt_id: string;
    idea_title: string;
    hook: string;
    caption: string;
    hashtags: string[] | null;
    suggested_music: string | null;
    estimated_duration: number | null;
    ai_model_used: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    prompt_id: row.prompt_id,
    idea_title: row.idea_title,
    hook: row.hook ?? '',
    caption: row.caption,
    hashtags: row.hashtags ?? [],
    suggested_music: row.suggested_music ?? '',
    estimated_duration: row.estimated_duration ?? 30,
    estimated_engagement: 'medium' as const,
    best_time_to_post_wib: '',
    category: 'TRENDING' as const,
    status: 'pending_validation' as const,
    ai_model_used: row.ai_model_used ?? MODEL_ID,
  }));
}
