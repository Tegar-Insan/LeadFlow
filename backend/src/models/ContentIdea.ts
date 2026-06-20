// src/models/ContentIdea.ts
// Business logic moved from services/contentIdeaService.ts + IdeaValidationController.ts
// SRS Refs: UC004 Input Prompt Idea, UC005 Generate Content Idea, UC006 Validate AI Content Ideas
//
// Stakeholder Decision D1: model = claude-sonnet-4-6 (env: ANTHROPIC_CONTENT_MODEL)
// Stakeholder Decision D2: rejected ideas are SOFT-deleted (status='rejected')
//
// Services used here are EXTERNAL API WRAPPERS ONLY (Anthropic, image generation) —
// per MVC discipline, all orchestration/business logic lives in this model.

import { getAnthropicClient, ANTHROPIC_MODEL } from '../config/anthropic.ts';
import { supabaseAdmin as supabase } from '../config/supabase.ts';
import logger from '../utils/logger.ts';
import { retryWithBackoff, ANTHROPIC_RETRY } from '../utils/retryHelper.ts';
import { requestIdeaImage } from '../services/imageGenerationClient.ts';
import * as Prompt from './Prompt.ts';

// ---------------------------------------------------------------------------
// Public contract — what the frontend consumes
// ---------------------------------------------------------------------------
export interface GeneratedScheduleDraft {
  id: string;
  prompt_id: string;
  content_title: string;
  tiktok_caption: string;
  hashtag: string[];
  category:
    | 'BEHIND-THE-SCENES'
    | 'MENU-SHOWCASE'
    | 'PROMOTION'
    | 'TESTIMONIAL'
    | 'TRENDING';
  status: 'pending_validation';
  ai_model_used: string;
  generated_image_url: string | null;
}

export interface GenerationStep {
  stepNumber: number;
  title: string;
  status: 'completed';
  details: string;
  timestamp: string;
}

export interface GenerationWithSteps {
  steps: GenerationStep[];
  drafts: GeneratedScheduleDraft[];
}

interface ModelDraft {
  content_title: string;
  tiktok_caption: string;
  hashtag: string[];
  category: GeneratedScheduleDraft['category'];
}

const MODEL_ID = process.env.ANTHROPIC_CONTENT_MODEL ?? ANTHROPIC_MODEL;
const MAX_DRAFTS = 3;
const MIN_DRAFTS = 2;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'leadflow-media';

// ---------------------------------------------------------------------------
// Image generation — chained onto idea generation (GPT Image 2.0 via
// ai-analyzer). Never throws: a failed image must not break idea generation
// (NFR-002). Mutates `draft.generated_image_url` in place on success.
// ---------------------------------------------------------------------------
async function attachGeneratedImage(draft: GeneratedScheduleDraft): Promise<void> {
  try {
    const image = await requestIdeaImage({
      content_title: draft.content_title,
      tiktok_caption: draft.tiktok_caption,
      category: draft.category,
    });
    if (!image) return;

    const storagePath = `content-ideas/${draft.id}.png`;
    const { error: storageErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, Buffer.from(image.imageBase64, 'base64'), {
        contentType: image.mimeType,
        upsert: true,
      });

    if (storageErr) {
      logger.warn('[ContentIdea] image storage upload failed', { storageErr, ideaId: draft.id });
      return;
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) return;

    const { error: updateErr } = await supabase
      .from('content_ideas')
      .update({ generated_image_url: publicUrl })
      .eq('id', draft.id);

    if (updateErr) {
      logger.warn('[ContentIdea] failed to persist generated_image_url', { updateErr, ideaId: draft.id });
      return;
    }

    draft.generated_image_url = publicUrl;
  } catch (err) {
    logger.warn('[ContentIdea] image generation pipeline failed — continuing without image', {
      err,
      ideaId: draft.id,
    });
  }
}

// ---------------------------------------------------------------------------
// System prompt — forces the model to emit a JSON array matching ModelDraft[].
// WIB peak windows chosen per Indonesian TikTok audience research (11–13, 19–21).
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a TikTok marketing strategist for Krench Chicken, a fried chicken restaurant in Bogor, West Java, Indonesia.

Given a marketing brief, you produce EXACTLY 2 or 3 content ideas — no more, no fewer.

Return ONLY a valid JSON array. No prose, no markdown fences, no commentary before or after.

Each element must match this TypeScript shape exactly:
{
  "content_title": string,             // <= 80 chars, punchy
  "tiktok_caption": string,            // full TikTok caption, 2–4 sentences
  "hashtag": string[],                 // 4–7 items, each starts with '#'
  "category": "BEHIND-THE-SCENES" | "MENU-SHOWCASE" | "PROMOTION" | "TESTIMONIAL" | "TRENDING"
}

