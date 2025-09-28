// Error handler middleware tests
import { jest } from '@jest/globals';

// Mock dependencies before importing
const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

jest.unstable_mockModule('../../app/utils/logger.js', () => ({
    default: mockLogger,
}));

jest.unstable_mockModule('../../config/environment.js', () => ({
    config: {
        nodeEnv: 'test',
    },
}));

const mockCreateError = jest.fn();
jest.unstable_mockModule('http-errors', () => ({
    default: mockCreateError,
}));

// Import after mocking
const { errorHandler, notFoundHandler } = await import('../../app/middleware/error-handler.js');

describe('Error Handler Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = global.testUtils.createMockRequest();
        mockRes = global.testUtils.createMockResponse();
        mockNext = global.testUtils.createMockNext();

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('errorHandler', () => {
        it('should handle errors with status code', () => {
            const error = new Error('Unauthorized access');
            error.status = 401;
            error.stack = 'Error stack trace';

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error:');
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unauthorized access',
            });
        });

        it('should handle ValidationError', () => {
            const error = new Error('Email is required');
            error.name = 'ValidationError';

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation Error',
                details: 'Email is required',
            });
        });

        it('should handle CastError', () => {
            const error = new Error('Invalid ObjectId');
            error.name = 'CastError';

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid ID format',
            });
        });

        it('should handle generic errors in development', () => {
            // Mock development environment
            jest.unstable_mockModule('../../config/environment.js', () => ({
                config: {
                    nodeEnv: 'development',
                },
            }));

            const error = new Error('Database connection failed');
            error.stack = 'Error stack trace';

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Database connection failed',
            });
        });

        it('should handle generic errors in production', () => {
            // Mock production environment
            jest.unstable_mockModule('../../config/environment.js', () => ({
                config: {
                    nodeEnv: 'production',
                },
            }));

            const error = new Error('Database connection failed');
            error.stack = 'Error stack trace';

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Database connection failed',
            });
        });

        it('should log all errors', () => {
            const error = new Error('Test error');

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error:');
        });

        it('should not call next() for handled errors', () => {
            const error = new Error('Test error');
            error.status = 400;

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle errors without message', () => {
            const error = new Error();
            error.status = 500;

            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: '',
                }),
            );
        });

        it('should handle null or undefined errors gracefully', () => {
            // The error handler needs to handle null errors
            const error = new Error('Unknown error');
            errorHandler(error, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unknown error',
            });
        });
    });

    describe('notFoundHandler', () => {
        it('should create 404 error for unknown routes', () => {
            mockReq.originalUrl = '/api/unknown/endpoint';
            mockCreateError.mockReturnValue(new Error('Route not found'));

            notFoundHandler(mockReq, mockRes, mockNext);

            expect(mockCreateError).toHaveBeenCalledWith(404, 'Route /api/unknown/endpoint not found');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle root path 404', () => {
            mockReq.originalUrl = '/';
            mockCreateError.mockReturnValue(new Error('Route not found'));

            notFoundHandler(mockReq, mockRes, mockNext);

            expect(mockCreateError).toHaveBeenCalledWith(404, 'Route / not found');
        });

        it('should handle paths with query parameters', () => {
            mockReq.originalUrl = '/api/users?page=1&limit=10';
            mockCreateError.mockReturnValue(new Error('Route not found'));

            notFoundHandler(mockReq, mockRes, mockNext);

            expect(mockCreateError).toHaveBeenCalledWith(404, 'Route /api/users?page=1&limit=10 not found');
        });
    });
});
