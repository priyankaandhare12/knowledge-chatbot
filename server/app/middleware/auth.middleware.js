import jwt from 'jsonwebtoken';
import { config } from '../../config/environment.js';

// Custom error for authentication failures
export class AuthenticationError extends Error {
    constructor(message, statusCode = 401) {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = statusCode;
    }
}

// Custom error for domain restrictions
export class DomainNotAllowedError extends Error {
    constructor(message, statusCode = 403) {
        super(message);
        this.name = 'DomainNotAllowedError';
        this.statusCode = statusCode;
    }
}

// Generate JWT token for authenticated user
export const generateJwtToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
    };

    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: 'universal-knowledge-chatbot',
        subject: user.id,
    });
};

// Verify JWT token
export const verifyJwtToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        throw new AuthenticationError('Invalid or expired token');
    }
};

// Middleware to check authentication
export const requireAuth = (req, res, next) => {
    try {
        // Check for JWT token in Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyJwtToken(token);
            req.user = decoded;
            return next();
        }

        // Check for session
        if (req.session && req.session.user) {
            req.user = req.session.user;
            return next();
        }

        throw new AuthenticationError('Authentication required');
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
    }
};

// Middleware to check if user is authenticated (optional)
export const optionalAuth = (req, res, next) => {
    try {
        // Check for JWT token in Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyJwtToken(token);
            req.user = decoded;
        } else if (req.session && req.session.user) {
            req.user = req.session.user;
        }
        // Continue regardless of auth status
        next();
    } catch (error) {
        // Continue without user if token is invalid
        next();
    }
};
