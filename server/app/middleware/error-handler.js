import { config } from '../../config/environment.js';
import createError from 'http-errors';
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
    logger.error(err, 'Error:');

    if (err.status) {
        return res.status(err.status).json({
            success: false,
            message: err.message,
            ...(config.nodeEnv === 'development' && { stack: err.stack }),
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            details: err.message,
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
        });
    }

    res.status(500).json({
        success: false,
        message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
    });
};

export const notFoundHandler = (req, res, next) => {
    next(createError(404, `Route ${req.originalUrl} not found`));
};
