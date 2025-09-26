import express from 'express';
import { chat } from '../../app/controllers/chat-controller.js';
import { ssoLogin } from '../../app/controllers/auth-controller.js';
import { auth } from '../../app/middleware/auth.js';
import { asyncHandler } from '../../app/middleware/validation.js';
import { chatValidation } from '../../app/validators/chat-validation.js';
import { config } from '../../config/environment.js';

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
router.post('/auth/sso', ssoLogin);

// Protected routes - require authentication
router.use(auth);

// ChatBot Route 
router.post('/chat', chatValidation, chat);

export default router;