Rules:
- Mix categories across the 2–3 ideas (do not return three of the same category).
- Hashtags must include "#KrenchChicken" and "#BogorFood" plus 2–5 contextual ones.
- Captions may mix English and casual Bahasa Indonesia — this matches the brand voice.`;

// ---------------------------------------------------------------------------
// Helper: parse and validate the model output
// ---------------------------------------------------------------------------
function parseModelOutput(raw: string): ModelDraft[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error('[ContentIdea] JSON parse failed', { raw: cleaned.slice(0, 500), err });
    return [];
  }

  if (!Array.isArray(parsed)) {
    logger.error('[ContentIdea] model returned non-array', { type: typeof parsed });
    return [];
  }

  const valid: ModelDraft[] = [];
  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ModelDraft).content_title === 'string' &&
      typeof (item as ModelDraft).tiktok_caption === 'string' &&
      Array.isArray((item as ModelDraft).hashtag)
    ) {
      valid.push(item as ModelDraft);
    } else {
      logger.warn('[ContentIdea] skipping malformed draft', { item });
    }
  }

  return valid.slice(0, MAX_DRAFTS);
}

async function insertDraft(promptId: string, userId: string, d: ModelDraft): Promise<GeneratedScheduleDraft | null> {
  const { data: ideaRow, error: ideaErr } = await supabase
    .from('content_ideas')
    .insert({
      prompt_id: promptId,
      created_by: userId,
      content_title: d.content_title,
      tiktok_caption: d.tiktok_caption,
      hashtag: d.hashtag,
      category: d.category,
      status: 'pending_validation',
      ai_model_used: MODEL_ID,
    })
    .select('id')
    .single();

  if (ideaErr || !ideaRow) {
    logger.error('[ContentIdea] failed to insert idea', { ideaErr, draft: d });
    return null;
  }

  return {
    id: ideaRow.id,
    prompt_id: promptId,
    content_title: d.content_title,
    tiktok_caption: d.tiktok_caption,
    hashtag: d.hashtag,
    category: d.category,
    status: 'pending_validation',
    ai_model_used: MODEL_ID,
    generated_image_url: null,
  };
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

  const promptRow = await Prompt.create({ promptText: brief, userId });
  const promptId = promptRow.id;

  let modelDrafts: ModelDraft[] = [];
  try {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      throw new Error('Anthropic client not available');
    }

    const response = await retryWithBackoff(
      () => anthropic.messages.create({
        model: MODEL_ID,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: brief.trim() }],
      }),
      {
        ...ANTHROPIC_RETRY,
        onRetry: (attempt, delayMs) =>
          logger.warn(`[ContentIdea] rate-limited — retry ${attempt} in ${delayMs}ms`),
      },
    );

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;

    if (!textBlock) {
      logger.error('[ContentIdea] no text block in Claude response');
      return [];
    }

    modelDrafts = parseModelOutput(textBlock.text);
  } catch (err) {
    logger.error('[ContentIdea] Anthropic call failed', { err });
    throw new Error('AI generation failed');
  }

  if (modelDrafts.length < MIN_DRAFTS) {
    logger.warn('[ContentIdea] model returned fewer than 2 valid drafts', { count: modelDrafts.length });
  }

  const inserted: GeneratedScheduleDraft[] = [];
  for (const d of modelDrafts) {
    const draft = await insertDraft(promptId, userId, d);
    if (draft) inserted.push(draft);
  }

  logger.info('[ContentIdea] drafts generated', { promptId, count: inserted.length, model: MODEL_ID });

  // Chain GPT Image 2.0 generation onto idea generation — sequential, not
  // Promise.all: ai-analyzer serializes generation behind a semaphore(1)
  // (tight gpt-image-1 rate limit). Never throws (NFR-002).
  for (const d of inserted) {
    await attachGeneratedImage(d);
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// Generate drafts WITH step-by-step reasoning
// ---------------------------------------------------------------------------
export async function generateScheduleDraftsWithStepsFromBrief(
  brief: string,
  userId: string,
): Promise<GenerationWithSteps> {
  if (!brief || brief.trim().length < 5) {
    throw new Error('Brief must be at least 5 characters');
  }

  const promptRow = await Prompt.create({ promptText: brief, userId });
  const promptId = promptRow.id;

  let modelDrafts: ModelDraft[] = [];
  let steps: GenerationStep[] = [];

  try {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      throw new Error('Anthropic client not available');
    }

    const systemPromptWithSteps = `${SYSTEM_PROMPT}

