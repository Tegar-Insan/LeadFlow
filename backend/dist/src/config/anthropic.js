import Anthropic from '@anthropic-ai/sdk';
import logger from "../utils/logger.js";
let client = null;
export function getAnthropicClient() {
    if (client)
        return client;
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
        logger.warn('[Anthropic] ANTHROPIC_API_KEY not set — AI features will be unavailable');
        return null;
    }
    client = new Anthropic({ apiKey });
    logger.info('[Anthropic] Client initialised ✓');
    return client;
}
export const ANTHROPIC_MODEL = process.env['ANTHROPIC_MODEL'] ?? 'claude-haiku-4-5-20251001';
//# sourceMappingURL=anthropic.js.map