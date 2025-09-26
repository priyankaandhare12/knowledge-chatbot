import { webSearchTool } from './web-search/WebSearchTool.js';

// Add all tools here
export const tools = [
    webSearchTool,
    // Add more tools as needed
];

// Helper to get tool by name
export const getToolByName = (name) => {
    return tools.find((tool) => tool.name === name);
};

// Export tool names for easy reference
export const TOOL_NAMES = {
    WEB_SEARCH: 'webSearch',
};