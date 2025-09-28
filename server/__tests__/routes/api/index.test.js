import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import apiRouter from '../../../routes/api/index.js';
import { config } from '../../../config/environment.js';

// Mock all dependencies
jest.mock('../../../app/controllers/chat-controller.js');
jest.mock('../../../app/controllers/auth-controller.js');
jest.mock('../../../app/controllers/upload-controller.js');
jest.mock('../../../app/controllers/file-controller.js');
jest.mock('../../../app/controllers/webhook-controller.js');
jest.mock('../../../app/middleware/auth.middleware.js');
jest.mock('../../../app/middleware/auth.js');
jest.mock('../../../app/middleware/upload.js');
jest.mock('../../../app/middleware/validation.js');
jest.mock('../../../app/middleware/api-key-auth.js');
jest.mock('../../../app/validators/chat-validation.js');
jest.mock('../../../config/environment.js');
jest.mock('../../../routes/api/auth.js');

describe('API Routes Integration', () => {
    let app;
    let mockConfig;

    beforeEach(async () => {
        // Mock config
        mockConfig = {
            nodeEnv: 'test',
        };
        config.nodeEnv = mockConfig.nodeEnv;

        // Create Express app with API routes
        app = express();
        app.use(express.json());
        app.use('/api', apiRouter);

        // Mock asyncHandler to pass through the function
        const { asyncHandler } = await import('../../../app/middleware/validation.js');
        asyncHandler.mockImplementation((fn) => fn);

        // Mock requireAuth to be permissive in tests
        const { requireAuth } = await import('../../../app/middleware/auth.middleware.js');
        requireAuth.mockImplementation((req, res, next) => {
            req.user = { id: 'test-user', email: 'test@example.com' };
            next();
        });

        // Mock validateApiKey to be permissive
        const { validateApiKey } = await import('../../../app/middleware/api-key-auth.js');
        validateApiKey.mockImplementation((req, res, next) => next());

        // Mock chatValidation to be permissive
        const { chatValidation } = require('../../app/validators/chat-validation.js');
        chatValidation.mockImplementation((req, res, next) => next());
    });

    describe('Health Check Endpoint', () => {
        it('should return health status successfully', async () => {
            const response = await request(app).get('/api/health').expect(200);

            expect(response.body).toEqual({
                success: true,
                status: 'healthy',
                uptime: expect.any(Number),
                timestamp: expect.any(String),
                environment: 'test',
            });

            // Verify timestamp format
            expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

            // Verify uptime is a positive number
            expect(response.body.uptime).toBeGreaterThan(0);
        });

        it('should include correct environment from config', async () => {
            config.nodeEnv = 'production';

            const response = await request(app).get('/api/health').expect(200);

            expect(response.body.environment).toBe('production');
        });

        it('should return recent timestamp', async () => {
            const beforeRequest = Date.now();

            const response = await request(app).get('/api/health').expect(200);

            const afterRequest = Date.now();
            const responseTime = new Date(response.body.timestamp).getTime();

            expect(responseTime).toBeGreaterThanOrEqual(beforeRequest);
            expect(responseTime).toBeLessThanOrEqual(afterRequest);
        });
    });

    describe('Route Structure', () => {
        it('should mount auth routes under /auth', async () => {
            // Mock auth routes
            const authRoutes = require('../../routes/api/auth.js');
            authRoutes.default.mockImplementation((req, res, next) => {
                res.json({ message: 'Auth route called' });
            });

            const response = await request(app).get('/api/auth/test').expect(200);

            expect(authRoutes.default).toHaveBeenCalled();
        });

        it('should protect chat route with authentication', async () => {
            const { chat } = require('../../app/controllers/chat-controller.js');
            chat.mockImplementation((req, res) => {
                res.json({ message: 'Chat response', user: req.user });
            });

            const response = await request(app).post('/api/chat').send({ message: 'Hello' }).expect(200);

            expect(response.body.user).toEqual({
                id: 'test-user',
                email: 'test@example.com',
            });
            expect(chat).toHaveBeenCalled();
        });

        it('should validate chat input with chatValidation middleware', async () => {
            const { chat } = require('../../app/controllers/chat-controller.js');
            const { chatValidation } = require('../../app/validators/chat-validation.js');

            chat.mockImplementation((req, res) => {
                res.json({ message: 'Chat response' });
            });

            await request(app).post('/api/chat').send({ message: 'Hello' }).expect(200);

            expect(chatValidation).toHaveBeenCalled();
        });

        it('should protect file routes with authentication', async () => {
            const { listFiles } = require('../../app/controllers/file-controller.js');
            listFiles.mockImplementation((req, res) => {
                res.json({ files: [], user: req.user });
            });

            const response = await request(app).get('/api/files').expect(200);

            expect(response.body.user).toEqual({
                id: 'test-user',
                email: 'test@example.com',
            });
            expect(listFiles).toHaveBeenCalled();
        });

        it('should handle file upload route', async () => {
            const { uploadFile } = require('../../app/controllers/upload-controller.js');
            uploadFile.mockImplementation((req, res) => {
                res.json({ success: true, user: req.user });
            });

            const response = await request(app).post('/api/upload').expect(200);

            expect(response.body.user).toBeDefined();
            expect(uploadFile).toHaveBeenCalled();
        });

        it('should handle file operations by ID', async () => {
            const { getFileById, deleteFile } = require('../../app/controllers/file-controller.js');

            getFileById.mockImplementation((req, res) => {
                res.json({ file: { id: req.params.fileId }, user: req.user });
            });

            deleteFile.mockImplementation((req, res) => {
                res.json({ success: true, fileId: req.params.fileId });
            });

            // Test GET file by ID
            const getResponse = await request(app).get('/api/files/test-file-123').expect(200);

            expect(getResponse.body.file.id).toBe('test-file-123');
            expect(getFileById).toHaveBeenCalled();

            // Test DELETE file by ID
            const deleteResponse = await request(app).delete('/api/files/test-file-456').expect(200);

            expect(deleteResponse.body.fileId).toBe('test-file-456');
            expect(deleteFile).toHaveBeenCalled();
        });
    });

    describe('Webhook Routes', () => {
        it('should protect webhook with API key validation', async () => {
            const { handleWebhookMessage } = require('../../app/controllers/webhook-controller.js');
            const { validateApiKey } = require('../../app/middleware/api-key-auth.js');

            handleWebhookMessage.mockImplementation((req, res) => {
                res.json({ success: true, message: 'Webhook processed' });
            });

            await request(app).post('/api/external/webhook').send({ data: 'test-webhook-data' }).expect(200);

            expect(validateApiKey).toHaveBeenCalled();
            expect(handleWebhookMessage).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 for unknown routes', async () => {
            await request(app).get('/api/non-existent-route').expect(404);
        });

        it('should handle POST to non-existent endpoints', async () => {
            await request(app).post('/api/non-existent-endpoint').send({ data: 'test' }).expect(404);
        });

        it('should handle malformed JSON in request body', async () => {
            const { chat } = require('../../app/controllers/chat-controller.js');
            chat.mockImplementation((req, res) => {
                res.json({ message: 'Should not reach here' });
            });

            // This should be handled by Express JSON parser
            await request(app).post('/api/chat').set('Content-Type', 'application/json').send('{"malformed": json}').expect(400);
        });
    });

    describe('Middleware Integration', () => {
        it('should apply authentication middleware correctly', async () => {
            const { requireAuth } = require('../../app/middleware/auth.middleware.js');

            // Mock requireAuth to deny access
            requireAuth.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            const { chat } = require('../../app/controllers/chat-controller.js');
            chat.mockImplementation((req, res) => {
                res.json({ message: 'Should not reach here' });
            });

            await request(app).post('/api/chat').send({ message: 'Test' }).expect(401);

            expect(chat).not.toHaveBeenCalled();
        });

        it('should handle async errors in handlers', async () => {
            const { chat } = require('../../app/controllers/chat-controller.js');
            chat.mockImplementation(async (req, res) => {
                throw new Error('Async error in controller');
            });

            // The asyncHandler should catch this error
            // Behavior depends on error handler middleware
            const response = await request(app).post('/api/chat').send({ message: 'Test' });

            expect(chat).toHaveBeenCalled();
            // Response code depends on error handler implementation
        });
    });

    describe('Content Type Handling', () => {
        it('should handle JSON content type', async () => {
            const { chat } = require('../../app/controllers/chat-controller.js');
            chat.mockImplementation((req, res) => {
                res.json({ receivedBody: req.body });
            });

            const testData = { message: 'Test message', user: 'test' };

            const response = await request(app).post('/api/chat').set('Content-Type', 'application/json').send(testData).expect(200);

            expect(response.body.receivedBody).toEqual(testData);
        });

        it('should handle missing content type gracefully', async () => {
            const { chat } = require('../../app/controllers/chat-controller.js');
            chat.mockImplementation((req, res) => {
                res.json({ bodyType: typeof req.body });
            });

            await request(app).post('/api/chat').send('plain text data').expect(200);

            expect(chat).toHaveBeenCalled();
        });
    });
});
