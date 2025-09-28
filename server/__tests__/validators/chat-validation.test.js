import { jest } from '@jest/globals';
import { body } from 'express-validator';
import { chatValidation } from '../../app/validators/chat-validation.js';

// Mock express-validator
const mockBody = jest.fn(() => ({
    trim: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isString: jest.fn().mockReturnThis(),
    isUUID: jest.fn().mockReturnThis(),
}));

jest.mock('express-validator', () => ({
    body: mockBody,
}));

jest.mock('../../app/middleware/validation.js', () => ({
    handleValidationErrors: jest.fn(),
}));

describe('Chat Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should export chatValidation array', () => {
        expect(Array.isArray(chatValidation)).toBe(true);
        expect(chatValidation.length).toBeGreaterThan(0);
    });

    it('should validate message field', () => {
        expect(mockBody).toHaveBeenCalledWith('message');
    });

    it('should validate conversationId field as optional', () => {
        expect(mockBody).toHaveBeenCalledWith('conversationId');
    });

    it('should validate fileId field as optional', () => {
        expect(mockBody).toHaveBeenCalledWith('fileId');
    });

    it('should include validation error handler', async () => {
        const { handleValidationErrors } = await import('../../app/middleware/validation.js');
        expect(chatValidation).toContain(handleValidationErrors);
    });

    it('should set up proper validation chain for message', async () => {
        const mockBodyValidator = {
            trim: jest.fn().mockReturnThis(),
            notEmpty: jest.fn().mockReturnThis(),
            withMessage: jest.fn().mockReturnThis(),
            isLength: jest.fn().mockReturnThis(),
        };

        mockBody.mockReturnValue(mockBodyValidator);

        // Re-import to trigger validation setup
        jest.isolateModules(async () => {
            await import('../../app/validators/chat-validation.js');
        });

        expect(mockBody).toHaveBeenCalledWith('message');
    });

    it('should set up proper validation chain for conversationId', async () => {
        const mockBodyValidator = {
            optional: jest.fn().mockReturnThis(),
            isString: jest.fn().mockReturnThis(),
            withMessage: jest.fn().mockReturnThis(),
        };

        mockBody.mockReturnValue(mockBodyValidator);

        jest.isolateModules(async () => {
            await import('../../app/validators/chat-validation.js');
        });

        expect(mockBody).toHaveBeenCalledWith('conversationId');
    });

    it('should set up proper validation chain for fileId', async () => {
        const mockBodyValidator = {
            optional: jest.fn().mockReturnThis(),
            isString: jest.fn().mockReturnThis(),
            withMessage: jest.fn().mockReturnThis(),
            isUUID: jest.fn().mockReturnThis(),
        };

        mockBody.mockReturnValue(mockBodyValidator);

        jest.isolateModules(async () => {
            await import('../../app/validators/chat-validation.js');
        });

        expect(mockBody).toHaveBeenCalledWith('fileId');
    });

    it('should have correct validation structure', () => {
        expect(chatValidation.length).toBe(4); // 3 validators + error handler
    });
});
