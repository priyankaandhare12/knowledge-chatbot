import { asyncHandler } from '../middleware/validation.js';
import { v4 as uuidv4 } from 'uuid';
import { invokeAgent } from '../agents/universal-agent.js';
import logger from '../utils/logger.js';

/**
 * Main chat endpoint that handles both web search and document queries
 */
export const chat = asyncHandler(async (req, res) => {
    // Handle missing or null req.body
    if (!req.body) {
        return res.status(400).json({
            success: false,
            error: 'Request body is required',
        });
    }

    const { message, conversationId, fileId } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Message is required',
        });
    }

    try {
        // Generate conversation ID if not provided
        const chatConversationId = conversationId || uuidv4();

        // Log the query type
        logger.info(fileId ? `Processing document query for fileId: ${fileId}` : 'Processing web search query');

        // Invoke the universal agent
        const result = await invokeAgent({
            userQuery: message,
            conversationID: chatConversationId,
            fileId,
        });

        // Format the response
        const response = {
            success: true,
            data: {
                message: result.finalResponse,
                metadata: {
                    conversationId: result.conversationId,
                    timestamp: new Date().toISOString(),
                    fileId: fileId || null,
                },
                user: {
                    id: req.user?.id || 'anonymous',
                },
            },
        };

        // Add tool usage information if available
        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage?.tool_calls?.length) {
            response.data.toolsUsed = lastMessage.tool_calls.map((tool) => tool.name);
        }

        res.json(response);
    } catch (error) {
        logger.error(error, 'Error in chat:');
        res.status(500).json({
            success: false,
            error: 'Failed to generate response',
            message: error.message,
        });
    }
});