import pino from 'pino';
import { config } from '../../config/environment.js';
import { pinoHttp } from 'pino-http';

const isProduction = config.nodeEnv === 'production';
const isLocal = config.nodeEnv === 'local';

const logger = pino({
    base: null,
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    timestamp: false,
    transport: isLocal
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  ignore: 'pid,hostname,time',
                  translateTime: 'SYS:standard',
              },
          }
        : undefined,
});

const httpLogger = pinoHttp({
    logger,
    // Skip logging for health checks and static assets
    autoLogging: {
        ignore: (req) => {
            return req.url === '/api/health' || req.url.startsWith('/docs/') || req.url.match(/\.(css|js|png|jpg|ico)$/);
        },
    },
    // Minimal serialization for performance
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            id: req.id,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
});

export { httpLogger, logger };
export default logger;
