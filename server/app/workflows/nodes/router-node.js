import { ChatOpenAI } from '@langchain/openai';
import { config } from '../../../config/environment.js';
import logger from '../../utils/logger.js';

// Weather-related keywords for intent detection
const WEATHER_KEYWORDS = [
    'weather',
    'temperature',
    'forecast',
    'rain',
    'sunny',
    'cloudy',
    'humidity',
    'wind',
    'hot',
    'cold',
];

/**
 * Basic intent detection for weather queries
 * @param {string} query - User query
 * @returns {boolean} True if query is weather-related
 */
const isWeatherQuery = (query) => {
    const lowerQuery = query.toLowerCase();
    return WEATHER_KEYWORDS.some(keyword => lowerQuery.includes(keyword));
};

/**
 * Router node for directing queries to appropriate nodes
 * @param {Object} state - Current state
 * @returns {Promise<Object>} Updated state with routing decision
 */
export const routerNode = async (state) => {
    try {
        const query = state.userQuery;
        const fileId = state.fileId;
        
        logger.info(`Router analyzing query: "${query}", fileId: ${fileId || 'none'}`);

        // Check if it's a document query (has fileId)
        if (fileId) {
            logger.info(`Routing to document node for fileId: ${fileId}`);
            return {
                selectedNode: 'documentNode',
                routingMetadata: {
                    timestamp: new Date().toISOString(),
                    reason: 'Document query with fileId',
                },
            };
        }

        // Check if it's a weather query
        if (isWeatherQuery(query)) {
            logger.info('Routing to weather node');
            return {
                selectedNode: 'weatherNode',
                routingMetadata: {
                    timestamp: new Date().toISOString(),
                    reason: 'Weather-related query detected',
                },
            };
        }

        // Query is not supported
        logger.info('Query not supported by available nodes');
        return {
            selectedNode: 'none',
            routingMetadata: {
                timestamp: new Date().toISOString(),
                reason: 'Query not supported',
                message: 'I can only help with weather queries or questions about uploaded documents.',
            },
        };
    } catch (error) {
        logger.error(error, 'Error in router node:');
        throw error;
    }
};

export default routerNode;