IMPORTANT: Before returning the ideas, output your THINKING PROCESS.

Format your response EXACTLY like this:
\`\`\`
STEP 1: [Title of this thinking step]
[Detailed explanation of what you analyzed/decided in this step]

STEP 2: [Title of this thinking step]
[Detailed explanation of what you analyzed/decided in this step]

... (continue for 4-5 steps total, dynamically based on the brief) ...

FINAL IDEAS:
[JSON array of 2-3 content ideas]
\`\`\``;

    const response = await retryWithBackoff(
      () => anthropic.messages.create({
        model: MODEL_ID,
        max_tokens: 4096,
        system: systemPromptWithSteps,
        messages: [{ role: 'user', content: brief.trim() }],
      }),
      {
        ...ANTHROPIC_RETRY,
        onRetry: (attempt, delayMs) =>
          logger.warn(`[ContentIdea] rate-limited — retry ${attempt} in ${delayMs}ms`),
      },
    );

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;

    if (!textBlock) {
      logger.error('[ContentIdea] no text block in Claude response');
      throw new Error('No text in response');
    }

    const fullText = textBlock.text;

    const stepsMatch = fullText.match(/STEP \d+: (.+?)(?=STEP \d+:|FINAL IDEAS:)/gs) || [];
    const ideasMatch = fullText.match(/FINAL IDEAS:\s*([\s\S]*?)$/);

    let stepNumber = 1;
    for (const stepText of stepsMatch) {
      const lines = stepText.split('\n');
      const titleLine = lines[0] ?? '';
      const titleMatch = titleLine.match(/STEP \d+:\s*(.+)/);
      const title = titleMatch?.[1]?.trim() ?? `Step ${stepNumber}`;
      const details = lines.slice(1).join('\n').trim();

      if (title && details) {
        steps.push({
          stepNumber,
          title,
          status: 'completed',
          details,
          timestamp: new Date().toISOString(),
        });
        stepNumber++;
      }
    }

    if (ideasMatch && ideasMatch[1]) {
      modelDrafts = parseModelOutput(ideasMatch[1].trim());
    }
  } catch (err) {
    logger.error('[ContentIdea] Anthropic call failed', { err });
    throw new Error('AI generation failed');
  }

  if (modelDrafts.length < MIN_DRAFTS) {
    logger.warn('[ContentIdea] model returned fewer than 2 valid drafts', { count: modelDrafts.length });
  }

  const inserted: GeneratedScheduleDraft[] = [];
  for (const d of modelDrafts) {
    const draft = await insertDraft(promptId, userId, d);
    if (draft) inserted.push(draft);
  }

  logger.info('[ContentIdea] drafts with steps generated', {
    promptId, stepCount: steps.length, draftCount: inserted.length, model: MODEL_ID,
  });

  for (const d of inserted) {
    await attachGeneratedImage(d);
  }

  return { steps, drafts: inserted };
}

// ---------------------------------------------------------------------------
// List currently-pending ideas for a user (soft-delete consequence: must filter)
// ---------------------------------------------------------------------------
const MAX_PENDING_IDEAS_LISTED = 15;

