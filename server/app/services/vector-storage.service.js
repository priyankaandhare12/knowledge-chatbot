import { Pinecone } from "@pinecone-database/pinecone";
import { config } from '../../config/environment.js';
import { OpenAI } from 'openai';
import logger from '../utils/logger.js';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: config.openai.apiKey
});

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey
});

/**
 * Store a message from any source in Pinecone
 * @param {Object} params
 * @param {string} params.text - Message content
 * @param {string} params.source - Source application (e.g., "slack", "jira")
 * @param {string} params.channel - Channel/board identifier
 * @param {Object} params.metadata - Additional source-specific metadata
 */
export async function storeMessage({ text, source, channel, metadata }) {
    try {
        const timestamp = Date.now().toString();
        // Generate embedding
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
        });
        const embedding = response.data[0].embedding;
        // Get Pinecone index
        const index = pinecone.index(config.pinecone.indexName);
        // Store in Pinecone
        const vectorId = `${source}-${channel}-${timestamp}`;
        await index.upsert([
            {
                id: vectorId,
                values: embedding,
                metadata: {
                    ...metadata
                }
            }
        ]);
        return {
            success: true,
            vectorId
        };
    } catch (error) {
        logger.error("Error in storeMessage:", error);
        throw error;
    }
}
