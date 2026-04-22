/**
 * chatbotController.js
 * Anthropic Claude-powered AI chat assistant for Krench Chicken TikTok Management
 * Data context: Bright Data TikTok scrape (Indonesian food & beverage)
 * LeadFlow — UC Chatbot (AI Assistant)
 *
 * Routes:
 *   POST /api/chatbot/message          — main conversation
 *   POST /api/chatbot/approve-schedule — user approved a schedule recommendation
 *   POST /api/chatbot/reject-schedule  — user rejected a schedule recommendation
 */

const { success, error }    = require('../utils/responseHelper');
const logger                = require('../utils/logger');
const { chatWithGemini }    = require('../services/anthropicService');
const { createSchedule }    = require('../services/scheduleService');

// ─────────────────────────────────────────────────────────────────
// POST /api/chatbot/message
// Body: { messages: [{role, content}, ...] }   — last item = latest user msg
// ─────────────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return error(res, { message: 'messages array is required', statusCode: 400 });
    }

    // Quick guard — must end with a user message
    const last = messages[messages.length - 1];
    if (last?.role !== 'user') {
      return error(res, { message: 'Last message must be from user', statusCode: 400 });
    }

    // Keep last 10 messages to stay within token budget
    const trimmed = messages.slice(-10);

    const { visibleText, schedule, model } = await chatWithGemini(trimmed);

    return success(res, {
      message: 'Chat response generated',
      data: {
        reply:    visibleText,
        type:     schedule ? 'schedule_recommendation' : 'text',
        schedule: schedule || null,
        model,
      },
    });

  } catch (err) {
    logger.error('[chatbotController.sendMessage]', err.message);

    if (err.message?.includes('authentication_error') || err.status === 400) {
      return error(res, { message: 'Anthropic API key tidak valid. Periksa ANTHROPIC_API_KEY di server.', statusCode: 503 });
    }
    if (err.status === 429) {
      return error(res, { message: 'AI service sedang rate-limited. Coba lagi sebentar.', statusCode: 429 });
    }

    return error(res, { message: 'Gagal mendapatkan respons AI', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/chatbot/approve-schedule
// Body: { schedule: { title, caption, hashtags, scheduled_at, ... } }
// Creates the schedule and returns the new calendar entry.
// ─────────────────────────────────────────────────────────────────
const approveSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;
    const userId = req.user?.id;

    if (!schedule || !userId) {
      return error(res, { message: 'schedule payload and authentication are required', statusCode: 400 });
    }

    const newSchedule = await createSchedule({
      created_by:  userId,
      title:       schedule.title       || 'AI Recommended Post',
      caption:     schedule.caption     || null,
      hashtags:    schedule.hashtags    || [],
      scheduled_at: schedule.scheduled_at || null,
      priority:    0,
    });

    logger.info(`[chatbot] Schedule approved and created: ${newSchedule.id} by user ${userId}`);

    return success(res, {
      message: 'Jadwal berhasil dibuat dari rekomendasi AI',
      data: { schedule: newSchedule },
      statusCode: 201,
    });

  } catch (err) {
    logger.error('[chatbotController.approveSchedule]', err.message);
    return error(res, { message: 'Gagal membuat jadwal dari rekomendasi AI', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/chatbot/reject-schedule
// No body needed — just returns an acknowledgement message.
// ─────────────────────────────────────────────────────────────────
const rejectSchedule = async (req, res) => {
  try {
    return success(res, {
      message: 'Schedule rejected',
      data: {
        reply: 'Baik, saya tidak akan membuat jadwal tersebut. 👍\nBeritahu saya jika kamu ingin rekomendasi waktu lain atau butuh bantuan strategi konten.',
        type:  'text',
      },
    });
  } catch (err) {
    logger.error('[chatbotController.rejectSchedule]', err.message);
    return error(res, { message: 'Error processing rejection', statusCode: 500 });
  }
};

module.exports = { sendMessage, approveSchedule, rejectSchedule };
