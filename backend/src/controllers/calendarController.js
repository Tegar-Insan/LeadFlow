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
    return res.status(200).json(success('Calendar loaded', { year, month, schedules }));
  } catch (err) {
    logger.error('[calendarController.getCalendarByMonth]', err);
    return res.status(500).json(error('Failed to load calendar'));
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/calendar/drafts
// Returns draft items (no scheduled_at)
// ─────────────────────────────────────────────────────────
const getDrafts = async (req, res) => {
  try {
    const drafts = await scheduleService.getDraftSchedules();
    return res.status(200).json(success('Drafts loaded', { drafts }));
  } catch (err) {
    logger.error('[calendarController.getDrafts]', err);
    return res.status(500).json(error('Failed to load drafts'));
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/calendar/:id
// ─────────────────────────────────────────────────────────
const getScheduleById = async (req, res) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json(error('Schedule not found'));
    return res.status(200).json(success('Schedule loaded', { schedule }));
  } catch (err) {
    logger.error('[calendarController.getScheduleById]', err);
    return res.status(500).json(error('Failed to load schedule'));
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
    return res.status(422).json(error('Validation failed', { errors: errors.array() }));
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
      content_idea_id: content_idea_id || null,
      created_by: req.user.id,
      title,
      description,
      caption,
      hashtags: hashtags || [],
      scheduled_at: scheduled_at || null,
      priority: priority || 0,
    });

    logger.info(`[Calendar] Schedule created id=${schedule.id} by user=${req.user.id}`);
    return res.status(201).json(success('Schedule created', { schedule }));
  } catch (err) {
    logger.error('[calendarController.createSchedule]', err);
    return res.status(500).json(error('Failed to create schedule'));
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
    return res.status(422).json(error('Validation failed', { errors: errors.array() }));
  }

  try {
    const existing = await scheduleService.getScheduleById(req.params.id);
    if (!existing) return res.status(404).json(error('Schedule not found'));

    // Prevent editing published schedules
    if (existing.status === 'published') {
      return res.status(409).json(error('Cannot edit a published schedule'));
    }

    const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
    logger.info(`[Calendar] Schedule updated id=${schedule.id}`);
    return res.status(200).json(success('Schedule updated', { schedule }));
  } catch (err) {
    logger.error('[calendarController.updateSchedule]', err);
    return res.status(500).json(error('Failed to update schedule'));
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
      return res.status(400).json(error('scheduled_at is required for move'));
    }

    const existing = await scheduleService.getScheduleById(req.params.id);
    if (!existing) return res.status(404).json(error('Schedule not found'));
    if (existing.status === 'published') {
      return res.status(409).json(error('Cannot move a published schedule'));
    }

    const schedule = await scheduleService.moveSchedule(req.params.id, scheduled_at);
    logger.info(`[Calendar] Schedule moved id=${schedule.id} to ${scheduled_at}`);
    return res.status(200).json(success('Schedule moved', { schedule }));
  } catch (err) {
    logger.error('[calendarController.moveSchedule]', err);
    return res.status(500).json(error('Failed to move schedule'));
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/calendar/:id
// Roles: marketing_staff, admin
// ─────────────────────────────────────────────────────────
const deleteSchedule = async (req, res) => {
  try {
    const existing = await scheduleService.getScheduleById(req.params.id);
    if (!existing) return res.status(404).json(error('Schedule not found'));

    if (existing.status === 'published') {
      return res.status(409).json(error('Cannot delete a published schedule'));
    }

    await scheduleService.deleteSchedule(req.params.id);
    logger.info(`[Calendar] Schedule deleted id=${req.params.id}`);
    return res.status(200).json(success('Schedule deleted'));
  } catch (err) {
    logger.error('[calendarController.deleteSchedule]', err);
    return res.status(500).json(error('Failed to delete schedule'));
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