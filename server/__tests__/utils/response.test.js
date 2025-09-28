import { jest } from '@jest/globals';
import createError from 'http-errors';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    throwBadRequest,
    throwUnauthorized,
    throwForbidden,
    throwNotFound,
    throwConflict,
    throwInternalServerError,
} from '../../app/utils/response.js';

// Mock http-errors
jest.mock('http-errors', () => {
    const mockCreateError = jest.fn();
    return {
        default: mockCreateError,
        __esModule: true,
    };
});

describe('Response Utilities', () => {
    let mockRes;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe('sendSuccess', () => {
        it('should send success response with default values', () => {
            sendSuccess(mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: {},
                timestamp: expect.any(String),
            });
        });

        it('should send success response with custom data', () => {
            const data = { id: 1, name: 'Test' };
            sendSuccess(mockRes, data);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data,
                timestamp: expect.any(String),
            });
        });

        it('should send success response with custom message', () => {
            sendSuccess(mockRes, {}, 'Operation completed');

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Operation completed',
                data: {},
                timestamp: expect.any(String),
            });
        });

        it('should send success response with custom status code', () => {
            sendSuccess(mockRes, {}, 'Created', 201);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Created',
                data: {},
                timestamp: expect.any(String),
            });
        });

        it('should include valid ISO timestamp', () => {
            sendSuccess(mockRes);

            const call = mockRes.json.mock.calls[0][0];
            expect(call.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('sendError', () => {
        it('should send error response with default values', () => {
            sendError(mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal Server Error',
                timestamp: expect.any(String),
            });
        });

        it('should send error response with custom message', () => {
            sendError(mockRes, 'Not found');

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Not found',
                timestamp: expect.any(String),
            });
        });

        it('should send error response with custom status code', () => {
            sendError(mockRes, 'Bad request', 400);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should include errors when provided', () => {
            const errors = ['Field is required'];
            sendError(mockRes, 'Validation failed', 400, errors);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors,
                timestamp: expect.any(String),
            });
        });

        it('should not include errors when null', () => {
            sendError(mockRes, 'Error message', 400, null);

            const response = mockRes.json.mock.calls[0][0];
            expect(response).not.toHaveProperty('errors');
        });
    });

    describe('sendValidationError', () => {
        it('should send validation error with 400 status', () => {
            const errors = ['Email is required', 'Password too short'];
            sendValidationError(mockRes, errors);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors,
                timestamp: expect.any(String),
            });
        });
    });

    describe('HTTP Error Helpers', () => {
        beforeEach(() => {
            // Reset the mock before each test
            createError.mockImplementation((status, message) => ({
                status,
                message,
                name: 'HttpError',
            }));
        });

        it('should throw bad request error', () => {
            expect(() => throwBadRequest('Invalid input')).toThrow();
            expect(createError).toHaveBeenCalledWith(400, 'Invalid input');
        });

        it('should throw bad request with default message', () => {
            expect(() => throwBadRequest()).toThrow();
            expect(createError).toHaveBeenCalledWith(400, 'Bad Request');
        });

        it('should throw unauthorized error', () => {
            expect(() => throwUnauthorized('Invalid token')).toThrow();
            expect(createError).toHaveBeenCalledWith(401, 'Invalid token');
        });

        it('should throw unauthorized with default message', () => {
            expect(() => throwUnauthorized()).toThrow();
            expect(createError).toHaveBeenCalledWith(401, 'Unauthorized');
        });

        it('should throw forbidden error', () => {
            expect(() => throwForbidden('Access denied')).toThrow();
            expect(createError).toHaveBeenCalledWith(403, 'Access denied');
        });

        it('should throw forbidden with default message', () => {
            expect(() => throwForbidden()).toThrow();
            expect(createError).toHaveBeenCalledWith(403, 'Forbidden');
        });

        it('should throw not found error', () => {
            expect(() => throwNotFound('Resource not found')).toThrow();
            expect(createError).toHaveBeenCalledWith(404, 'Resource not found');
        });

        it('should throw not found with default message', () => {
            expect(() => throwNotFound()).toThrow();
            expect(createError).toHaveBeenCalledWith(404, 'Not Found');
        });

        it('should throw conflict error', () => {
            expect(() => throwConflict('Resource already exists')).toThrow();
            expect(createError).toHaveBeenCalledWith(409, 'Resource already exists');
        });

        it('should throw conflict with default message', () => {
            expect(() => throwConflict()).toThrow();
            expect(createError).toHaveBeenCalledWith(409, 'Conflict');
        });

        it('should throw internal server error', () => {
            expect(() => throwInternalServerError('Database error')).toThrow();
            expect(createError).toHaveBeenCalledWith(500, 'Database error');
        });

        it('should throw internal server error with default message', () => {
            expect(() => throwInternalServerError()).toThrow();
            expect(createError).toHaveBeenCalledWith(500, 'Internal Server Error');
        });
    });
});
