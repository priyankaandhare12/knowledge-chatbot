import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../../config/environment.js';
import { httpLogger } from '../utils/logger.js';

export const setupMiddleware = (app) => {
    // Trust proxy for Vercel/serverless deployments
    app.set('trust proxy', 1);

    app.use(helmet());

    app.use(
        cors({
            origin: config.frontend.url,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Impersonation-Token', 'X-Impersonation-Email'],
        }),
    );

    app.use(httpLogger);

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    // Session middleware for Auth0 state management
    app.use(
        session({
            secret: config.session.secret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: config.session.secure,
                httpOnly: true,
                maxAge: config.session.maxAge,
                domain: config.session.cookieDomain,
            },
        }),
    );

    const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes',
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Custom key generator for serverless/proxy environments
        keyGenerator: (req) => {
            // Use X-Forwarded-For header when available (Vercel provides this)
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                // Take the first IP from the list
                return forwarded.split(',')[0].trim();
            }
            // Fallback to connection remote address
            return req.connection.remoteAddress || req.ip;
        },
    });

    app.use('/api/', limiter);
};
