import Anthropic from '@anthropic-ai/sdk';
import logger from "../utils/logger.js";
import { retryWithBackoff, ANTHROPIC_RETRY } from "../utils/retryHelper.js";
const _SCHEDULE_RE = /%%SCHEDULE%%([\s\S]*?)%%END%%/;
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
When the user asks for a specific schedule recommendation AND you have enough info to propose a concrete time slot, append this sentinel block at the very END of your response (after all human-readable text). Do NOT include it unless making a concrete recommendation:

%%SCHEDULE%%
{"title":"<short post title>","caption":"<TikTok caption 1-2 sentences with emoji>","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"scheduled_at":"<ISO 8601 in Asia/Jakarta e.g. 2026-05-10T20:00:00+07:00>","day_label":"<e.g. Sabtu, 10 Mei 2026>","time_wib":"<e.g. 20:00 WIB>","reasoning":"<max 20 words why this slot>"}
%%END%%

Rules: scheduled_at must be FUTURE. Exactly 5 hashtags. No text after %%END%%.`;
function _parseSchedule(raw) {
    const match = raw.match(_SCHEDULE_RE);
    if (!match)
        return { visible: raw.trim(), schedule: null };
    try {
        const schedule = JSON.parse(match[1]?.trim() ?? '');
        const visible = raw.replace(_SCHEDULE_RE, '').trim();
        return { visible, schedule };
    }
    catch {
        return { visible: raw.replace(_SCHEDULE_RE, '').trim(), schedule: null };
    }
}
function _toAnthropicMessages(messages) {
    const result = [];
    for (const m of messages) {
        const role = m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user';
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
export const chatWithAnthropic = async (messages) => {
    const apiKey = (process.env['ANTHROPIC_API_KEY'] ?? '').trim();
    const modelId = (process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6').trim();
    if (!apiKey) {
        throw Object.assign(new Error('ANTHROPIC_API_KEY belum dikonfigurasi. Tambahkan ke backend/.env'), { status: 503 });
    }
    const client = new Anthropic({ apiKey });
    const anthropicMsgs = _toAnthropicMessages(messages);
    try {
        const response = await retryWithBackoff(() => client.messages.create({
            model: modelId,
            max_tokens: 1024,
            system: _SYSTEM_PROMPT,
            messages: anthropicMsgs,
        }), {
            ...ANTHROPIC_RETRY,
            onRetry: (attempt, delayMs) => logger.warn(`[anthropicService] rate-limited — retry ${attempt} in ${delayMs}ms`),
        });
        const block = response.content[0];
        const raw = block && 'text' in block ? block.text : '';
        const { visible, schedule } = _parseSchedule(raw);
        return { visibleText: visible, schedule, model: modelId };
    }
    catch (err) {
        const e = err;
        const msg = e.message ?? '';
        logger.error(`[anthropicService] API error: ${msg}`);
        if (msg.includes('authentication_error') || msg.includes('invalid x-api-key')) {
            throw Object.assign(new Error('ANTHROPIC_API_KEY tidak valid.'), { status: 400 });
        }
        if (e.status === 429 || msg.includes('rate_limit') || msg.includes('overloaded')) {
            throw Object.assign(new Error('AI service sedang rate-limited setelah beberapa percobaan. Coba lagi dalam beberapa menit.'), { status: 429 });
        }
        throw new Error(msg || 'Anthropic API error');
    }
};
export const analyzeTikTokData = async () => {
    const { default: axios } = await import('axios');
    const AI_SERVICE = process.env['AI_SERVICE_URL'] ?? 'http://127.0.0.1:8000';
    try {
        const response = await axios.post(`${AI_SERVICE}/chatbot/analyze-tiktok`, {}, { timeout: 60_000 });
        return response.data;
    }
    catch {
        logger.warn('[anthropicService] analyzeTikTokData: Python AI service unavailable — skipped');
        return { analysis: '', post_count: 0, model: 'unavailable' };
    }
};
//# sourceMappingURL=anthropicService.js.map