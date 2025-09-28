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

const searchFunction = async ({ query }) => {
    try {
        logger.info(`Searching knowledge-chatbot discussions for: "${query}"`);

        // Generate embedding for the search query
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: query,
        });
        
        // Search Pinecone with basic filters
        const index = pinecone.index(config.pinecone.indexName);
        const searchResponse = await index.query({
            vector: response.data[0].embedding,
            filter: {
                source: { $eq: "slack" },
                // channel: { $eq: "knowledge-chatbot" }
            },
            topK: 15,
            includeMetadata: true
        });
        // console.log("searchResponse", JSON.stringify(searchResponse));
        // No results found
        if (searchResponse.matches.length === 0) {
            return {
                success: true,
                message: "No relevant discussions found in the knowledge-chatbot channel."
            };
        }

        // Format results
        const messages = searchResponse.matches
            .map(match => ({
                text: match.metadata.text,
                user: match.metadata.user,
                score: match.score
            }))
            .sort((a, b) => b.score - a.score);

        // Format response
        const messageText = messages
            .map(msg => `${msg.user}: ${msg.text}`)
            .join('\n\n');

        return {
            success: true,
            message: `Based on discussions in the knowledge-chatbot channel:\n\n${messageText}`
        };

    } catch (error) {
        logger.error('Error searching knowledge-chatbot discussions:', error);
        return {
            success: false,
            message: "Failed to search knowledge-chatbot discussions. Please try again."
        };
    }
};

export const slackSearchTool = tool(searchFunction, {
    name: 'slack_search',
    description: 'Search through discussions in the knowledge-chatbot channel to find information about project features, implementations, and decisions.',
    schema: z.object({
        query: z.string().describe('The search query to find relevant project information')
    })
});

export default slackSearchTool;