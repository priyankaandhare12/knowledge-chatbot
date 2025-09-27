import axios from 'axios';
import { config } from '../../../config/environment.js';
import logger from '../logger.js';

// Initialize axios instance for weather API
const weatherApi = axios.create({
    baseURL: config.weather.baseUrl,
    params: {
        appid: config.weather.apiKey,
        units: config.weather.units,
    },
});

/**
 * Format weather data into a consistent structure
 */
const formatWeatherData = (data) => ({
    temperature: {
        current: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        min: Math.round(data.main.temp_min),
        max: Math.round(data.main.temp_max),
    },
    condition: data.weather[0].main,
    description: data.weather[0].description,
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed),
    location: {
        name: data.name,
        country: data.sys.country,
    },
    timestamp: new Date(data.dt * 1000).toISOString(),
});

/**
 * Get current weather for a city
 * @param {string} city - City name (e.g., "London", "New York")
 * @returns {Promise<Object>} Formatted weather data
 */
export const getCurrentWeather = async (city) => {
    try {
        logger.info(`Fetching weather for city: ${city}`);
        
        const response = await weatherApi.get('/weather', {
            params: { q: city },
        });

        const formattedData = formatWeatherData(response.data);
        logger.info(`Weather data fetched successfully for ${city}`);
        
        return {
            success: true,
            data: formattedData,
        };
    } catch (error) {
        logger.error(error, `Error fetching weather for ${city}:`);
        
        // Handle specific API errors
        if (error.response?.data?.message) {
            throw new Error(`Weather API Error: ${error.response.data.message}`);
        }
        
        throw new Error('Failed to fetch weather data');
    }
};

/**
 * Validate if a city name exists and can be queried
 * @param {string} city - City name to validate
 * @returns {Promise<boolean>} Whether the city is valid
 */
export const validateCity = async (city) => {
    try {
        await weatherApi.get('/weather', {
            params: { q: city },
        });
        return true;
    } catch (error) {
        return false;
    }
};

export default {
    getCurrentWeather,
    validateCity,
};
