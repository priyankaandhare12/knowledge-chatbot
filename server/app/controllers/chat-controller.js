import { asyncHandler } from '../middleware/validation.js';
import { v4 as uuidv4 } from 'uuid';
import { compiledWorkflow } from '../workflows/workflow.js';
import logger from '../utils/logger.js';

/**
 * Main chat endpoint that uses the universal knowledge workflow
 */
export const chat = asyncHandler(async (req, res) => {
    const { message, conversationId } = req.body;

    // Validate required fields
    if (!message) {
        return res.status(400).json({
            success: false,
            error: 'Message is required',
        });
    }

    try {
        // Generate conversation ID if not provided
        const chatConversationId = conversationId || uuidv4();

        // Invoke the universal workflow
        const result = await compiledWorkflow.invoke(
            {
                userQuery: message,
                conversationID: chatConversationId,
            },
        );

        logger.debug(result, 'Workflow result:');

        // Format the response
        const response = {
            success: true,
            data: {
                message: result.finalResponse,
                metadata: {
                    conversationId: chatConversationId,
                    timestamp: new Date().toISOString(),
                },
                user: {
                    id: req.user?.id || 'anonymous',
                },
            },
        };

        // Add tool usage information if available
        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage?.tool_calls?.length) {
            response.data.toolsUsed = lastMessage.tool_calls.map(tool => tool.name);
        }

        res.json(response);
    } catch (error) {
        logger.error(error, 'Error in chat:');
        res.status(500).json({
            success: false,
            error: 'Failed to generate response',
            message: 'An error occurred while processing your request',
        });
    }
});