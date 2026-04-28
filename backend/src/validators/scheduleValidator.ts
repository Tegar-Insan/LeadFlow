// @ts-nocheck
/**
 * scheduleValidator.ts
 * express-validator rules for content schedule CRUD
 * LeadFlow – Krench Chicken
 */

import { body } from 'express-validator';
import dayjs from 'dayjs';
import { utc, timezone as tz } from '../utils/dayjsPlugins.ts';
import { nowJakarta } from '../utils/jakartaTime.ts';

dayjs.extend(utc);
dayjs.extend(tz);

export const scheduleCreateRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title max 255 characters'),

  body('description')
    .optional()
    .isString().withMessage('Description must be a string'),

  body('caption')
    .optional()
    .isString(),

  body('hashtags')
    .optional()
    .isArray().withMessage('Hashtags must be an array')
    .custom((arr) => arr.every(h => typeof h === 'string'))
    .withMessage('Each hashtag must be a string'),

  body('scheduled_at')
    .optional({ nullable: true })
    .isISO8601().withMessage('scheduled_at must be a valid ISO 8601 datetime')
    .custom((val) => {
      if (val && dayjs(val).isBefore(nowJakarta())) {
        throw new Error('Cannot schedule content in the past. Please choose a future date and time (WIB).');
      }
      return true;
    }),

  body('priority')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Priority must be 0–100'),

  body('content_idea_id')
    .optional({ nullable: true })
    .isUUID().withMessage('content_idea_id must be a valid UUID'),
];

export const scheduleUpdateRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 255 }),

  body('description')
    .optional()
    .isString(),

  body('caption')
    .optional()
    .isString(),

  body('hashtags')
    .optional()
    .isArray(),

  body('scheduled_at')
    .optional({ nullable: true })
    .isISO8601().withMessage('scheduled_at must be valid ISO 8601'),

  body('status')
    .optional()
    .isIn(['draft', 'planned', 'scheduled', 'published', 'failed'])
    .withMessage('Invalid status'),

  body('priority')
    .optional()
    .isInt({ min: 0, max: 100 }),
];
