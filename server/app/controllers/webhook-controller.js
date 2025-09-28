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
                    source: 'slack',
                    text: Data.text
                }
            });
            logger.info('Successfully processed Slack webhook message', result);
            return res.json({
                success: true,
                data: result
            });
        } else if (Source && Source.toLowerCase() === 'jira') {
            // console.log("Jira webhook Data:", Data);
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
        } else if (Source && Source.toLowerCase() === 'github') {
            // New GitHub payload: Data.data = [ { user, commits: [ { message, date, repo } ] } ]
            const userCommitGroups = Array.isArray(Data.data) ? Data.data : [];
            const results = [];
            for (const userCommits of userCommitGroups) {
                const user = userCommits.user || 'unknown';
                for (const commit of userCommits.commits || []) {
                    const repoName = commit.repo || 'unknown-repo';
                    const commitText = `${commit.message} by ${user} on ${commit.date || ''} in ${repoName}`;
                    const metadata = {
                        repo: repoName,
                        message: commit.message,
                        author: user,
                        timestamp: commit.date || Date.now().toString(),
                        source: Source,
                    };
                    try {
                        const result = await storeMessage({
                            text: commitText,
                            source: Source,
                            channel: repoName,
                            metadata
                        });
                        results.push(result);
                    } catch (err) {
                        logger.error('Error storing GitHub commit:', err);
                    }
                }
            }
            logger.info('Processed GitHub webhook message', { stored: results.length });
            return res.json({
                success: true,
                stored: results.length,
                data: results
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
        // console.error('Error processing webhook:', error);
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