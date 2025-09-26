import { asyncHandler } from '../middleware/validation.js';
import jwt from 'jsonwebtoken';
import { config } from '../../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Placeholder SSO login endpoint
 * TODO: Replace with actual SSO implementation
 */
export const ssoLogin = asyncHandler(async (req, res) => {
    try {
        // For now, generate a token for any request
        // This will be replaced with actual SSO validation later
        const token = jwt.sign(
            {
                id: 'placeholder-user-id',
                email: 'placeholder@example.com',
                // Add any other user info that will come from SSO
            },
            config.jwt.secret || 'placeholder-secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: 'placeholder-user-id',
                    email: 'placeholder@example.com',
                },
            },
            message: 'SSO Login successful (placeholder implementation)',
        });
    } catch (error) {
        logger.error(error, 'Error in ssoLogin:');
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            message: 'An error occurred during authentication',
        });
    }
});
