import { tool } from '@langchain/core/tools';
import z from 'zod';
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from 'openai';
import { config } from '../../../config/environment.js';
import logger from '../../utils/logger.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });
const pinecone = new Pinecone({ apiKey: config.pinecone.apiKey });

const searchFunction = async ({ query, user, repo, date }) => {
    try {
        logger.info(`Searching GitHub commits for: "${query}"`);
        // Generate embedding for the search query
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: query,
        });
        // Build Pinecone filter
        const filter = { source: { $eq: "Github" } };
        // if (user) filter.author = { $eq: user };
        // if (repo) filter.repo = { $eq: repo };
        // if (date) filter.timestamp = { $eq: date };
        // Query Pinecone
        const index = pinecone.index(config.pinecone.indexName);
        const searchResponse = await index.query({
            vector: response.data[0].embedding,
            filter,
            topK: 5,
            includeMetadata: true
        });
        console.log("searchResponse", JSON.stringify(searchResponse));
        if (!searchResponse.matches || searchResponse.matches.length === 0) {
            return {
                success: true,
                message: "No relevant GitHub commits found."
            };
        }

        // Format results
        const commits = searchResponse.matches.map(match => ({
            id: match.id,
            message: match.metadata.message,
            date: match.metadata.timestamp,
            repo: match.metadata.repo,
            user: match.metadata.author,
            score: match.score
        })).sort((a, b) => b.score - a.score);
        const commitText = commits.map(commit =>
            `ID: ${commit.id}\nRepo: ${commit.repo}\nMessage: ${commit.message}\nUser: ${commit.user}\nDate: ${commit.date}`
        ).join('\n\n');
        return {
            success: true,
            message: `GitHub Search Results:\n\n${commitText}`
        };
    } catch (error) {
        logger.error('Error searching GitHub commits:', error);
        return {
            success: false,
            message: "Failed to search GitHub commits. Please try again."
        };
    }
};

export const githubSearchTool = tool(searchFunction, {
    name: 'github_search',
    description: 'Search through stored GitHub commits and activity to find relevant project information and commit details.',
    schema: z.object({
        query: z.string().describe('The search query for GitHub commits'),
        user: z.string().optional().describe('Optional filter for GitHub username'),
        repo: z.string().optional().describe('Optional filter for repository name'),
        date: z.string().optional().describe('Optional filter for commit date')
    })
});

export default githubSearchTool;
