import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
import { chatWithAnthropic } from "../services/anthropicService.js";
import { createSchedule } from "../services/scheduleService.js";
export const sendMessage = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!Array.isArray(messages) || messages.length === 0) {
            error(res, { message: 'messages array is required', statusCode: 400 });
            return;
        }
        const last = messages[messages.length - 1];
        if (last?.role !== 'user') {
            error(res, { message: 'Last message must be from user', statusCode: 400 });
            return;
        }
        const trimmed = messages.slice(-10);
        const { visibleText, schedule, model } = await chatWithAnthropic(trimmed);
        success(res, {
            message: 'Chat response generated',
            data: { reply: visibleText, type: schedule ? 'schedule_recommendation' : 'text', schedule: schedule ?? null, model },
        });
    }
    catch (err) {
        const e = err;
        logger.error('[chatbotController.sendMessage]', e.message);
        const statusCode = e.status ?? e.response?.status;
        if (e.message?.includes('authentication_error') || statusCode === 400) {
            error(res, { message: 'Anthropic API key tidak valid.', statusCode: 503 });
            return;
        }
        if (statusCode === 429) {
            error(res, { message: 'AI service sedang rate-limited.', statusCode: 429 });
            return;
        }
        error(res, { message: 'Gagal mendapatkan respons AI', statusCode: 500 });
    }
};
export const approveSchedule = async (req, res) => {
    try {
        const authReq = req;
        const { schedule } = req.body;
        const userId = authReq.user?.userId;
        if (!schedule || !userId) {
            error(res, { message: 'schedule payload and authentication are required', statusCode: 400 });
            return;
        }
        const newSchedule = await createSchedule({
            created_by: userId,
            title: schedule['title'] ?? 'AI Recommended Post',
            caption: schedule['caption'] ?? null,
            hashtags: schedule['hashtags'] ?? [],
            scheduled_at: schedule['scheduled_at'] ?? null,
            priority: 0,
        });
        logger.info(`[chatbot] Schedule approved: ${newSchedule.id} by user ${userId}`);
        success(res, { message: 'Jadwal berhasil dibuat dari rekomendasi AI', data: { schedule: newSchedule }, statusCode: 201 });
    }
    catch (err) {
        const e = err;
        logger.error('[chatbotController.approveSchedule]', e.message);
        error(res, { message: 'Gagal membuat jadwal dari rekomendasi AI', statusCode: 500 });
    }
};
export const rejectSchedule = async (_req, res) => {
    try {
        success(res, {
            message: 'Schedule rejected',
            data: { reply: 'Baik, saya tidak akan membuat jadwal tersebut. 👍', type: 'text' },
        });
    }
    catch (err) {
        const e = err;
        logger.error('[chatbotController.rejectSchedule]', e.message);
        error(res, { message: 'Error processing rejection', statusCode: 500 });
    }
};
export const generateScheduleAgent = async (req, res) => {
    try {
        const authReq = req;
        const brief = String(req.body?.brief ?? '').trim();
        const userId = authReq.user?.userId;
        if (!brief) {
            error(res, { message: 'brief is required', statusCode: 400 });
            return;
        }
        if (!userId) {
            error(res, { message: 'authentication is required', statusCode: 401 });
            return;
        }
        const prompt = [
            'Generate exactly one concrete TikTok posting schedule for Krench Chicken based on this brief.',
            'Always choose a future WIB time slot and include full schedule metadata.',
            `Brief: ${brief}`,
        ].join('\n');
        const { visibleText, schedule, model } = await chatWithAnthropic([{ role: 'user', content: prompt }]);
        if (!schedule) {
            error(res, { message: visibleText || 'AI could not generate a concrete schedule.', statusCode: 422 });
            return;
        }
        const newSchedule = await createSchedule({
            created_by: userId,
            title: schedule['title'] ?? 'AI Agent Recommended Post',
            caption: schedule['caption'] ?? null,
            hashtags: Array.isArray(schedule['hashtags']) ? schedule['hashtags'] : [],
            scheduled_at: schedule['scheduled_at'] ?? null,
            priority: 0,
        });
        logger.info(`[ai-agent] Schedule generated: ${newSchedule.id} by user ${userId}`);
        success(res, {
            message: 'AI agent generated and created a schedule successfully',
            data: { schedule: newSchedule, recommendation: schedule, reply: visibleText, model },
            statusCode: 201,
        });
    }
    catch (err) {
        const e = err;
        logger.error('[chatbotController.generateScheduleAgent]', e.message);
        error(res, { message: 'Failed to generate schedule with AI agent', statusCode: 500 });
    }
};
//# sourceMappingURL=chatbotController.js.map