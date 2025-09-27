import { config, validateEnvironment } from './config/environment.js';
import express from 'express';
import { setupMiddleware } from './app/middleware/index.js';
import { errorHandler, notFoundHandler } from './app/middleware/error-handler.js';
import routes from './routes/index.js';
import pino from 'pino';

const logger = pino();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    const finalLogger = pino.final(logger);
    finalLogger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    const finalLogger = pino.final(logger);
    finalLogger.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    pino.final(logger, (err, finalLogger) => {
        if (err) finalLogger.error(err, 'Shutdown error');
        finalLogger.info('Application shutdown complete');
        process.exit(0);
    });
});

const app = express();

try {
    validateEnvironment();
} catch (error) {
    logger.error(error, 'Environment validation failed:');
    process.exit(1);
}

setupMiddleware(app);

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
    console.info('================================================');
    console.info('🚀 Knowledge Chat AI Server Started!');
    console.info('================================================');
    console.info(`📡 Server running on: http://localhost:${config.port}`);
    console.info(`🌍 Environment: ${config.nodeEnv}`);
    console.info(`⏰ Started at: ${new Date().toISOString()}`);
    console.info('================================================');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${config.port} is already in use. Please stop the other process or use a different port.`);
        logger.error(`💡 Try: lsof -ti:${config.port} | xargs kill -9`);
        process.exit(1);
    } else {
        logger.error({ err: error }, 'Server error');
        process.exit(1);
    }
});
