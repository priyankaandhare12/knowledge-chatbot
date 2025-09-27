import { ChatOpenAI } from '@langchain/openai';
import { config } from '../../../config/environment.js';
import { getPrompt, Prompts } from '../../prompts/index.js';
import { webSearchTool } from '../../tools/web-search/WebSearchTool.js';
import logger from '../../utils/logger.js';

// Initialize tools
const tools = [webSearchTool];

// Lazy initialization of LLM
let llm = null;

function initializeLLM() {
    if (!llm) {
        llm = new ChatOpenAI({
            model: 'gpt-4',
            temperature: 0.1,
            apiKey: config.openai.apiKey,
            maxTokens: 1000,
            configuration: {
                projectId: config.openai.projectId,
            },
        }).bindTools(tools);
    }
    return llm;
}

/**
 * Web Search Node for processing general knowledge queries
 * @param {Object} state - The current state
 * @returns {Promise<Object>} Updated state with web search response
 */
export const webSearchNode = async (state) => {
    try {
        logger.info('Executing web search node');
        
        const llmInstance = initializeLLM();
        
        // Get response from LLM with web search tool
        const response = await llmInstance.invoke([
            new SystemMessage(getPrompt(Prompts.UNIVERSAL_KNOWLEDGE)),
            ...state.messages,
        ]);

        return {
            messages: response,
            nodeType: 'webSearch',
        };
    } catch (error) {
        logger.error(error, 'Error in web search node:');
        throw error;
    }
};

export default webSearchNode;
