import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import logger from './app/utils/logger.js';

try {
    const sdk = new NodeSDK({
        spanProcessors: [new LangfuseSpanProcessor()],
    });

    sdk.start();
    logger.info('OpenTelemetry SDK started with Langfuse processor');
} catch (error) {
    logger.warn(error.message, 'Failed to initialize OpenTelemetry/Langfuse tracing:');
}
