// @ts-nocheck
import type { Request, Response } from 'express';
import * as dashboardCalendarService from '../services/dashboardCalendarService.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';

export const getOwnerCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const year  = parseInt(req.query['year']  as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query['month'] as string, 10) || (new Date().getMonth() + 1);

    if (month < 1 || month > 12) {
      error(res, { message: 'Invalid month value (1–12)', statusCode: 400 });
      return;
    }

    const schedules = await dashboardCalendarService.getOwnerCalendar(year, month);
    success(res, { message: 'Owner calendar loaded', data: { year, month, schedules } });
  } catch (err) {
    logger.error('[dashboardController.getOwnerCalendar]', err);
    error(res, { message: 'Failed to load owner calendar', statusCode: 500 });
  }
};
