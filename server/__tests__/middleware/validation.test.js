import { jest } from '@jest/globals';
import { validationResult } from 'express-validator';
import { handleValidationErrors, asyncHandler } from '../../app/middleware/validation.js';

// Mock express-validator
jest.mock('express-validator', () => ({
    validationResult: jest.fn(),
}));

describe('Validation Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('handleValidationErrors', () => {
        it('should call next when no validation errors', () => {
            validationResult.mockImplementation(() => ({
                isEmpty: () => true,
            }));

            handleValidationErrors(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
        });

        it('should return 400 when validation errors exist', () => {
            const mockErrors = [
                { msg: 'Email is required', param: 'email' },
                { msg: 'Password too short', param: 'password' },
            ];

            validationResult.mockImplementation(() => ({
                isEmpty: () => false,
                array: () => mockErrors,
            }));

            handleValidationErrors(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: mockErrors,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle empty errors array', () => {
            validationResult.mockImplementation(() => ({
                isEmpty: () => false,
                array: () => [],
            }));

            handleValidationErrors(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: [],
            });
        });

        it('should call validationResult with request object', () => {
            validationResult.mockImplementation(() => ({
                isEmpty: () => true,
            }));

            handleValidationErrors(mockReq, mockRes, mockNext);

            expect(validationResult).toHaveBeenCalledWith(mockReq);
        });
    });

    describe('asyncHandler', () => {
        it('should wrap async function and call next on success', async () => {
            const mockAsyncFn = jest.fn().mockResolvedValue('success');
            const wrappedFn = asyncHandler(mockAsyncFn);

            await wrappedFn(mockReq, mockRes, mockNext);

            expect(mockAsyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled(); // next should not be called on success
        });

        it('should call next with error when async function throws', async () => {
            const error = new Error('Async function failed');
            const mockAsyncFn = jest.fn().mockRejectedValue(error);
            const wrappedFn = asyncHandler(mockAsyncFn);

            await wrappedFn(mockReq, mockRes, mockNext);

            expect(mockAsyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });

        it('should handle synchronous functions', async () => {
            const mockSyncFn = jest.fn().mockReturnValue('success');
            const wrappedFn = asyncHandler(mockSyncFn);

            await wrappedFn(mockReq, mockRes, mockNext);

            expect(mockSyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
        });

        it('should handle functions that throw synchronously', async () => {
            const error = new Error('Sync function failed');
            const mockSyncFn = jest.fn().mockImplementation(() => {
                throw error;
            });
            const wrappedFn = asyncHandler(mockSyncFn);

            await wrappedFn(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });

        it('should return a function', () => {
            const mockFn = jest.fn();
            const wrappedFn = asyncHandler(mockFn);

            expect(typeof wrappedFn).toBe('function');
        });

        it('should handle null/undefined errors', async () => {
            const mockAsyncFn = jest.fn().mockRejectedValue(null);
            const wrappedFn = asyncHandler(mockAsyncFn);

            await wrappedFn(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(null);
        });

        it('should preserve function context', async () => {
            const mockAsyncFn = jest.fn().mockResolvedValue('success');
            const wrappedFn = asyncHandler(mockAsyncFn);

            const result = await wrappedFn(mockReq, mockRes, mockNext);

            expect(mockAsyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
        });
    });
});
