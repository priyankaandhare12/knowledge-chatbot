import jwt from 'jsonwebtoken';
import { config } from '../../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Placeholder authentication middleware
 * TODO: Replace with actual SSO validation
 */
export const auth = async (req, res, next) => {
    try {
        // For now, accept any valid JWT token
        // This will be replaced with actual SSO token validation
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            // For development, allow requests without token
            logger.warn('No token provided, allowing request (development only)');
            req.user = {
                id: 'anonymous',
                email: 'anonymous@example.com',
            };
            return next();
        }

        try {
            // Verify token (placeholder implementation)
            const decoded = jwt.verify(token, config.jwt.secret || 'placeholder-secret');
            req.user = decoded;
            next();
        } catch (error) {
            // For development, allow requests with invalid tokens
            logger.warn('Invalid token, allowing request (development only)');
            req.user = {
                id: 'anonymous',
                email: 'anonymous@example.com',
            };
            next();
        }
    } catch (error) {
        logger.error(error, 'Error in auth middleware:');
        next(error);
    }
};
