import { tool } from '@langchain/core/tools';
import z from 'zod';
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from 'openai';
import { config } from '../../../config/environment.js';
import logger from '../../utils/logger.js';

const openai = new OpenAI({
    apiKey: config.openai.apiKey
});

const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey
});

const searchFunction = async ({ query, issueKey, issueType, status, assignee }) => {
    try {
        logger.info(`Searching Jira issues for: "${query}"`);
        // Generate embedding for the search query
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: query,
        });
        // Build Pinecone filter
        const filter = { source: { $eq: "Jira" } };
        // if (issueKey) filter.issueKey = { $eq: issueKey };
        // if (issueType) filter.issueType = { $eq: issueType };
        // if (status) filter.status = { $eq: status };
        // if (assignee) filter.user = { $eq: assignee };
        // Query Pinecone
        const index = pinecone.index(config.pinecone.indexName);
        const searchResponse = await index.query({
            vector: response.data[0].embedding,
            filter,
            topK: 5,
            includeMetadata: true
        });

        if (!searchResponse.matches || searchResponse.matches.length === 0) {
            return {
                success: true,
                message: "No relevant Jira issues found."
            };
        }

        // Format results
        const issues = searchResponse.matches.map(match => ({
            epic: match.metadata.Epic,
            title: match.metadata['Ticket Title'],
            description: match.metadata['Ticket Description'],
            issueType: match.metadata['Ticket Type'],
            status: match.metadata.Status,
            assignee: match.metadata.Assignee,
            priority: match.metadata.Priority,
            project: match.metadata['Project Name'],
            timestamp: match.metadata['Created At'],
            creator: match.metadata.Creator,
            score: match.score
        })).sort((a, b) => b.score - a.score);
       const issueText = issues.map(issue =>
    `Epic: ${issue.epic}\nTitle: ${issue.title}\nDescription: ${issue.description}\nType: ${issue.issueType}\nStatus: ${issue.status}\nAssignee: ${issue.assignee}\nPriority: ${issue.priority}\nProject: ${issue.project}\nTimestamp: ${issue.timestamp}\nCreator: ${issue.creator}`
).join('\n\n');
        return {
            success: true,
            message: `Jira Search Results:\n\n${issueText}`
        };
    } catch (error) {
        logger.error('Error searching Jira issues:', error);
        return {
            success: false,
            message: "Failed to search Jira issues. Please try again."
        };
    }
};

export const jiraSearchTool = tool(searchFunction, {
    name: 'jira_search',
    description: 'Search through stored Jira issues and comments to find relevant project information and issue details.',
    schema: z.object({
        query: z.string().describe('The search query for Jira issues'),
        issueKey: z.string().optional().describe('Optional filter for specific Jira issue key'),
        issueType: z.string().optional().describe('Optional filter for issue type'),
        status: z.string().optional().describe('Optional filter for issue status'),
        assignee: z.string().optional().describe('Optional filter for assignee')
    })
});

export default jiraSearchTool;
