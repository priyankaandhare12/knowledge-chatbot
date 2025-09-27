import { ChatOpenAI } from '@langchain/openai';
import { config } from '../../../config/environment.js';
import { getPrompt, Prompts } from '../../prompts/index.js';
import { weatherTool } from '../../tools/weather/WeatherTool.js';
import logger from '../../utils/logger.js';

// Initialize tools
const tools = [weatherTool];

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
 * Weather Node for processing weather-related queries
 * @param {Object} state - The current state
 * @returns {Promise<Object>} Updated state with weather response
 */
export const weatherNode = async (state) => {
    try {
        logger.info('Executing weather node');
        
        const llmInstance = initializeLLM();
        
        // Get response from LLM with weather tool
        const response = await llmInstance.invoke([
            new SystemMessage(getPrompt(Prompts.UNIVERSAL_KNOWLEDGE)),
            ...state.messages,
        ]);

        return {
            messages: response,
            nodeType: 'weather',
        };
    } catch (error) {
        logger.error(error, 'Error in weather node:');
        throw error;
    }
};

export default weatherNode;
