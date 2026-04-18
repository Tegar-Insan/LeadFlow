/**
 * brightdataService.js
 * Fetches the pre-scraped TikTok dataset from Bright Data's Dataset API (Option A).
 * Results are cached in-memory for 1 hour to avoid hammering the API on every chat message.
 *
 * Env vars required:
 *   BRIGHTDATA_KEY        — Bright Data API token
 *   BRIGHTDATA_DATASET_ID — snapshot/dataset ID to download (add when ready)
 */

const axios  = require('axios');
const logger = require('../utils/logger');

const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

let _cache     = null;
let _cacheTime = 0;

/**
 * Download (or return cached) TikTok posts from Bright Data.
 * Returns an empty array when the dataset ID is not yet configured —
 * the chatbot will still work, just without scraped TikTok context.
 *
 * @returns {Promise<Array>} Array of TikTok post objects
 */
const fetchTikTokData = async () => {
  // Serve from cache if still fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    logger.info(`[brightdataService] Serving ${_cache.length} posts from cache`);
    return _cache;
  }

  const key       = process.env.BRIGHTDATA_KEY?.trim();
  const datasetId = process.env.BRIGHTDATA_DATASET_ID?.trim();

  if (!key || !datasetId) {
    logger.warn('[brightdataService] BRIGHTDATA_KEY or BRIGHTDATA_DATASET_ID not configured — returning empty context');
    return [];
  }

  try {
    logger.info(`[brightdataService] Fetching dataset ${datasetId} from Bright Data…`);

    const response = await axios.get(
      `https://api.brightdata.com/datasets/v3/snapshot/${datasetId}?format=json`,
      {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 30_000,
      }
    );

    const posts = Array.isArray(response.data) ? response.data : [];

    _cache     = posts;
    _cacheTime = Date.now();

    logger.info(`[brightdataService] Cached ${posts.length} TikTok posts`);
    return posts;

  } catch (err) {
    logger.error('[brightdataService] Fetch failed:', err.response?.data || err.message);

    // Return stale cache on error rather than crashing the chatbot
    if (_cache) {
      logger.warn('[brightdataService] Using stale cache as fallback');
      return _cache;
    }
    return [];
  }
};

/**
 * Bust the cache manually (call after user provides a new dataset ID).
 */
const clearCache = () => {
  _cache     = null;
  _cacheTime = 0;
  logger.info('[brightdataService] Cache cleared');
};

/**
 * Distil raw Bright Data posts into a compact text summary
 * that fits inside a Gemini context window without blowing the token budget.
 * Limits to 80 posts — enough signal, safe on tokens.
 *
 * @param {Array} posts
 * @returns {string}
 */
const summarizePosts = (posts) => {
  if (!posts || posts.length === 0) return '';

  const sample = posts.slice(0, 80);

  const lines = sample.map((p, i) => {
    // Bright Data TikTok schema may vary — handle common field names gracefully
    const desc     = p.text || p.description || p.caption || p.content || '';
    const likes    = p.digg_count    || p.like_count    || p.likes    || 0;
    const comments = p.comment_count || p.comments      || 0;
    const shares   = p.share_count   || p.shares        || 0;
    const hashtags = (p.hashtags || []).map(h => (h.name ? `#${h.name}` : h)).join(' ');
    return `[${i + 1}] "${desc.substring(0, 120)}" | likes:${likes} comments:${comments} shares:${shares} | ${hashtags}`;
  });

  return lines.join('\n');
};

module.exports = { fetchTikTokData, clearCache, summarizePosts };
