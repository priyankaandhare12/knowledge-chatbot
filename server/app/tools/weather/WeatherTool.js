import { tool } from '@langchain/core/tools';
import z from 'zod';
import weatherApi from '../../utils/api-clients/weather-api.js';
import logger from '../../utils/logger.js';

/**
 * Weather tool function using OpenWeatherMap API
 * @param {Object} params - Weather parameters
 * @param {string} params.city - The city to get weather for
 * @returns {Promise<Object>} Weather data
 */
const weatherFunction = async ({ city }) => {
    try {
        logger.info(`Getting weather for city: "${city}"`);

        // Validate city first
        const isValidCity = await weatherApi.validateCity(city);
        if (!isValidCity) {
            return {
                success: false,
                error: `Could not find weather data for "${city}". Please check the city name.`,
                city,
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            };
        }

        // Get weather data
        const result = await weatherApi.getCurrentWeather(city);
        
        logger.info(`Weather data retrieved for city: "${city}"`);
        
        return {
            success: true,
            city,
            weather: result.data,
            metadata: {
                timestamp: new Date().toISOString(),
            },
        };
    } catch (error) {
        logger.error(error, `Weather lookup failed for city: "${city}"`);
        
        return {
            success: false,
            error: error.message,
            city,
            metadata: {
                timestamp: new Date().toISOString(),
            },
        };
    }
};

/**
 * Weather Tool for LangChain
 * Uses OpenWeatherMap API to get current weather data
 */
export const weatherTool = tool(weatherFunction, {
    name: 'weatherLookup',
    description: `Get current weather information for any city in the world.
    Use this tool when users ask about current weather conditions, temperature, humidity, or wind speed.
    The tool returns formatted weather data including temperature, conditions, and other meteorological information.`,
    schema: z.object({
        city: z
            .string()
            .min(1)
            .describe('The name of the city to get weather for (e.g., "London", "New York", "Tokyo")'),
    }),
});

export default weatherTool;
