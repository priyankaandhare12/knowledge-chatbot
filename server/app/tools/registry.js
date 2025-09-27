import { documentQATool } from './document-qa/DocumentQATool.js';
import { weatherTool } from './weather/WeatherTool.js';

// Add all tools here
export const tools = [
    documentQATool,
    weatherTool,
];

// Helper to get tool by name
export const getToolByName = (name) => {
    return tools.find((tool) => tool.name === name);
};

// Export tool names for easy reference
export const TOOL_NAMES = {
    DOCUMENT_QA: 'documentQA',
    WEATHER: 'weatherLookup',
};