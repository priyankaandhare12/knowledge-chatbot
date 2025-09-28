import { documentQATool } from './document-qa/DocumentQATool.js';
import { weatherTool } from './weather/WeatherTool.js';
import slackSearchTool from './slack/SlackSearchTool.js';

// Add all tools here
export const tools = [
    documentQATool,
    weatherTool,
    slackSearchTool,
];

// Helper to get tool by name
export const getToolByName = (name) => {
    return tools.find((tool) => tool.name === name);
};

// Export tool names for easy reference
export const TOOL_NAMES = {
    DOCUMENT_QA: 'documentQA',
    WEATHER: 'weatherLookup',
    SLACK_SEARCH: 'slack_search',
};