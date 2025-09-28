// Server factory for integration testing
import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

/**
 * Create a test server instance with configurable middleware and routes
 * @param {Object} options - Server configuration options
 * @returns {Object} - Express app and test utilities
 */
export const createTestServer = (options = {}) => {
    const {
        includeAuth = false,
        includeErrorHandler = true,
        includeLogging = false,
        customMiddleware = [],
        customRoutes = [],
        mockServices = true,
    } = options;

    const app = express();

    // Basic middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Mock services if requested
    if (mockServices) {
        // Mock external service dependencies
        app.locals.mockServices = {
            auth0: {
                getUser: jest.fn(),
                updateUser: jest.fn(),
            },
            openai: {
                createCompletion: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Mock response' } }],
                }),
            },
            pinecone: {
                query: jest.fn().mockResolvedValue({ matches: [] }),
                upsert: jest.fn().mockResolvedValue({}),
            },
        };
    }

    // Add custom middleware before routes
    customMiddleware.forEach((middleware) => {
        app.use(middleware);
    });

    // Authentication middleware (if requested)
    if (includeAuth) {
        app.use('/api/protected', (req, res, next) => {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'No token provided',
                    authenticated: false,
                });
            }

            try {
                // Mock JWT verification for testing
                if (token.startsWith('mock.')) {
                    const payloadBase64 = token.split('.')[1];
                    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
                    req.user = payload;
                    return next();
                }

                // If not a mock token, reject
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token',
                    authenticated: false,
                });
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    error: 'Token verification failed',
                    authenticated: false,
                });
            }
        });
    }

    // Health check route (always available)
    app.get('/health', (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'test',
        });
    });

    // Test routes
    app.get('/api/test/echo', (req, res) => {
        res.json({
            success: true,
            data: {
                query: req.query,
                headers: req.headers,
                timestamp: new Date().toISOString(),
            },
        });
    });

    app.post('/api/test/echo', (req, res) => {
        res.json({
            success: true,
            data: {
                body: req.body,
                headers: req.headers,
                timestamp: new Date().toISOString(),
            },
        });
    });

    // Protected test route (if auth is enabled)
    if (includeAuth) {
        app.get('/api/protected/user', (req, res) => {
            res.json({
                success: true,
                user: req.user,
                authenticated: true,
            });
        });
    }

    // Add custom routes
    customRoutes.forEach(({ method, path, handler }) => {
        app[method.toLowerCase()](path, handler);
    });

    // Error handling middleware (if requested)
    if (includeErrorHandler) {
        app.use((err, req, res, next) => {
            console.error('Test server error:', err);

            const isDevelopment = process.env.NODE_ENV === 'development';
            const errorResponse = {
                success: false,
                error: err.message || 'Internal Server Error',
                timestamp: new Date().toISOString(),
            };

            if (isDevelopment) {
                errorResponse.stack = err.stack;
                errorResponse.details = err;
            }

            res.status(err.status || 500).json(errorResponse);
        });

        // 404 handler
        app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
                timestamp: new Date().toISOString(),
            });
        });
    }

    return {
        app,
        request: request(app),

        /**
         * Create a supertest request with authentication
         * @param {Object} userPayload - User payload for JWT
         * @returns {Object} - Supertest request with auth headers
         */
        authenticatedRequest: (userPayload = {}) => {
            const token = global.testUtils.createMockJWT(userPayload);
            return request(app).set('Authorization', `Bearer ${token}`);
        },

        /**
         * Add a route to the test server
         * @param {string} method - HTTP method
         * @param {string} path - Route path
         * @param {Function} handler - Route handler
         */
        addRoute: (method, path, handler) => {
            app[method.toLowerCase()](path, handler);
        },

        /**
         * Add middleware to the test server
         * @param {Function} middleware - Middleware function
         */
        addMiddleware: (middleware) => {
            app.use(middleware);
        },

        /**
         * Reset mock services
         */
        resetMocks: () => {
            if (app.locals.mockServices) {
                Object.values(app.locals.mockServices).forEach((service) => {
                    Object.values(service).forEach((method) => {
                        if (jest.isMockFunction(method)) {
                            method.mockClear();
                        }
                    });
                });
            }
        },

        /**
         * Get mock service
         * @param {string} serviceName - Name of the service
         * @returns {Object} - Mock service
         */
        getMockService: (serviceName) => {
            return app.locals.mockServices?.[serviceName];
        },
    };
};

/**
 * Common test server configurations
 */
export const testServerConfigs = {
    /**
     * Minimal server for basic testing
     */
    minimal: () =>
        createTestServer({
            includeAuth: false,
            includeErrorHandler: true,
            includeLogging: false,
        }),

    /**
     * Full server with authentication
     */
    withAuth: () =>
        createTestServer({
            includeAuth: true,
            includeErrorHandler: true,
            includeLogging: false,
        }),

    /**
     * Server for API integration testing
     */
    apiIntegration: () =>
        createTestServer({
            includeAuth: true,
            includeErrorHandler: true,
            includeLogging: true,
            mockServices: true,
        }),

    /**
     * Server for middleware testing
     */
    middlewareTest: () =>
        createTestServer({
            includeAuth: false,
            includeErrorHandler: false,
            includeLogging: false,
            mockServices: false,
        }),
};

export default {
    createTestServer,
    testServerConfigs,
};
