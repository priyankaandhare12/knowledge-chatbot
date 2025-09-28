import { asyncHandler } from '../middleware/validation.js';
import logger from '../utils/logger.js';
import { storeSlackMessage } from '../services/slack-vector.service.js';

/**
 * Handle incoming webhook messages
 */
export const handleWebhookMessage = asyncHandler(async (req, res) => {
    try {
        const { Data } = req.body;

        // Debug log the entire request body
        logger.info('Received webhook request:', {
            body: req.body,
            data: Data
        });

        // Validate required fields
        if (!Data || !Data.text) {
            logger.warn('Missing required fields:', {
                received: Data
            });
            return res.status(400).json({
                success: false,
                error: 'Required fields missing',
                details: {
                    required: ['text'],
                    received: Data ? Object.keys(Data) : 'no Data object'
                }
            });
        }

        // Store message in vector DB
        try {
            const result = await storeSlackMessage({
                text: Data.text,
                user: Data.user || 'anonymous',
                timestamp: Date.now().toString()
            });

            logger.info('Successfully processed webhook message', result);

            return res.json({
                success: true,
                data: result
            });
        } catch (storeError) {
            logger.error('Error in storeSlackMessage:', {
                error: storeError.message,
                stack: storeError.stack,
                data: Data
            });
            throw storeError;
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