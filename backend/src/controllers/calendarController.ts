// @ts-nocheck
import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as scheduleService from '../services/scheduleService.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';
import { broadcastCalendarUpdateFromDate } from '../utils/calendarSocket.ts';

export const getCalendarByMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query['year'] as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query['month'] as string, 10) || (new Date().getMonth() + 1);

    if (month < 1 || month > 12) { error(res, { message: 'Invalid month value (1–12)', statusCode: 400 }); return; }

    const schedules = await scheduleService.getSchedulesByMonth(year, month);
    success(res, { message: 'Calendar loaded', data: { year, month, schedules } });
  } catch (err) {
    logger.error('[calendarController.getCalendarByMonth]', err);
    error(res, { message: 'Failed to load calendar', statusCode: 500 });
  }
};

export const getDrafts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const drafts = await scheduleService.getDraftSchedules();
    success(res, { message: 'Drafts loaded', data: { drafts } });
  } catch (err) {
    logger.error('[calendarController.getDrafts]', err);
    error(res, { message: 'Failed to load drafts', statusCode: 500 });
  }
};

export const getScheduleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params['id'] as string);
    if (!schedule) { error(res, { message: 'Schedule not found', statusCode: 404 }); return; }
    success(res, { message: 'Schedule loaded', data: { schedule } });
  } catch (err) {
    logger.error('[calendarController.getScheduleById]', err);
    error(res, { message: 'Failed to load schedule', statusCode: 500 });
  }
};

export const createSchedule = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { error(res, { message: 'Validation failed', errors: errors.array(), statusCode: 422 }); return; }

  try {
    const authReq = req as AuthenticatedRequest;
    const { content_idea_id, title, description, caption, hashtags, scheduled_at, status, priority } =
      req.body as Record<string, unknown>;

    const schedule = await scheduleService.createSchedule({
      idea_id: (content_idea_id as string | null) ?? null,
      created_by: authReq.user.userId,
      title: title as string,
      description: description as string | undefined,
      caption: caption as string | undefined,
      hashtags: (hashtags as string[]) ?? [],
      scheduled_at: (scheduled_at as string | null) ?? null,
      status: status as string | null,
      priority: (priority as number) ?? 0,
    });

    logger.info(`[Calendar] Schedule created id=${schedule.id} by user=${authReq.user.userId}`);
    const _io1 = (req.app as any).io;
    if (_io1) broadcastCalendarUpdateFromDate(_io1, schedule.scheduled_at);
    success(res, { message: 'Schedule created', data: { schedule }, statusCode: 201 });
  } catch (err) {
    logger.error('[calendarController.createSchedule]', err);
    error(res, { message: 'Failed to create schedule', statusCode: 500 });
  }
};

export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { error(res, { message: 'Validation failed', errors: errors.array(), statusCode: 422 }); return; }

  try {
    const existing = await scheduleService.getScheduleById(req.params['id'] as string);
    if (!existing) { error(res, { message: 'Schedule not found', statusCode: 404 }); return; }
    if ((existing as { status?: string }).status === 'published') {
      error(res, { message: 'Cannot edit a published schedule', statusCode: 409 }); return;
    }

    const schedule = await scheduleService.updateSchedule(req.params['id'] as string, req.body as Record<string, unknown>);
    logger.info(`[Calendar] Schedule updated id=${(schedule as { id: string }).id}`);
    const _io2 = (req.app as any).io;
    if (_io2) broadcastCalendarUpdateFromDate(_io2, (schedule as any).scheduled_at);
    success(res, { message: 'Schedule updated', data: { schedule } });
  } catch (err) {
    logger.error('[calendarController.updateSchedule]', err);
    error(res, { message: 'Failed to update schedule', statusCode: 500 });
  }
};

export const moveSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduled_at } = req.body as { scheduled_at?: string };
    if (!scheduled_at) { error(res, { message: 'scheduled_at is required for move', statusCode: 400 }); return; }

    const existing = await scheduleService.getScheduleById(req.params['id'] as string);
    if (!existing) { error(res, { message: 'Schedule not found', statusCode: 404 }); return; }
    if ((existing as { status?: string }).status === 'published') {
      error(res, { message: 'Cannot move a published schedule', statusCode: 409 }); return;
    }

    const schedule = await scheduleService.moveSchedule(req.params['id'] as string, scheduled_at);
    logger.info(`[Calendar] Schedule moved id=${(schedule as { id: string }).id} to ${scheduled_at}`);
    const _io3 = (req.app as any).io;
    if (_io3) broadcastCalendarUpdateFromDate(_io3, scheduled_at);
    success(res, { message: 'Schedule moved', data: { schedule } });
  } catch (err) {
    logger.error('[calendarController.moveSchedule]', err);
    error(res, { message: 'Failed to move schedule', statusCode: 500 });
  }
};

export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await scheduleService.getScheduleById(req.params['id'] as string);
    if (!existing) { error(res, { message: 'Schedule not found', statusCode: 404 }); return; }
    if ((existing as { status?: string }).status === 'published') {
      error(res, { message: 'Cannot delete a published schedule', statusCode: 409 }); return;
    }

    await scheduleService.deleteSchedule(req.params['id'] as string);
    logger.info(`[Calendar] Schedule deleted id=${req.params['id']}`);
    const _io4 = (req.app as any).io;
    if (_io4) broadcastCalendarUpdateFromDate(_io4, (existing as any).scheduled_at);
    success(res, { message: 'Schedule deleted' });
  } catch (err) {
    logger.error('[calendarController.deleteSchedule]', err);
    error(res, { message: 'Failed to delete schedule', statusCode: 500 });
  }
};

export const getListView = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    if (!userId) { error(res, { message: 'Unauthorized', statusCode: 401 }); return; }

    const filter = (req.query['filter'] as string) || 'month';
    const date = (req.query['date'] as string) || new Date().toISOString().split('T')[0];

    if (!['day', 'week', 'month'].includes(filter)) {
      error(res, { message: 'Invalid filter. Must be day, week, or month', statusCode: 400 }); return;
    }

    const schedules = await scheduleService.getSchedulesForListView(
      userId,
      filter as 'day' | 'week' | 'month',
      date,
    );

    logger.info(`[Calendar] List view filter=${filter} date=${date} count=${schedules.length}`);
    success(res, { message: 'Schedules retrieved', data: schedules });
  } catch (err) {
    logger.error('[calendarController.getListView]', err);
    error(res, { message: 'Failed to fetch schedules', statusCode: 500 });
  }
};
