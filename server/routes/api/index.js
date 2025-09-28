import express from 'express';
import { chat } from '../../app/controllers/chat-controller.js';
import { requireAuth } from '../../app/middleware/auth.middleware.js';
import { ssoLogin } from '../../app/controllers/auth-controller.js';
import { uploadFile } from '../../app/controllers/upload-controller.js';
import { listFiles, getFileById, deleteFile } from '../../app/controllers/file-controller.js';
import { auth } from '../../app/middleware/auth.js';
import upload from '../../app/middleware/upload.js';
import { asyncHandler } from '../../app/middleware/validation.js';
import { chatValidation } from '../../app/validators/chat-validation.js';
import { config } from '../../config/environment.js';
import authRoutes from './auth.js';
import { handleWebhookMessage } from '../../app/controllers/webhook-controller.js';
import { validateApiKey } from '../../app/middleware/api-key-auth.js';

const router = express.Router();

// Public routes
// Health check endpoint
router.get(
    '/health',
    asyncHandler(async (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            environment: config.nodeEnv,
        });
    }),
);

// Authentication routes (public)
router.use('/auth', authRoutes);

// webhook endpoint (protected by API key)
router.post('/external/webhook', validateApiKey, handleWebhookMessage);

// Protected routes - require authentication
router.use(requireAuth);

// ChatBot Routes
router.post('/chat', chatValidation, chat);

// File Management Routes
router.post('/upload', uploadFile);
router.get('/files', listFiles);
router.get('/files/:fileId', getFileById);
router.delete('/files/:fileId', deleteFile);

export default router;