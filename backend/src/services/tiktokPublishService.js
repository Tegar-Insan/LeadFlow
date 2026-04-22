const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const { decrypt } = require('../utils/encryptionHelper');
const { TIKTOK_CONFIG } = require('../config/tiktok');
const { getConnectedAccountForUser } = require('./tiktokOAuthService');

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'leadflow-media';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour — enough for TikTok to fetch
const DEFAULT_PRIVACY_LEVEL = process.env.TIKTOK_DEFAULT_PRIVACY_LEVEL || 'SELF_ONLY';
const ALLOWED_PRIVACY_LEVELS = new Set([
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
]);

const STATUS_POLL_ATTEMPTS = 6;
const STATUS_POLL_INTERVAL_MS = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

// Join content_ideas so caption/hashtags fall back to AI-generated values
// when custom_caption / custom_hashtags are not set by the user.
async function getSchedule(scheduleId) {
  const { data, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select(`
      id,
      status,
      created_by,
      tiktok_account_id,
      custom_caption,
      custom_hashtags,
      privacy_level,
      allow_comment,
      allow_duet,
      allow_stitch,
      content_ideas (
        idea_title,
        caption,
        hashtags
      )
    `)
    .eq('id', scheduleId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getAssets(scheduleId) {
  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .select('id, content_type, file_url, storage_path, mime_type, file_size_bytes, uploaded_at')
    .eq('queue_schedule_id', scheduleId)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getTikTokAccount(accountId) {
  const { data, error } = await supabaseAdmin
    .from('tiktok_accounts')
    .select('id, connection_status, access_token_encrypted')
    .eq('id', accountId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function writePublishLog({
  scheduleId,
  result,
  httpStatusCode = null,
  tiktokPostId = null,
  statusMessage,
  errorDetail = null,
}) {
  const { error } = await supabaseAdmin
    .from('publish_status_logs')
    .insert({
      queue_schedule_id: scheduleId,
      result,
      http_status_code: httpStatusCode,
      tiktok_post_id: tiktokPostId,
      status_message: statusMessage,
      error_detail: errorDetail,
    });

  if (error) throw error;
}

// Fallback: directly update schedule status if writePublishLog fails.
// Normally the migration 008 DB trigger handles this automatically on INSERT.
async function markScheduleStatus(scheduleId, status) {
  const payload = { status, updated_at: new Date().toISOString() };
  if (status === 'published') payload.published_at = new Date().toISOString();
  if (status === 'failed') payload.failed_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('content_queue_schedules')
    .update(payload)
    .eq('id', scheduleId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed URL helpers
// Generates fresh Supabase signed URLs from storage_path so TikTok can fetch
// assets even when the bucket is not fully public.
// ─────────────────────────────────────────────────────────────────────────────

async function getSignedUrl(storagePath) {
  const { data, error } = await supabaseAdmin
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    // Fall back to the stored public URL — caller must handle null gracefully
    return null;
  }
  return data.signedUrl;
}

async function resolveAssetUrl(asset) {
  if (asset.storage_path) {
    const signed = await getSignedUrl(asset.storage_path);
    if (signed) return signed;
  }
  return asset.file_url; // fallback to stored public URL
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption / content helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildCaption(caption = '', hashtags = []) {
  const normalized = String(caption || '').trim();
  const safeTags = Array.isArray(hashtags)
    ? hashtags.filter((h) => typeof h === 'string' && h.trim().startsWith('#')).slice(0, 15)
    : [];

  const merged = [normalized, safeTags.join(' ')].filter(Boolean).join('\n');
  const clipped = merged.slice(0, 2200).trim();

  if (clipped) return clipped;
  if (!normalized) return 'LeadFlow Scheduled Post';
  return normalized.slice(0, 2200);
}

// Resolve effective caption from schedule — custom fields take priority,
// fall back to AI-generated idea caption/hashtags.
function resolveCaption(schedule) {
  const caption = schedule.custom_caption
    || schedule.content_ideas?.caption
    || schedule.content_ideas?.idea_title
    || '';

  const hashtags = schedule.custom_hashtags
    || schedule.content_ideas?.hashtags
    || [];

  return buildCaption(caption, hashtags);
}

function resolveShortTitle(schedule) {
  return String(
    schedule.custom_caption
    || schedule.content_ideas?.idea_title
    || schedule.content_ideas?.caption
    || 'LeadFlow Post'
  ).slice(0, 90);
}

function getPrimaryVideoAsset(assets) {
  return assets.find(
    (a) => a.content_type === 'short_video' || String(a.mime_type || '').startsWith('video/')
  ) || null;
}

function getPhotoAssets(assets) {
  return assets.filter(
    (a) => a.content_type === 'poster_photo' || String(a.mime_type || '').startsWith('image/')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TikTok API helpers
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJson(input) {
  try { return JSON.stringify(input); } catch { return null; }
}

function inferPublishState(statusText) {
  const norm = String(statusText || '').toLowerCase();
  if (!norm) return 'processing';

  if (norm.includes('fail') || norm.includes('error') || norm.includes('reject') || norm.includes('cancel')) {
    return 'failed';
  }
  if (norm.includes('success') || norm.includes('publish_complete') || norm.includes('published')
    || norm.includes('posted') || norm.includes('complete') || norm.includes('done')) {
    return 'published';
  }
  return 'processing';
}

function extractTikTokError(payload) {
  return payload?.error?.message
    || payload?.error?.code
    || payload?.message
    || 'TikTok API request failed';
}

function normalizePrivacyLevel(value) {
  const candidate = String(value || '').trim().toUpperCase();
  if (!candidate || !ALLOWED_PRIVACY_LEVELS.has(candidate)) {
    return DEFAULT_PRIVACY_LEVEL;
  }

  if (candidate !== 'SELF_ONLY' && String(process.env.TIKTOK_ALLOW_PUBLIC_POSTS || '').toLowerCase() !== 'true') {
    return 'SELF_ONLY';
  }

  return candidate;
}

function resolvePrivacyLevel(schedule) {
  return normalizePrivacyLevel(schedule?.privacy_level);
}

function assertTikTokOk(payload) {
  const code = payload?.error?.code;
  if (code && code !== 'ok') {
    throw new Error(extractTikTokError(payload));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Video publish: PULL_FROM_URL path (preferred for server-side assets)
// 1. Resolve a signed/public URL for the stored video
// 2. Init publish using the URL-based source
// 3. Fall back to FILE_UPLOAD only if TikTok rejects the URL flow
// ─────────────────────────────────────────────────────────────────────────────

async function initVideoPublishFromUrl(accessToken, schedule, videoUrl) {
  const body = {
    post_info: {
      title: resolveCaption(schedule),
      privacy_level: resolvePrivacyLevel(schedule),
      disable_comment: schedule.allow_comment === false,
      disable_duet: schedule.allow_duet === false,
      disable_stitch: schedule.allow_stitch === false,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: videoUrl,
    },
    post_mode: 'DIRECT_POST',
    media_type: 'VIDEO',
  };

  const response = await axios.post(TIKTOK_CONFIG.publishVideoInitUrl, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    timeout: 20000,
  });

  assertTikTokOk(response.data);

  return {
    publishId: response?.data?.data?.publish_id || null,
    raw: response?.data || null,
  };
}

async function initVideoPublish(accessToken, schedule, sizeBytes) {
  const body = {
    post_info: {
      title: resolveCaption(schedule),
      privacy_level: resolvePrivacyLevel(schedule),
      disable_comment: schedule.allow_comment === false,
      disable_duet: schedule.allow_duet === false,
      disable_stitch: schedule.allow_stitch === false,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: sizeBytes,
      chunk_size: sizeBytes,
      total_chunk_count: 1,
    },
  };

  const response = await axios.post(TIKTOK_CONFIG.publishVideoInitUrl, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    timeout: 20000,
  });

  assertTikTokOk(response.data);

  return {
    publishId: response?.data?.data?.publish_id || null,
    uploadUrl: response?.data?.data?.upload_url || null,
    raw: response?.data || null,
  };
}

async function downloadBinary(resolvedUrl) {
  const response = await axios.get(resolvedUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  return {
    buffer: Buffer.from(response.data),
    mimeType: response.headers['content-type'] || 'video/mp4',
  };
}

async function uploadVideoToTikTok(uploadUrl, binaryBuffer, mimeType) {
  const total = binaryBuffer.length;
  if (!uploadUrl) throw new Error('TikTok did not return upload_url for FILE_UPLOAD');
  if (!total) throw new Error('Video buffer is empty');

  await axios.put(uploadUrl, binaryBuffer, {
    headers: {
      'Content-Type': mimeType || 'video/mp4',
      'Content-Length': total,
      'Content-Range': `bytes 0-${total - 1}/${total}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Photo publish: PULL_FROM_URL path
// 1. Resolve signed URLs for each photo asset
// 2. Init → pass photo_images array → TikTok fetches from our storage
// 3. Returns publish_id for status polling
// ─────────────────────────────────────────────────────────────────────────────

async function initPhotoPublish(accessToken, schedule, photoUrls) {
  const body = {
    post_info: {
      title: resolveShortTitle(schedule),
      description: resolveCaption(schedule).slice(0, 4000),
      privacy_level: resolvePrivacyLevel(schedule),
      disable_comment: schedule.allow_comment === false,
      auto_add_music: true,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      photo_cover_index: 0,
      photo_images: photoUrls,
    },
    post_mode: 'DIRECT_POST',
    media_type: 'PHOTO',
  };

  const response = await axios.post(TIKTOK_CONFIG.publishPhotoInitUrl, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    timeout: 20000,
  });

  assertTikTokOk(response.data);

  return {
    publishId: response?.data?.data?.publish_id || null,
    raw: response?.data || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Publish status polling
// Poll up to STATUS_POLL_ATTEMPTS times at STATUS_POLL_INTERVAL_MS intervals.
// Returns final state: 'published' | 'failed' | 'processing'
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPublishStatus(accessToken, publishId) {
  const response = await axios.post(
    TIKTOK_CONFIG.publishStatusFetchUrl,
    { publish_id: publishId },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      timeout: 20000,
    }
  );

  assertTikTokOk(response.data);

  const payload = response?.data?.data || {};
  const statusText = payload?.status
    || payload?.publish_status
    || payload?.post_status
    || payload?.video_status
    || '';

  return {
    state: inferPublishState(statusText),
    statusText,
    raw: payload,
  };
}

async function pollPublishStatus(accessToken, publishId) {
  let latest = { state: 'processing', statusText: 'processing', raw: {} };

  for (let i = 0; i < STATUS_POLL_ATTEMPTS; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    latest = await fetchPublishStatus(accessToken, publishId);
    if (latest.state === 'published' || latest.state === 'failed') return latest;
    if (i < STATUS_POLL_ATTEMPTS - 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(STATUS_POLL_INTERVAL_MS);
    }
  }

  return latest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Finalize: write to publish_status_logs.
// Migration 008 trigger (trg_publish_log_advance_schedule) automatically
// updates content_queue_schedules.status on INSERT — no manual update needed.
// markScheduleStatus is the fallback if the INSERT itself fails.
// ─────────────────────────────────────────────────────────────────────────────

async function finalizePublish(scheduleId, outcome) {
  const {
    state, message, httpStatusCode, publishId, uploadUrl, detail,
  } = outcome;

  const result = state === 'published' ? 'success' : 'failed';

  try {
    await writePublishLog({
      scheduleId,
      result,
      httpStatusCode,
      tiktokPostId: publishId,
      statusMessage: message,
      errorDetail: safeJson({ publish_id: publishId, upload_url: uploadUrl, detail }),
    });
  } catch (logErr) {
    console.error('[tiktokPublishService] writePublishLog failed, using direct status update:', logErr?.message);
    try {
      await markScheduleStatus(scheduleId, state === 'published' ? 'published' : 'failed');
    } catch {
      // Best-effort fallback
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point — called by publishService.runAutoPublishBatch and
// POST /api/tiktok/publish/:scheduleId (manual trigger)
// ─────────────────────────────────────────────────────────────────────────────

async function publishScheduledContent(scheduleId) {
  let uploadUrl = null;
  let publishId = null;

  try {
    const schedule = await getSchedule(scheduleId);
    if (!schedule) {
      return { success: false, status: 'failed', message: 'Schedule not found' };
    }

    const assets = await getAssets(scheduleId);
    if (!assets.length) {
      await finalizePublish(scheduleId, {
        state: 'failed',
        message: 'No media asset found for this schedule',
        detail: { reason: 'missing_assets' },
      });
      return { success: false, status: 'failed', message: 'No media asset found for this schedule' };
    }

    if (!schedule.tiktok_account_id) {
      const fallbackAccount = schedule.created_by
        ? await getConnectedAccountForUser(schedule.created_by)
        : null;

      if (!fallbackAccount) {
        await finalizePublish(scheduleId, {
          state: 'failed',
          message: 'No TikTok account connected to this schedule',
          detail: { reason: 'missing_tiktok_account' },
        });
        return { success: false, status: 'failed', message: 'No TikTok account connected to this schedule' };
      }

      schedule.tiktok_account_id = fallbackAccount.id;
    }

    const account = await getTikTokAccount(schedule.tiktok_account_id);
    if (!account || account.connection_status !== 'connected') {
      await finalizePublish(scheduleId, {
        state: 'failed',
        message: 'TikTok account is not connected',
        detail: { reason: 'account_not_connected' },
      });
      return { success: false, status: 'failed', message: 'TikTok account is not connected' };
    }

    const accessToken = decrypt(account.access_token_encrypted);
    const videoAsset = getPrimaryVideoAsset(assets);
    let mode = 'photo';

    if (videoAsset) {
      // ── Video: PULL_FROM_URL preferred ──────────────────────────────────
      // Try server-side URL publishing first, because the media is already
      // stored in Supabase and TikTok guidelines prefer PULL_FROM_URL.
      mode = 'video';
      const resolvedUrl = await resolveAssetUrl(videoAsset);
      if (!resolvedUrl) {
        throw new Error('Could not resolve a download URL for the video asset');
      }

      try {
        const init = await initVideoPublishFromUrl(accessToken, schedule, resolvedUrl);
        publishId = init.publishId;
      } catch (urlErr) {
        console.warn('[tiktokPublishService] URL-based video publish failed, falling back to FILE_UPLOAD:', urlErr?.message);
        const { buffer, mimeType } = await downloadBinary(resolvedUrl);
        const init = await initVideoPublish(accessToken, schedule, buffer.length);
        publishId = init.publishId;
        uploadUrl = init.uploadUrl;

        await uploadVideoToTikTok(uploadUrl, buffer, mimeType);
      }
    } else {
      // ── Photos: PULL_FROM_URL ───────────────────────────────────────────
      // 1. Resolve signed URLs for each photo
      // 2. Init publish → pass photo_images array → TikTok pulls from our storage
      // 3. Receive publish_id
      const photoAssets = getPhotoAssets(assets);
      const photoUrls = (
        await Promise.all(photoAssets.map((asset) => resolveAssetUrl(asset)))
      ).filter(Boolean);

      if (!photoUrls.length) {
        await finalizePublish(scheduleId, {
          state: 'failed',
          message: 'Photo publish failed: no valid image URL could be resolved',
          detail: { reason: 'missing_photo_urls' },
        });
        return { success: false, status: 'failed', message: 'Photo publish failed: no valid image URL could be resolved' };
      }

      const init = await initPhotoPublish(accessToken, schedule, photoUrls);
      publishId = init.publishId;
    }

    // ── Poll TikTok for final publish status ──────────────────────────────
    const statusResult = publishId
      ? await pollPublishStatus(accessToken, publishId)
      : { state: 'processing', statusText: 'processing', raw: {} };

    if (statusResult.state === 'failed') {
      const failMessage = `TikTok publish failed${statusResult.statusText ? ` (${statusResult.statusText})` : ''}`;
      await finalizePublish(scheduleId, {
        state: 'failed',
        message: failMessage,
        publishId,
        uploadUrl,
        detail: { mode, publish_status: statusResult.statusText, status_payload: statusResult.raw },
      });
      return { success: false, status: 'failed', message: failMessage, publishId, uploadUrl, mode };
    }

    const successMessage = mode === 'video'
      ? `Video published successfully${statusResult.statusText ? ` (${statusResult.statusText})` : ''}`
      : `Photo post published successfully${statusResult.statusText ? ` (${statusResult.statusText})` : ''}`;

    await finalizePublish(scheduleId, {
      state: 'published',
      message: successMessage,
      publishId,
      uploadUrl,
      detail: { mode, publish_status: statusResult.statusText, status_payload: statusResult.raw },
    });

    return {
      success: true,
      status: 'published',
      publishId,
      uploadUrl,
      mode,
      message: successMessage,
    };
  } catch (err) {
    const httpStatusCode = err?.response?.status || null;
    const detail = err?.response?.data || err?.message || 'TikTok publish failed';
    const apiMessage = err?.response?.data?.error_description
      || err?.response?.data?.error?.message
      || err?.response?.data?.error
      || err?.message
      || 'TikTok publish failed';

    try {
      await finalizePublish(scheduleId, {
        state: 'failed',
        message: apiMessage,
        httpStatusCode,
        publishId,
        uploadUrl,
        detail,
      });
    } catch {
      try { await markScheduleStatus(scheduleId, 'failed'); } catch { /* best effort */ }
    }

    return { success: false, status: 'failed', message: apiMessage, publishId, uploadUrl };
  }
}

module.exports = { publishScheduledContent };
