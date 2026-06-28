/**
 * agentController.ts
 * Agentic Mode (PLAN.md §12) — thin proxy to ai-analyzer's /agent/* endpoints.
 * No business logic here: validate the role gate already ran, inject the
 * authenticated user's id server-side (never trust the client to assert
 * who triggered a run), forward to ai-analyzer, relay the response through
 * responseHelper. Same shape as imageGenerationClient.ts's role.
 */

import type { Request, Response } from 'express';
import axios from 'axios';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';
import { canUserRunAgentToday, getSettingsForUser, upsertSettingsForUser } from '../models/AgentSchedule.ts';
import { nowJakarta } from '../utils/jakartaTime.ts';

const AI_SERVICE_URL = process.env['AI_SERVICE_URL'] ?? 'http://127.0.0.1:8000';

export const triggerAgent = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return error(res, { message: 'Unauthorized', statusCode: 401 });
  }

  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/agent/trigger`,
      { ...req.body, triggered_by: authReq.user.userId },
      { timeout: 15_000 },
    );
    return success(res, { message: 'Agent run started', data: response.data });
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number; data?: unknown } };
    logger.error('[agentController] trigger failed', { message: e.message, status: e.response?.status, data: e.response?.data });
    return error(res, {
      message: 'Failed to start agent run',
      statusCode: e.response?.status ?? 502,
      errors: e.response?.data,
    });
  }
};

export const triggerToday = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return error(res, { message: 'Unauthorized', statusCode: 401 });
  }

  const userId = authReq.user.userId;

  try {
    const { canRun, schedule, reason } = await canUserRunAgentToday(userId);
    if (!canRun) {
      return success(res, {
        message: 'Agent not triggered',
        data: { triggered: false, reason },
      });
    }

    const todayWIB = nowJakarta().format('YYYY-MM-DD');
    const preferredTimes = schedule!.preferred_times.length > 0
      ? schedule!.preferred_times
      : ['19:00'];

    const payload = {
      content_preference: schedule!.content_preference,
      hashtags:           schedule!.hashtags ?? [],
      preferred_times:    preferredTimes,
      image_style:        schedule!.image_style ?? null,
      ideas_per_day:      schedule!.ideas_per_day ?? 3,
      date_from:          todayWIB,
      date_to:            todayWIB,
      triggered_by:       userId,
    };

    const response = await axios.post(
      `${AI_SERVICE_URL}/agent/trigger`,
      payload,
      { timeout: 15_000 },
    );

    logger.info(`[agentController] daily trigger started run ${response.data.run_id} for user ${userId}`);
    return success(res, {
      message: 'Daily agent run started',
      data: { triggered: true, run_id: response.data.run_id },
    });
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number; data?: unknown } };
    logger.error('[agentController] triggerToday failed', {
      message: e.message,
      status: e.response?.status,
      data: e.response?.data,
    });
    return error(res, {
      message: 'Failed to start daily agent run',
      statusCode: e.response?.status ?? 502,
    });
  }
};

export const getSettings = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) return error(res, { message: 'Unauthorized', statusCode: 401 });
  try {
    const settings = await getSettingsForUser(authReq.user.userId);
    return success(res, { data: settings });   // null = not configured yet
  } catch (err: unknown) {
    const e = err as { message?: string };
    logger.error('[agentController] getSettings failed', { message: e.message });
    return error(res, { message: 'Failed to fetch agent settings', statusCode: 500 });
  }
};

export const patchSettings = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) return error(res, { message: 'Unauthorized', statusCode: 401 });
  try {
    const settings = await upsertSettingsForUser(authReq.user.userId, req.body);
    return success(res, { message: 'Agent settings saved', data: settings });
  } catch (err: unknown) {
    const e = err as { message?: string };
    logger.error('[agentController] patchSettings failed', { message: e.message });
    return error(res, { message: 'Failed to save agent settings', statusCode: 500 });
  }
};

export const getAgentRun = async (req: Request, res: Response): Promise<Response> => {
  const { runId } = req.params;

  try {
    const response = await axios.get(`${AI_SERVICE_URL}/agent/runs/${runId}`, { timeout: 10_000 });
    return success(res, { data: response.data });
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number; data?: unknown } };
    if (e.response?.status === 404) {
      return error(res, { message: 'Agent run not found', statusCode: 404 });
    }
    logger.error('[agentController] getAgentRun failed', { message: e.message, status: e.response?.status });
    return error(res, { message: 'Failed to fetch agent run', statusCode: e.response?.status ?? 502 });
  }
};
