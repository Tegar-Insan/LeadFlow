// backend/src/services/imageGenerationClient.ts
// Thin HTTP client to the ai-analyzer FastAPI service's POST /image/generate
// (GPT Image 2.0). Called automatically right after Claude (Anthropic)
// produces a content idea — see contentIdeaService.ts. Image generation
// must never break idea generation (NFR-002): every failure is caught
// here and surfaced as `null`, never thrown.

import axios from 'axios';
import logger from '../utils/logger.ts';
import { retryWithBackoff } from '../utils/retryHelper.ts';

export interface IdeaImageContext {
  content_title: string;
  tiktok_caption: string;
  category?: string;
  style_hint?: string;
}

export interface GeneratedIdeaImage {
  imageBase64: string;
  mimeType: string;
  model: string;
}

const AI_SERVICE_URL = process.env['AI_SERVICE_URL'] ?? 'http://127.0.0.1:8000';

const IMAGE_GEN_RETRY = {
  maxRetries: 2,
  baseDelayMs: 1_000,
  maxDelayMs: 20_000,
  retryableStatuses: [429, 502, 503],
};

interface ImageGenerateApiResponse {
  image_base64: string;
  mime_type: string;
  model: string;
  prompt_used: string;
}

/**
 * Requests a GPT Image 2.0 image for the given idea from ai-analyzer.
 * Returns null on any failure — callers must treat that as "no image yet"
 * and continue, never as a reason to fail idea generation.
 */
export async function requestIdeaImage(
  idea: IdeaImageContext,
): Promise<GeneratedIdeaImage | null> {
  try {
    const response = await retryWithBackoff(
      () =>
        axios.post<ImageGenerateApiResponse>(
          `${AI_SERVICE_URL}/image/generate`,
          { idea },
          // gpt-image-1 at 1024x1536 routinely takes 50-61s by itself — a
          // 60s timeout left almost no margin and was the deciding factor
          // in whichever draft's image call landed on the slow side of that
          // range (typically the last one in a 3-idea sequential batch).
          { timeout: 120_000 },
        ),
      {
        ...IMAGE_GEN_RETRY,
        onRetry: (attempt, delayMs) =>
          logger.warn(`[imageGenerationClient] retry ${attempt} in ${delayMs}ms`),
      },
    );

    const { image_base64, mime_type, model } = response.data;
    if (!image_base64) {
      logger.warn('[imageGenerationClient] ai-analyzer returned no image data');
      return null;
    }

    return { imageBase64: image_base64, mimeType: mime_type, model };
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number; data?: unknown } };
    logger.warn('[imageGenerationClient] image generation failed — continuing without image', {
      message: e.message,
      status: e.response?.status,
    });
    return null;
  }
}

/**
 * Requests one GPT Image 2.0 image per idea, sequentially. Sequential —
 * not Promise.all — because ai-analyzer serializes generation behind a
 * semaphore(1) (gpt-image-1 rate limit); firing these concurrently would
 * burn each request's 60s timeout while it sits queued server-side (see
 * requestIdeaImage above and contentIdeaService.ts for the same fix).
 * One failed idea never stops the rest — each slot independently resolves
 * to its image or null.
 */
export async function requestIdeaImages(
  ideas: IdeaImageContext[],
): Promise<Array<GeneratedIdeaImage | null>> {
  const results: Array<GeneratedIdeaImage | null> = [];
  for (const idea of ideas) {
    results.push(await requestIdeaImage(idea));
  }
  return results;
}
