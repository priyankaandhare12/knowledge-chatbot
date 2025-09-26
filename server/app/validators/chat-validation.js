import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

export const chatValidation = [
    body('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    body('sessionId').optional().isString().withMessage('Session ID must be a string'),
    handleValidationErrors,
];
