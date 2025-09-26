import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../../config/environment.js';
import { httpLogger } from '../utils/logger.js';

export const setupMiddleware = (app) => {
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

    const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    app.use('/api/', limiter);
};
