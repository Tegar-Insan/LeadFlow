import type { Request, Response } from 'express';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import { chatWithAnthropic } from '../services/anthropicService.ts';
import { createSchedule } from '../services/scheduleService.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as { messages?: Array<{ role: string; content: string }> };

    if (!Array.isArray(messages) || messages.length === 0) {
      error(res, { message: 'messages array is required', statusCode: 400 }); return;
    }
    const last = messages[messages.length - 1];
    if (last?.role !== 'user') {
      error(res, { message: 'Last message must be from user', statusCode: 400 }); return;
    }

    const trimmed = messages.slice(-10);
    const { visibleText, schedule, model } = await chatWithAnthropic(trimmed);

    success(res, {
      message: 'Chat response generated',
      data: { reply: visibleText, type: schedule ? 'schedule_recommendation' : 'text', schedule: schedule ?? null, model },
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; response?: { status?: number } };
    logger.error('[chatbotController.sendMessage]', e.message);
    const statusCode = e.status ?? e.response?.status;
    if (e.message?.includes('authentication_error') || statusCode === 400) {
      error(res, { message: 'Anthropic API key tidak valid.', statusCode: 503 }); return;
    }
    if (statusCode === 429) { error(res, { message: 'AI service sedang rate-limited.', statusCode: 429 }); return; }
    error(res, { message: 'Gagal mendapatkan respons AI', statusCode: 500 });
  }
};

export const approveSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { schedule } = req.body as { schedule?: Record<string, unknown> };
    const userId = authReq.user?.userId;

    if (!schedule || !userId) { error(res, { message: 'schedule payload and authentication are required', statusCode: 400 }); return; }

    const newSchedule = await createSchedule({
      created_by: userId,
      title: (schedule['title'] as string | undefined) ?? 'AI Recommended Post',
      caption: (schedule['caption'] as string | undefined) ?? null,
      hashtags: (schedule['hashtags'] as string[] | undefined) ?? [],
      scheduled_at: (schedule['scheduled_at'] as string | undefined) ?? null,
      priority: 0,
    });

    logger.info(`[chatbot] Schedule approved: ${(newSchedule as { id: string }).id} by user ${userId}`);
    success(res, { message: 'Jadwal berhasil dibuat dari rekomendasi AI', data: { schedule: newSchedule }, statusCode: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    logger.error('[chatbotController.approveSchedule]', e.message);
    error(res, { message: 'Gagal membuat jadwal dari rekomendasi AI', statusCode: 500 });
  }
};

export const rejectSchedule = async (_req: Request, res: Response): Promise<void> => {
  try {
    success(res, {
      message: 'Schedule rejected',
      data: { reply: 'Baik, saya tidak akan membuat jadwal tersebut. 👍', type: 'text' },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    logger.error('[chatbotController.rejectSchedule]', e.message);
    error(res, { message: 'Error processing rejection', statusCode: 500 });
  }
};

export const generateScheduleAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const brief = String((req.body as { brief?: string })?.brief ?? '').trim();
    const userId = authReq.user?.userId;

    if (!brief) { error(res, { message: 'brief is required', statusCode: 400 }); return; }
    if (!userId) { error(res, { message: 'authentication is required', statusCode: 401 }); return; }

    const prompt = [
      'Generate exactly one concrete TikTok posting schedule for Krench Chicken based on this brief.',
      'Always choose a future WIB time slot and include full schedule metadata.',
      `Brief: ${brief}`,
    ].join('\n');

    const { visibleText, schedule, model } = await chatWithAnthropic([{ role: 'user', content: prompt }]);

    if (!schedule) {
      error(res, { message: visibleText || 'AI could not generate a concrete schedule.', statusCode: 422 }); return;
    }

    const newSchedule = await createSchedule({
      created_by: userId,
      title: (schedule as Record<string, unknown>)['title'] as string | undefined ?? 'AI Agent Recommended Post',
      caption: (schedule as Record<string, unknown>)['caption'] as string | undefined ?? null,
      hashtags: Array.isArray((schedule as Record<string, unknown>)['hashtags']) ? (schedule as Record<string, unknown>)['hashtags'] as string[] : [],
      scheduled_at: (schedule as Record<string, unknown>)['scheduled_at'] as string | undefined ?? null,
      priority: 0,
    });

    logger.info(`[ai-agent] Schedule generated: ${(newSchedule as { id: string }).id} by user ${userId}`);
    success(res, {
      message: 'AI agent generated and created a schedule successfully',
      data: { schedule: newSchedule, recommendation: schedule, reply: visibleText, model },
      statusCode: 201,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    logger.error('[chatbotController.generateScheduleAgent]', e.message);
    error(res, { message: 'Failed to generate schedule with AI agent', statusCode: 500 });
  }
};
