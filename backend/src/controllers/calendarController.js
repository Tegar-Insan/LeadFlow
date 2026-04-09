/**
 * calendarController.js
 * MVC Controller – Content Calendar (UC007 + UC008)
 * LeadFlow – Krench Chicken
 */

const { validationResult } = require('express-validator');
const scheduleService      = require('../services/scheduleService');
const { success, error }   = require('../utils/responseHelper');
const logger               = require('../utils/logger');

// ─────────────────────────────────────────────────────────
// GET /api/calendar?year=2026&month=4
// Accessible: marketing_staff, business_owner, admin
// ─────────────────────────────────────────────────────────
const getCalendarByMonth = async (req, res) => {
  try {
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);

    if (month < 1 || month > 12) {
      return res.status(400).json(error('Invalid month value (1–12)'));
    }

    const schedules = await scheduleService.getSchedulesByMonth(year, month);
    return success(res, { message: 'Calendar loaded', data: { year, month, schedules } });
  } catch (err) {
    logger.error('[calendarController.getCalendarByMonth]', err);
    return error(res, { message: 'Failed to load calendar', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/calendar/drafts
// Returns draft items (no scheduled_at)
// ─────────────────────────────────────────────────────────
const getDrafts = async (req, res) => {
  try {
    const drafts = await scheduleService.getDraftSchedules();
    return success(res, { message: 'Drafts loaded', data: { drafts } });
  } catch (err) {
    logger.error('[calendarController.getDrafts]', err);
    return error(res, { message: 'Failed to load drafts', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/calendar/:id
// ─────────────────────────────────────────────────────────
const getScheduleById = async (req, res) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id);
    if (!schedule) return error(res, { message: 'Schedule not found', statusCode: 404 });
    return success(res, { message: 'Schedule loaded', data: { schedule } });
  } catch (err) {
    logger.error('[calendarController.getScheduleById]', err);
    return error(res, { message: 'Failed to load schedule', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/calendar
// Body: { title, description, caption, hashtags, scheduled_at, priority }
// Roles: marketing_staff, admin
// ─────────────────────────────────────────────────────────
const createSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, { message: 'Validation failed', errors: errors.array(), statusCode: 422 });
  }

  try {
    const {
      content_idea_id,
      title,
      description,
      caption,
      hashtags,
      scheduled_at,
      priority,
    } = req.body;

    const schedule = await scheduleService.createSchedule({
      idea_id: content_idea_id || null,
      created_by: req.user.userId,
      title,
      description,
      caption,
      hashtags: hashtags || [],
      scheduled_at: scheduled_at || null,
      priority: priority || 0,
    });

    logger.info(`[Calendar] Schedule created id=${schedule.id} by user=${req.user.userId}`);
    return success(res, { message: 'Schedule created', data: { schedule }, statusCode: 201 });
  } catch (err) {
    logger.error('[calendarController.createSchedule]', err);
    return error(res, { message: 'Failed to create schedule', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────
// PUT /api/calendar/:id
// Body: any updatable fields
// Roles: marketing_staff, admin
// ─────────────────────────────────────────────────────────
const updateSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, { message: 'Validation failed', errors: errors.array(), statusCode: 422 });
  }

  try {
    const existing = await scheduleService.getScheduleById(req.params.id);
    if (!existing) return error(res, { message: 'Schedule not found', statusCode: 404 });

    // Prevent editing published schedules
    if (existing.status === 'published') {
      return error(res, { message: 'Cannot edit a published schedule', statusCode: 409 });
    }

    const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
    logger.info(`[Calendar] Schedule updated id=${schedule.id}`);
    return success(res, { message: 'Schedule updated', data: { schedule } });
  } catch (err) {
    logger.error('[calendarController.updateSchedule]', err);
    return error(res, { message: 'Failed to update schedule', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/calendar/:id/move
// Body: { scheduled_at } — drag & drop reschedule
// Roles: marketing_staff, admin
// ─────────────────────────────────────────────────────────
const moveSchedule = async (req, res) => {
  try {
    const { scheduled_at } = req.body;
    if (!scheduled_at) {
      return error(res, { message: 'scheduled_at is required for move', statusCode: 400 });
    }

    const existing = await scheduleService.getScheduleById(req.params.id);
    if (!existing) return error(res, { message: 'Schedule not found', statusCode: 404 });
    if (existing.status === 'published') {
      return error(res, { message: 'Cannot move a published schedule', statusCode: 409 });
    }

    const schedule = await scheduleService.moveSchedule(req.params.id, scheduled_at);
    logger.info(`[Calendar] Schedule moved id=${schedule.id} to ${scheduled_at}`);
    return success(res, { message: 'Schedule moved', data: { schedule } });
  } catch (err) {
    logger.error('[calendarController.moveSchedule]', err);
    return error(res, { message: 'Failed to move schedule', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/calendar/:id
// Roles: marketing_staff, admin
// ─────────────────────────────────────────────────────────
const deleteSchedule = async (req, res) => {
  try {
    const existing = await scheduleService.getScheduleById(req.params.id);
    if (!existing) return error(res, { message: 'Schedule not found', statusCode: 404 });

    if (existing.status === 'published') {
      return error(res, { message: 'Cannot delete a published schedule', statusCode: 409 });
    }

    await scheduleService.deleteSchedule(req.params.id);
    logger.info(`[Calendar] Schedule deleted id=${req.params.id}`);
    return success(res, { message: 'Schedule deleted' });
  } catch (err) {
    logger.error('[calendarController.deleteSchedule]', err);
    return error(res, { message: 'Failed to delete schedule', statusCode: 500 });
  }
};

module.exports = {
  getCalendarByMonth,
  getDrafts,
  getScheduleById,
  createSchedule,
  updateSchedule,
  moveSchedule,
  deleteSchedule,
};