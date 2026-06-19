import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.ts';
import { retryWithBackoff, ANTHROPIC_RETRY } from '../utils/retryHelper.ts';

interface ChatMessage {
  role: string;
  content: string;
}

interface ParsedSchedules {
  visible: string;
  schedules: Record<string, unknown>[];
}

const _SCHEDULE_RE = /%%SCHEDULE%%([\s\S]*?)%%END%%/g;
const MAX_SCHEDULES_PER_TURN = 3;

const _SYSTEM_PROMPT = `You are an expert AI marketing assistant for Krench Chicken — a crispy fried-chicken brand in Bogor, West Java, Indonesia. You help the marketing team manage their TikTok content strategy through the LeadFlow platform.

Personality: helpful, concise, creative, data-driven. Always respond in the same language the user writes in (Bahasa Indonesia or English).

Specialties:
- TikTok content strategy for Indonesian food & beverage brands
- Viral content formats, caption writing, hashtag selection
- Optimal posting schedules for Indonesian audiences (WIB / GMT+7)
- Interpreting real TikTok engagement data to drive strategy
- Creating actionable content calendars

KEY SCHEDULING FACTS:
- Best posting times WIB: 07:00–09:00, 12:00–14:00, 19:00–22:00
- Peak engagement days: Tuesday, Thursday, Saturday, Sunday
- Growth minimum: 3–5 posts per week
- Best video length for food content: 21–34 seconds

SCHEDULE RECOMMENDATION PROTOCOL:
When the user asks for a specific schedule recommendation AND you have enough info to propose a concrete time slot, append one sentinel block per idea at the very END of your response (after all human-readable text). Do NOT include any unless making at least one concrete recommendation. If the user asks for multiple ideas (e.g. "3 content ideas"), append up to 3 separate blocks back-to-back, one per idea — never combine ideas into a single block:

%%SCHEDULE%%
{"title":"<short post title>","caption":"<TikTok caption 1-2 sentences with emoji>","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"scheduled_at":"<ISO 8601 in Asia/Jakarta e.g. 2026-05-10T20:00:00+07:00>","day_label":"<e.g. Sabtu, 10 Mei 2026>","time_wib":"<e.g. 20:00 WIB>","reasoning":"<max 20 words why this slot>"}
%%END%%

Rules: scheduled_at must be FUTURE. Exactly 5 hashtags per idea. Maximum 3 blocks per response. No text after the final %%END%%.`;

function _parseSchedules(raw: string): ParsedSchedules {
  const schedules: Record<string, unknown>[] = [];
  for (const match of raw.matchAll(_SCHEDULE_RE)) {
    try {
      schedules.push(JSON.parse(match[1]?.trim() ?? '') as Record<string, unknown>);
    } catch {
      // skip malformed block, keep parsing the rest
    }
    if (schedules.length >= MAX_SCHEDULES_PER_TURN) break;
  }
  const visible = raw.replace(_SCHEDULE_RE, '').trim();
  return { visible, schedules };
}

function _toAnthropicMessages(messages: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of messages) {
    const role: 'user' | 'assistant' = m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user';
    const last = result[result.length - 1];
    if (last && last.role === role) {
      last.content = m.content;
      continue;
    }
    result.push({ role, content: m.content });
  }
  if (result.length > 0 && result[0]?.role === 'assistant') {
    result.shift();
  }
  return result;
}

export const chatWithAnthropic = async (
  messages: ChatMessage[],
): Promise<{ visibleText: string; schedules: Record<string, unknown>[]; model: string }> => {
  const apiKey = (process.env['ANTHROPIC_API_KEY'] ?? '').trim();
  const modelId = (process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6').trim();

  if (!apiKey) {
    throw Object.assign(
      new Error('ANTHROPIC_API_KEY belum dikonfigurasi. Tambahkan ke backend/.env'),
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });
  const anthropicMsgs = _toAnthropicMessages(messages);

  try {
    const response = await retryWithBackoff(
      () => client.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: _SYSTEM_PROMPT,
        messages: anthropicMsgs,
      }),
      {
        ...ANTHROPIC_RETRY,
        onRetry: (attempt, delayMs) =>
          logger.warn(`[anthropicService] rate-limited — retry ${attempt} in ${delayMs}ms`),
      },
    );

    const block = response.content[0];
    const raw = block && 'text' in block ? block.text : '';
    const { visible, schedules } = _parseSchedules(raw);
    return { visibleText: visible, schedules, model: modelId };
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    const msg = e.message ?? '';
    logger.error(`[anthropicService] API error: ${msg}`);
    if (msg.includes('authentication_error') || msg.includes('invalid x-api-key')) {
      throw Object.assign(new Error('ANTHROPIC_API_KEY tidak valid.'), { status: 400 });
    }
    if (e.status === 429 || msg.includes('rate_limit') || msg.includes('overloaded')) {
      throw Object.assign(
        new Error('AI service sedang rate-limited setelah beberapa percobaan. Coba lagi dalam beberapa menit.'),
        { status: 429 },
      );
    }
    throw new Error(msg || 'Anthropic API error');
  }
};

export const analyzeTikTokData = async (): Promise<Record<string, unknown>> => {
  const { default: axios } = await import('axios');
  const AI_SERVICE = process.env['AI_SERVICE_URL'] ?? 'http://127.0.0.1:8000';
  try {
    const response = await axios.post<Record<string, unknown>>(
      `${AI_SERVICE}/chatbot/analyze-tiktok`,
      {},
      { timeout: 60_000 },
    );
    return response.data;
  } catch {
    logger.warn('[anthropicService] analyzeTikTokData: Python AI service unavailable — skipped');
    return { analysis: '', post_count: 0, model: 'unavailable' };
  }
};
