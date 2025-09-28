import { jest } from '@jest/globals';
import { ssoLogin } from '../../app/controllers/auth-controller.js';

// Mock dependencies
const mockJwtSign = jest.fn();
jest.mock('jsonwebtoken', () => ({
    default: mockJwtSign,
    sign: mockJwtSign,
}));
jest.mock('../../config/environment.js', () => ({
    config: {
        jwt: {
            secret: 'test-jwt-secret',
        },
    },
}));
jest.mock('../../app/utils/logger.js', () => ({
    error: jest.fn(),
}));
jest.mock('../../app/middleware/validation.js', () => ({
    asyncHandler: (fn) => fn, // Pass through the function
}));

// Get mock reference
import jwt from 'jsonwebtoken';

describe('Auth Controller', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            user: null,
        };
        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe('ssoLogin', () => {
        it('should generate JWT token and return user info successfully', async () => {
            const mockToken = 'mocked-jwt-token';
            mockJwtSign.mockReturnValue(mockToken);

            await ssoLogin(mockReq, mockRes);

            expect(mockJwtSign).toHaveBeenCalledWith(
                {
                    id: 'placeholder-user-id',
                    email: 'placeholder@example.com',
                },
                'test-jwt-secret',
                { expiresIn: '24h' },
            );

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    token: mockToken,
                    user: {
                        id: 'placeholder-user-id',
                        email: 'placeholder@example.com',
                    },
                },
                message: 'SSO Login successful (placeholder implementation)',
            });
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should handle JWT signing errors', async () => {
            const jwtError = new Error('JWT signing failed');
            mockJwtSign.mockImplementation(() => {
                throw jwtError;
            });

            await ssoLogin(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication failed',
                message: 'An error occurred during authentication',
            });
        });

        it('should use config JWT secret for token generation', async () => {
            const mockToken = 'test-token';
            mockJwtSign.mockReturnValue(mockToken);

            await ssoLogin(mockReq, mockRes);

            expect(mockJwtSign).toHaveBeenCalledWith(expect.any(Object), 'test-jwt-secret', expect.any(Object));
        });

        it('should set proper token expiration', async () => {
            const mockToken = 'test-token';
            mockJwtSign.mockReturnValue(mockToken);

            await ssoLogin(mockReq, mockRes);

            expect(mockJwtSign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { expiresIn: '24h' });
        });

        it('should return consistent user data structure', async () => {
            const mockToken = 'test-token';
            mockJwtSign.mockReturnValue(mockToken);

            await ssoLogin(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        token: expect.any(String),
                        user: expect.objectContaining({
                            id: expect.any(String),
                            email: expect.any(String),
                        }),
                    }),
                    message: expect.any(String),
                }),
            );
        });
    });
});
