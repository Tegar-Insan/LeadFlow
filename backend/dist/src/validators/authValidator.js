// @ts-nocheck
// src/validators/authValidator.ts
// Express-validator rule sets for all auth endpoints
import { body } from 'express-validator';
export const registerRules = [
    body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters.'),
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('phone').trim().matches(/^[+]?[\d\s\-()]{8,20}$/).withMessage('Enter a valid phone number.'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Password must include uppercase, lowercase, number and special character (@$!%*?&).'),
    body('role')
        .isIn(['business_owner', 'marketing_staff'])
        .withMessage('Role must be business_owner or marketing_staff.'),
];
export const verifyOTPRules = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits.'),
];
export const loginRules = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password is required.'),
];
export const resendOTPRules = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('type').optional().isIn(['register', 'login', 'reset']).withMessage('Invalid OTP type.'),
];
//# sourceMappingURL=authValidator.js.map