export async function listPendingIdeasForUser(userId: string): Promise<GeneratedScheduleDraft[]> {
  const { data, error } = await supabase
    .from('content_ideas')
    .select(
      'id, prompt_id, content_title, tiktok_caption, hashtag, category, ' +
        'status, ai_model_used, generated_image_url, created_at',
    )
    .eq('created_by', userId)
    .eq('status', 'pending_validation')
    .order('created_at', { ascending: false })
    .limit(MAX_PENDING_IDEAS_LISTED);

  if (error) {
    logger.error('[ContentIdea] failed to list pending ideas', { error });
    throw new Error('Failed to fetch pending ideas');
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    prompt_id: string;
    content_title: string;
    tiktok_caption: string;
    hashtag: string[] | null;
    category: GeneratedScheduleDraft['category'] | null;
    ai_model_used: string | null;
    generated_image_url: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    prompt_id: row.prompt_id,
    content_title: row.content_title,
    tiktok_caption: row.tiktok_caption,
    hashtag: row.hashtag ?? [],
    category: row.category ?? 'TRENDING',
    status: 'pending_validation' as const,
    ai_model_used: row.ai_model_used ?? MODEL_ID,
    generated_image_url: row.generated_image_url ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Clear (hard-delete) ALL pending_validation ideas for a user — lets the
// Generated Ideas page reset to zero when the historical pending backlog
// grows past what the user wants to review (e.g. many past brief
// submissions accumulating in the list). Permanent: no soft-delete/audit
// trail, by explicit choice — different from the single-idea reject flow.
// ---------------------------------------------------------------------------
export async function clearPendingIdeasForUser(userId: string): Promise<{ deleted_count: number }> {
  const { data, error } = await supabase
    .from('content_ideas')
    .delete()
    .eq('created_by', userId)
    .eq('status', 'pending_validation')
    .select('id');

  if (error) {
    logger.error('[ContentIdea] failed to clear pending ideas', { error, userId });
    throw new Error('Failed to clear pending ideas');
  }

  return { deleted_count: (data ?? []).length };
}

// ---------------------------------------------------------------------------
// List ideas belonging to a given prompt (cross-model helper for Prompt detail view)
// ---------------------------------------------------------------------------
export async function listByPromptId(promptId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('content_ideas')
    .select('id, content_title, status, created_at')
    .eq('prompt_id', promptId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('[ContentIdea.listByPromptId]', { error });
    throw new Error('Failed to fetch ideas for prompt');
  }
  return data ?? [];
}

// ---------------------------------------------------------------------------
// UC006 — Validate AI Content Ideas (moved from IdeaValidationController.ts)
// ---------------------------------------------------------------------------

// Used to route an "idea approved/rejected" notification to whoever submitted
// the idea, when that's a different user from the one validating it.
export async function getIdeaOwner(ideaId: string): Promise<string | null> {
  const { data, error: lookupErr } = await supabase
    .from('content_ideas')
    .select('created_by')
    .eq('id', ideaId)
    .maybeSingle();

  if (lookupErr) {
    logger.warn('[ContentIdea.getIdeaOwner] lookup failed', { lookupErr, ideaId });
    return null;
  }
  return (data as { created_by: string | null } | null)?.created_by ?? null;
}

export async function approveIdea(ideaId: string, userId: string): Promise<{
  idea_id: string;
  schedule_id: string | null;
  schedule_status: string | null;
  content_title: string | null;
  tiktok_caption: string | null;
  hashtag: string[];
  category: string | null;
}> {
  // UPDATE guarded by status='pending_validation' — prevents double-approve race.
  // Side-effect: migration 006 trigger auto-creates a draft in content_queue_schedules.
  const { data, error: approvalErr } = await supabase
    .from('content_ideas')
    .update({
      status: 'approved',
      validated_by: userId,
      validated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)
    .eq('status', 'pending_validation')
    .select('id')
    .maybeSingle();

  if (approvalErr) {
    logger.error('[ContentIdea.approveIdea] supabase error', { error: approvalErr, ideaId });
    throw new Error('Approval failed');
  }
  if (!data) {
    const e: any = new Error('Idea not in pending_validation state');
    e.statusCode = 409; throw e;
  }

  const { data: draft, error: draftErr } = await supabase
    .from('content_queue_schedules')
    .select(`
      id,
      status,
      created_at,
      custom_caption,
      custom_hashtags,
      content_ideas (
        content_title,
        tiktok_caption,
        hashtag,
        category
      )
    `)
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftErr) {
    logger.warn('[ContentIdea.approveIdea] could not fetch trigger-created draft', { draftErr, ideaId });
  }

  const idea = (draft as any)?.content_ideas ?? {};

  return {
    idea_id: ideaId,
    schedule_id: draft?.id ?? null,
    schedule_status: draft?.status ?? null,
    content_title:  idea.content_title  ?? null,
    tiktok_caption: idea.tiktok_caption ?? draft?.custom_caption ?? null,
    hashtag:        idea.hashtag        ?? draft?.custom_hashtags ?? [],
    category:       idea.category       ?? null,
  };
}

export async function rejectIdea(ideaId: string, userId: string, rejectedReason?: string | null): Promise<{ idea_id: string }> {
  let reasonClean: string | null = null;
  if (typeof rejectedReason === 'string') {
    const trimmed = rejectedReason.trim();
    if (trimmed.length > 0) reasonClean = trimmed.slice(0, 500);
  }

  const { data, error: rejectionErr } = await supabase
    .from('content_ideas')
    .update({
      status: 'rejected',
      rejected_reason: reasonClean,
      validated_by: userId,
      validated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)
    .eq('status', 'pending_validation')
    .select('id')
    .maybeSingle();

  if (rejectionErr) {
    logger.error('[ContentIdea.rejectIdea] supabase error', { error: rejectionErr, ideaId });
    throw new Error('Rejection failed');
  }
  if (!data) {
    const e: any = new Error('Idea not in pending_validation state');
    e.statusCode = 409; throw e;
  }

  return { idea_id: ideaId };
}
