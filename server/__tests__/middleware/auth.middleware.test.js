// Authentication middleware tests
import { jest } from '@jest/globals';

// Mock jsonwebtoken before importing middleware
const mockJWT = {
    sign: jest.fn(),
    verify: jest.fn(),
};

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: mockJWT,
}));

// Mock config before importing middleware
jest.unstable_mockModule('../../config/environment.js', () => ({
    config: {
        jwt: {
            secret: 'test-jwt-secret',
            expiresIn: '1h',
        },
    },
}));

// Import after mocking
const { generateJwtToken, verifyJwtToken, requireAuth, optionalAuth, AuthenticationError, DomainNotAllowedError } = await import(
    '../../app/middleware/auth.middleware.js'
);

const { factories } = await import('../utils/testHelpers.js');

describe('Authentication Middleware', () => {
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

    describe('AuthenticationError', () => {
        it('should create authentication error with default status code', () => {
            const error = new AuthenticationError('Test error');

            expect(error.message).toBe('Test error');
            expect(error.name).toBe('AuthenticationError');
            expect(error.statusCode).toBe(401);
        });

        it('should create authentication error with custom status code', () => {
            const error = new AuthenticationError('Test error', 403);

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(403);
        });
    });

    describe('DomainNotAllowedError', () => {
        it('should create domain error with default status code', () => {
            const error = new DomainNotAllowedError('Domain not allowed');

            expect(error.message).toBe('Domain not allowed');
            expect(error.name).toBe('DomainNotAllowedError');
            expect(error.statusCode).toBe(403);
        });
    });

    describe('generateJwtToken', () => {
        it('should generate JWT token with correct payload', () => {
            const user = factories.createUser();
            const expectedToken = 'mock.jwt.token';

            mockJWT.sign.mockReturnValue(expectedToken);

            const token = generateJwtToken(user);

            expect(mockJWT.sign).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    emailVerified: user.email_verified,
                },
                'test-jwt-secret',
                {
                    expiresIn: '1h',
                    issuer: 'universal-knowledge-chatbot',
                    subject: user.id,
                },
            );

            expect(token).toBe(expectedToken);
        });

        it('should handle user without emailVerified field', () => {
            const user = factories.createUser();
            delete user.emailVerified;
            delete user.email_verified;

            mockJWT.sign.mockReturnValue('token');

            generateJwtToken(user);

            expect(mockJWT.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    emailVerified: undefined,
                }),
                expect.any(String),
                expect.any(Object),
            );
        });
    });

    describe('verifyJwtToken', () => {
        it('should verify valid JWT token', () => {
            const payload = factories.createJWTPayload();
            mockJWT.verify.mockReturnValue(payload);

            const result = verifyJwtToken('valid.jwt.token');

            expect(mockJWT.verify).toHaveBeenCalledWith('valid.jwt.token', 'test-jwt-secret');
            expect(result).toEqual(payload);
        });

        it('should throw AuthenticationError for invalid token', () => {
            mockJWT.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            expect(() => {
                verifyJwtToken('invalid.jwt.token');
            }).toThrow(AuthenticationError);

            expect(() => {
                verifyJwtToken('invalid.jwt.token');
            }).toThrow('Invalid or expired token');
        });

        it('should throw AuthenticationError for expired token', () => {
            mockJWT.verify.mockImplementation(() => {
                const error = new Error('TokenExpiredError');
                error.name = 'TokenExpiredError';
                throw error;
            });

            expect(() => {
                verifyJwtToken('expired.jwt.token');
            }).toThrow(AuthenticationError);
        });
    });

    describe('requireAuth middleware', () => {
        it('should authenticate user with valid JWT token', () => {
            const payload = factories.createJWTPayload();
            mockJWT.verify.mockReturnValue(payload);

            mockReq.headers.authorization = 'Bearer valid.jwt.token';

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockReq.user).toEqual(payload);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should authenticate user with valid session', () => {
            const user = factories.createUser();
            mockReq.session = { user };

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockReq.user).toEqual(user);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should reject request without authorization', () => {
            requireAuth(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request with invalid JWT token', () => {
            mockJWT.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            mockReq.headers.authorization = 'Bearer invalid.jwt.token';

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid or expired token',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request with malformed authorization header', () => {
            mockReq.headers.authorization = 'InvalidFormat token';

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle JWT verification errors gracefully', () => {
            mockJWT.verify.mockImplementation(() => {
                throw new Error('Unexpected JWT error');
            });

            mockReq.headers.authorization = 'Bearer problematic.jwt.token';

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid or expired token',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('optionalAuth middleware', () => {
        it('should set user when valid JWT token is provided', () => {
            const payload = factories.createJWTPayload();
            mockJWT.verify.mockReturnValue(payload);

            mockReq.headers.authorization = 'Bearer valid.jwt.token';

            optionalAuth(mockReq, mockRes, mockNext);

            expect(mockReq.user).toEqual(payload);
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should set user when valid session exists', () => {
            const user = factories.createUser();
            mockReq.session = { user };

            optionalAuth(mockReq, mockRes, mockNext);

            expect(mockReq.user).toEqual(user);
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should continue without user when no authentication is provided', () => {
            optionalAuth(mockReq, mockRes, mockNext);

            expect(mockReq.user).toBeFalsy(); // Can be undefined or null
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should continue without user when JWT token is invalid', () => {
            mockJWT.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            mockReq.headers.authorization = 'Bearer invalid.jwt.token';

            optionalAuth(mockReq, mockRes, mockNext);

            expect(mockReq.user).toBeFalsy(); // Can be undefined or null
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should prefer JWT token over session when both are present', () => {
            const jwtPayload = factories.createJWTPayload({ email: 'jwt@example.com' });
            const sessionUser = factories.createUser({ email: 'session@example.com' });

            mockJWT.verify.mockReturnValue(jwtPayload);

            mockReq.headers.authorization = 'Bearer valid.jwt.token';
            mockReq.session = { user: sessionUser };

            optionalAuth(mockReq, mockRes, mockNext);

            expect(mockReq.user).toEqual(jwtPayload);
            expect(mockReq.user.email).toBe('jwt@example.com');
            expect(mockNext).toHaveBeenCalledWith();
        });
    });

    describe('Integration scenarios', () => {
        it('should handle empty authorization header', () => {
            mockReq.headers.authorization = '';

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle Bearer token without actual token', () => {
            mockReq.headers.authorization = 'Bearer ';

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockJWT.verify).toHaveBeenCalledWith('', 'test-jwt-secret');
        });

        it('should handle case-sensitive Bearer prefix', () => {
            mockReq.headers.authorization = 'bearer valid.jwt.token';

            requireAuth(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockJWT.verify).not.toHaveBeenCalled();
        });
    });
});
