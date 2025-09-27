import express from 'express';
import { chat } from '../../app/controllers/chat-controller.js';
import { requireAuth } from '../../app/middleware/auth.middleware.js';
import { asyncHandler } from '../../app/middleware/validation.js';
import { chatValidation } from '../../app/validators/chat-validation.js';
import { config } from '../../config/environment.js';
import authRoutes from './auth.js';

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

// Protected routes - require authentication
router.use(requireAuth);

// ChatBot Route 
router.post('/chat', chatValidation, chat);

export default router;
