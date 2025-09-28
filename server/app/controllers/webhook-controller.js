import { asyncHandler } from '../middleware/validation.js';
import logger from '../utils/logger.js';
import { storeMessage } from '../services/vector-storage.service.js';

/**
 * Handle incoming webhook messages
 */
export const handleWebhookMessage = asyncHandler(async (req, res) => {
    try {
        const { Data, Source } = req.body;

        // Debug log the entire request body
        logger.info('Received webhook request:', {
            body: req.body,
            data: Data
        });

        // Validate required fields
        if (!Data) {
            logger.warn('Missing required fields:', {
                received: Data
            });
            return res.status(400).json({
                success: false,
                error: 'Data missing',
            });
        }

        // Store message in vector DB
        if (Source && Source.toLowerCase() === 'slack') {
            const result = await storeMessage({
                text: Data.text,
                source: 'slack',
                channel: 'knowledge-chatbot',
                metadata: {
                    user: Data.user || 'anonymous',
                    timestamp: Date.now().toString(),
                    source: Source,
                    text: Data.text
                }
            });
            logger.info('Successfully processed Slack webhook message', result);
            return res.json({
                success: true,
                data: result
            });
        } else if (Source && Source.toLowerCase() === 'jira') {
            const inputText = Object.values(Data).join(' ');
            const result = await storeMessage({
                text: inputText,
                source: 'Jira',
                channel: Data['Project Name'],
                metadata: {
                    timestamp: Data['Created At'],
                    user: Data['Creator'],
                    source: Source,
                    ...Data
                }
            });
            logger.info('Successfully processed Jira webhook message', result);
            return res.json({
                success: true,
                data: result
            });
        } else {
            logger.warn('Unknown webhook source:', Source);
            return res.status(400).json({
                success: false,
                error: 'Unknown webhook source',
                source: Source
            });
        }

    } catch (error) {
        logger.error('Error processing webhook:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            error: 'Failed to process webhook',
            message: error.message,
            details: error.stack
        });
    }
});