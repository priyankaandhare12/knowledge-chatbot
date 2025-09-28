// Backend test environment setup
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '0'; // Use random port for tests

// Mock environment variables that may not be set in test
process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'test-domain.auth0.com';
process.env.AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'test-audience';
process.env.AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || 'test-client-id';
process.env.AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || 'test-client-secret';

// Mock external services by default
jest.mock('axios');
jest.mock('@pinecone-database/pinecone');
jest.mock('@langchain/openai');
jest.mock('@langchain/tavily');

// Global test utilities
global.testUtils = {
    /**
     * Create a mock JWT token for testing
     * @param {Object} payload - JWT payload
     * @returns {string} - Mock JWT token
     */
    createMockJWT: (payload = {}) => {
        const defaultPayload = {
            sub: 'test-user-id',
            email: 'test@example.com',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
            ...payload,
        };

        // For tests, we'll use a simple base64 encoded payload
        // In real implementation, this would be a proper JWT
        return `mock.${Buffer.from(JSON.stringify(defaultPayload)).toString('base64')}.signature`;
    },

    /**
     * Create mock request object for testing middleware
     * @param {Object} options - Request options
     * @returns {Object} - Mock request object
     */
    createMockRequest: (options = {}) => {
        const { headers = {}, cookies = {}, body = {}, query = {}, params = {}, user = null, ...rest } = options;

        return {
            headers: {
                'content-type': 'application/json',
                ...headers,
            },
            cookies,
            body,
            query,
            params,
            user,
            get: jest.fn((name) => headers[name.toLowerCase()]),
            ...rest,
        };
    },

    /**
     * Create mock response object for testing middleware
     * @param {Object} options - Response options
     * @returns {Object} - Mock response object
     */
    createMockResponse: (options = {}) => {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            get: jest.fn(),
            locals: {},
            ...options,
        };

        return res;
    },

    /**
     * Create mock next function for middleware testing
     * @returns {Function} - Mock next function
     */
    createMockNext: () => jest.fn(),

    /**
     * Wait for a specified amount of time
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} - Promise that resolves after the specified time
     */
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

    /**
     * Mock database operations
     */
    mockDB: {
        users: new Map(),
        sessions: new Map(),

        reset: function () {
            this.users.clear();
            this.sessions.clear();
        },

        createUser: function (userData) {
            const user = {
                id: userData.id || 'test-user-' + Date.now(),
                email: userData.email || 'test@example.com',
                name: userData.name || 'Test User',
                createdAt: new Date().toISOString(),
                ...userData,
            };
            this.users.set(user.id, user);
            return user;
        },

        createSession: function (sessionData) {
            const session = {
                id: sessionData.id || 'test-session-' + Date.now(),
                userId: sessionData.userId,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
                ...sessionData,
            };
            this.sessions.set(session.id, session);
            return session;
        },
    },
};

// Setup and teardown for each test
beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock database
    global.testUtils.mockDB.reset();

    // Reset environment to test defaults
    process.env.NODE_ENV = 'test';
});

afterEach(() => {
    // Clean up any remaining timers
    jest.clearAllTimers();
});

// Global teardown
afterAll(() => {
    // Cleanup any global resources
    jest.restoreAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in test environment, just log
});

// Suppress console.log in tests unless specifically enabled
if (!process.env.TEST_VERBOSE) {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        // Keep error and warn for debugging
        error: console.error,
        warn: console.warn,
    };
}

export default {};
