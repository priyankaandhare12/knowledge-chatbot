import { documentQATool } from './document-qa/DocumentQATool.js';
import { weatherTool } from './weather/WeatherTool.js';
import slackSearchTool from './slack/SlackSearchTool.js';
import jiraSearchTool from './jira/JiraSearchTool.js';
import githubSearchTool from './github/GitHubSearchTool.js';

// Add all tools here
export const tools = [
    documentQATool,
    weatherTool,
    slackSearchTool,
    jiraSearchTool,
    githubSearchTool,
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
    JIRA_SEARCH: 'jira_search',
    GITHUB_SEARCH: 'github_search',
};