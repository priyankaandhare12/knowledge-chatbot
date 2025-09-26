import { tool } from '@langchain/core/tools';
import { TavilySearch } from '@langchain/tavily';
import z from 'zod';
import { config } from '../../../config/environment.js';
import logger from '../../utils/logger.js';

/**
 * Web search tool function using Tavily API
 * @param {Object} params - Search parameters
 * @param {string} params.query - The search query
 * @param {number} params.maxResults - Maximum number of results to return
 * @param {string} params.searchDepth - Search depth (basic or advanced)
 * @returns {Promise<Object>} Search results from Tavily
 */
const webSearchFunction = async ({ query, maxResults = 5, searchDepth = 'advanced' }) => {
    try {
        logger.info(`Executing web search for query: "${query}"`);
        
        if (!config.tavily.apiKey) {
            throw new Error('Tavily API key is not configured. Please set TAVILY_API_KEY environment variable.');
        }

        // Initialize Tavily Search with the provided parameters
        const tavilySearch = new TavilySearch({
            maxResults,
            apiKey: config.tavily.apiKey,
            searchDepth,
        });

        // Perform the search using the call method (LangChain tool interface)
        const searchResults = await tavilySearch.call({ query });

        logger.info(`Web search completed. Found results for query: "${query}"`);
        
        return {
            success: true,
            query,
            results: searchResults,
            metadata: {
                maxResults,
                searchDepth,
                timestamp: new Date().toISOString(),
            },
        };
    } catch (error) {
        logger.error(error, `Web search failed for query: "${query}"`);
        
        return {
            success: false,
            error: error.message,
            query,
            metadata: {
                maxResults,
                searchDepth,
                timestamp: new Date().toISOString(),
            },
        };
    }
};

/**
 * Web Search Tool for LangChain
 * Uses Tavily API to search the web and return relevant results
 */
export const webSearchTool = tool(webSearchFunction, {
    name: 'webSearch',
    description: `Search the web for current information, news, facts, and answers to questions. 
    Use this tool when you need up-to-date information that might not be in your training data.
    Perfect for questions about current events, weather, stock prices, recent news, or any information that changes frequently.
    The tool returns relevant snippets from web pages that you can use to provide accurate, current answers.`,
    schema: z.object({
        query: z
            .string()
            .min(1)
            .describe('The search query to look up on the web. Be specific and include relevant keywords for better results.'),
        maxResults: z
            .number()
            .min(1)
            .max(10)
            .optional()
            .default(5)
            .describe('Maximum number of search results to return (1-10). Default is 5.'),
        searchDepth: z
            .enum(['basic', 'advanced'])
            .optional()
            .default('advanced')
            .describe('Search depth: "basic" for quick results or "advanced" for more comprehensive results. Default is "advanced".'),
    }),
});

/**
 * Standalone function to create a Tavily search instance
 * @param {Object} options - Configuration options
 * @returns {TavilySearch} Configured Tavily search instance
 */
export const createTavilySearch = (options = {}) => {
    const {
        maxResults = 5,
        searchDepth = 'advanced',
        apiKey = config.tavily.apiKey,
    } = options;

    if (!apiKey) {
        throw new Error('Tavily API key is required to create TavilySearch instance');
    }

    return new TavilySearch({
        maxResults,
        apiKey,
        searchDepth,
    });
};

/**
 * Simple web search function for direct usage
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export const performWebSearch = async (query, options = {}) => {
    const tavilySearch = createTavilySearch(options);
    
    try {
        const results = await tavilySearch.call({ query });
        return {
            success: true,
            query,
            results,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        logger.error(error, `Direct web search failed for query: "${query}"`);
        return {
            success: false,
            error: error.message,
            query,
            timestamp: new Date().toISOString(),
        };
    }
};

export default webSearchTool;
