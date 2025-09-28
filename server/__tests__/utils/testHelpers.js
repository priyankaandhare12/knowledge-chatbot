// Backend test utilities
import { jest } from '@jest/globals';

/**
 * Test data factories for creating consistent test data
 */
export const factories = {
    /**
     * Create user data for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} - User data
     */
    createUser: (overrides = {}) => ({
        id: 'auth0|test-user-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        emailVerified: true,
        email_verified: true, // Keep both formats for compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    }),

    /**
     * Create chat message data for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} - Chat message data
     */
    createChatMessage: (overrides = {}) => ({
        id: 'msg-' + Date.now(),
        content: 'This is a test message',
        role: 'user',
        timestamp: new Date().toISOString(),
        userId: 'auth0|test-user',
        sessionId: 'session-' + Date.now(),
        ...overrides,
    }),

    /**
     * Create API response data for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} - API response data
     */
    createApiResponse: (overrides = {}) => ({
        success: true,
        data: null,
        message: 'Success',
        timestamp: new Date().toISOString(),
        ...overrides,
    }),

    /**
     * Create error response data for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} - Error response data
     */
    createErrorResponse: (overrides = {}) => ({
        success: false,
        error: 'Test Error',
        message: 'An error occurred during testing',
        code: 'TEST_ERROR',
        timestamp: new Date().toISOString(),
        ...overrides,
    }),

    /**
     * Create JWT payload data for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} - JWT payload data
     */
    createJWTPayload: (overrides = {}) => ({
        sub: 'auth0|test-user-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        iss: process.env.AUTH0_DOMAIN || 'test-domain.auth0.com',
        aud: process.env.AUTH0_AUDIENCE || 'test-audience',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        azp: process.env.AUTH0_CLIENT_ID || 'test-client-id',
        scope: 'openid profile email',
        ...overrides,
    }),

    /**
     * Create file upload data for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} - File upload data
     */
    createFileUpload: (overrides = {}) => ({
        fieldname: 'file',
        originalname: 'test-document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test file content'),
        size: 1024,
        ...overrides,
    }),
};

/**
 * Common assertion helpers for backend testing
 */
export const assertions = {
    /**
     * Assert that a response has the expected success structure
     * @param {Object} response - Response object to check
     * @param {any} expectedData - Expected data payload
     */
    expectSuccessResponse: (response, expectedData = null) => {
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('timestamp');

        if (expectedData !== null) {
            expect(response).toHaveProperty('data', expectedData);
        }
    },

    /**
     * Assert that a response has the expected error structure
     * @param {Object} response - Response object to check
     * @param {string} expectedError - Expected error message or code
     * @param {number} expectedStatus - Expected HTTP status code
     */
    expectErrorResponse: (response, expectedError, expectedStatus = null) => {
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('timestamp');

        if (expectedError) {
            expect(response.error === expectedError || response.message === expectedError || response.code === expectedError).toBe(true);
        }
    },

    /**
     * Assert that a user object has the expected structure
     * @param {Object} user - User object to check
     */
    expectValidUser: (user) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(user).toHaveProperty('name');
    },

    /**
     * Assert that middleware was called correctly
     * @param {Object} mockMiddleware - Mock middleware function
     * @param {Object} expectedReq - Expected request object properties
     * @param {Object} expectedRes - Expected response object properties
     */
    expectMiddlewareCalled: (mockMiddleware, expectedReq = {}, expectedRes = {}) => {
        expect(mockMiddleware).toHaveBeenCalled();

        const [req, res, next] = mockMiddleware.mock.calls[0];

        Object.keys(expectedReq).forEach((key) => {
            expect(req).toHaveProperty(key, expectedReq[key]);
        });

        Object.keys(expectedRes).forEach((key) => {
            expect(res[key]).toHaveBeenCalledWith(expectedRes[key]);
        });
    },
};

/**
 * Mock generators for external services
 */
export const mocks = {
    /**
     * Create mock Auth0 management client
     */
    createAuth0Mock: () => ({
        getUser: jest.fn(),
        updateUser: jest.fn(),
        getUsers: jest.fn(),
        createUser: jest.fn(),
        deleteUser: jest.fn(),
    }),

    /**
     * Create mock OpenAI client
     */
    createOpenAIMock: () => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [
                        {
                            message: {
                                content: 'Mock AI response',
                                role: 'assistant',
                            },
                        },
                    ],
                }),
            },
        },
    }),

    /**
     * Create mock Pinecone client
     */
    createPineconeMock: () => ({
        Index: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({
                matches: [],
            }),
            upsert: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
        }),
    }),

    /**
     * Create mock Tavily search client
     */
    createTavilyMock: () => ({
        search: jest.fn().mockResolvedValue({
            results: [
                {
                    title: 'Mock Search Result',
                    url: 'https://example.com',
                    content: 'Mock search content',
                },
            ],
        }),
    }),

    /**
     * Create mock Express app for testing
     */
    createExpressAppMock: () => {
        const app = {
            use: jest.fn(),
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            patch: jest.fn(),
            listen: jest.fn((port, callback) => {
                if (callback) callback();
                return { close: jest.fn() };
            }),
            locals: {},
        };

        // Add common Express methods
        ['use', 'get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
            app[method].mockReturnValue(app);
        });

        return app;
    },
};

/**
 * Database test helpers
 */
export const dbHelpers = {
    /**
     * Reset all test database state
     */
    resetTestDB: () => {
        global.testUtils.mockDB.reset();
    },

    /**
     * Seed test database with sample data
     */
    seedTestDB: () => {
        const user = global.testUtils.mockDB.createUser(factories.createUser({ id: 'auth0|seed-user' }));

        const session = global.testUtils.mockDB.createSession({
            userId: user.id,
            id: 'seed-session',
        });

        return { user, session };
    },
};

/**
 * HTTP test helpers
 */
export const httpHelpers = {
    /**
     * Create authorization header with JWT token
     * @param {Object} payload - JWT payload
     * @returns {Object} - Authorization headers
     */
    createAuthHeaders: (payload = {}) => ({
        Authorization: `Bearer ${global.testUtils.createMockJWT(payload)}`,
    }),

    /**
     * Create headers for JSON requests
     * @param {Object} additionalHeaders - Additional headers
     * @returns {Object} - Request headers
     */
    createJsonHeaders: (additionalHeaders = {}) => ({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...additionalHeaders,
    }),

    /**
     * Create headers for file upload requests
     * @param {Object} additionalHeaders - Additional headers
     * @returns {Object} - Request headers
     */
    createFileHeaders: (additionalHeaders = {}) => ({
        'Content-Type': 'multipart/form-data',
        ...additionalHeaders,
    }),
};

export default {
    factories,
    assertions,
    mocks,
    dbHelpers,
    httpHelpers,
};
