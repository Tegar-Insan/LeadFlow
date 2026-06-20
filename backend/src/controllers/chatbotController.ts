import type { Request, Response } from 'express';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import { chatWithAnthropic } from '../services/anthropicService.ts';
import { createSchedule } from '../models/ContentQueueSchedule.ts';
import { requestIdeaImages } from '../services/imageGenerationClient.ts';
import * as ChatbotSession from '../models/ChatbotSession.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

// Chat-proposed schedules are ephemeral (not yet a content_ideas row) until
// approved, so images are returned as inline data URLs rather than uploaded
// to Supabase Storage — there's no stable id to key a storage path on, and
// most rejected ideas would otherwise leave orphaned files behind.
async function attachGeneratedImages(
  schedules: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (schedules.length === 0) return schedules;
  const images = await requestIdeaImages(
    schedules.map((s) => ({
      content_title: String(s['title'] ?? ''),
      tiktok_caption: String(s['caption'] ?? ''),
    })),
  );
  return schedules.map((s, i) => {
    const image = images[i];
    if (!image) return s;
    return { ...s, generated_image_url: `data:${image.mimeType};base64,${image.imageBase64}` };
  });
}

// POST /api/chatbot/message
// body: { session_id?: string, message: string }
// Server-owned history: the client sends only the new turn. The backend
// resolves (or creates) the caller's session, loads a sliding window of
// prior turns from the DB for context, and persists both the user message
// and the assistant reply — this is the long-term memory layer.
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    if (!userId) { error(res, { message: 'Unauthorized', statusCode: 401 }); return; }

    const { session_id, message } = req.body as { session_id?: string; message?: string };
    const content = typeof message === 'string' ? message.trim() : '';
    if (!content) { error(res, { message: 'message is required', statusCode: 400 }); return; }

    const session = session_id
      ? await ChatbotSession.getOwnedSession(session_id, userId)
      : await ChatbotSession.getOrCreateActiveSession(userId);

    const history = await ChatbotSession.getRecentMessages(session.id);
    const anthropicHistory = history.map((m) => ({ role: m.role, content: m.content }));

    await ChatbotSession.appendMessage({ sessionId: session.id, role: 'user', content });

    const { visibleText, schedules, model } = await chatWithAnthropic([
      ...anthropicHistory,
      { role: 'user', content },
    ]);
    const schedulesWithImages = await attachGeneratedImages(schedules);
    const replyType = schedulesWithImages.length > 0 ? 'schedule_recommendation' : 'text';

    await ChatbotSession.appendMessage({
      sessionId: session.id,
      role: 'assistant',
      content: visibleText,
      messageType: replyType,
      schedules: schedulesWithImages.length > 0 ? schedulesWithImages : null,
      aiModelUsed: model,
    });

    success(res, {
      message: 'Chat response generated',
      data: {
        session_id: session.id,
        reply: visibleText,
        type: replyType,
        schedules: schedulesWithImages,
        model,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; statusCode?: number; response?: { status?: number } };
    logger.error('[chatbotController.sendMessage]', e.message);
    const statusCode = e.statusCode ?? e.status ?? e.response?.status;
    if (statusCode === 404) { error(res, { message: 'Chat session not found', statusCode: 404 }); return; }
    if (e.message?.includes('authentication_error') || statusCode === 400) {
      error(res, { message: 'Anthropic API key tidak valid.', statusCode: 503 }); return;
    }
    if (statusCode === 429) { error(res, { message: 'AI service sedang rate-limited.', statusCode: 429 }); return; }
    error(res, { message: 'Gagal mendapatkan respons AI', statusCode: 500 });
  }
};

// GET /api/chatbot/sessions
export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    if (!userId) { error(res, { message: 'Unauthorized', statusCode: 401 }); return; }

    const sessions = await ChatbotSession.listSessionsForUser(userId);
    success(res, { message: 'Sessions listed', data: { sessions } });
  } catch (err: unknown) {
    const e = err as { message?: string };
    logger.error('[chatbotController.getSessions]', e.message);
    error(res, { message: 'Failed to fetch chat sessions', statusCode: 500 });
  }
};

// GET /api/chatbot/sessions/:sessionId/messages
export const getSessionMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    if (!userId) { error(res, { message: 'Unauthorized', statusCode: 401 }); return; }

    const { sessionId } = req.params;
    if (!sessionId) { error(res, { message: 'sessionId required', statusCode: 400 }); return; }

    const messages = await ChatbotSession.getSessionMessages(sessionId as string, userId);
    success(res, { message: 'Messages listed', data: { messages } });
  } catch (err: unknown) {
    const e = err as { message?: string; statusCode?: number };
    logger.error('[chatbotController.getSessionMessages]', e.message);
    error(res, { message: e.statusCode === 404 ? 'Session not found' : 'Failed to fetch messages', statusCode: e.statusCode ?? 500 });
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

    const { visibleText, schedules, model } = await chatWithAnthropic([{ role: 'user', content: prompt }]);
    const schedule = schedules[0];

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
