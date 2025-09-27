import { tool } from '@langchain/core/tools';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import z from 'zod';
import { config } from '../../../config/environment.js';
import logger from '../../utils/logger.js';

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey,
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.openai.apiKey,
});

/**
 * Query document function using Pinecone
 */
const documentQAFunction = async ({ query, fileId, maxResults = 3 }) => {
    try {
        logger.info(`Querying document with fileId: ${fileId}`);

        // Initialize Pinecone store
        const index = pinecone.index(config.pinecone.indexName);
        const vectorStore = await PineconeStore.fromExistingIndex(
            embeddings,
            { pineconeIndex: index }
        );

        // Search for similar chunks
        const results = await vectorStore.similaritySearch(query, maxResults, {
            fileId,
        });

        logger.info(`Found ${results.length} relevant chunks for query`);

        return {
            success: true,
            query,
            results: results.map(doc => ({
                content: doc.pageContent,
                metadata: doc.metadata,
            })),
            metadata: {
                fileId,
                timestamp: new Date().toISOString(),
                resultCount: results.length,
            },
        };
    } catch (error) {
        logger.error(error, 'Error in documentQA:');
        return {
            success: false,
            error: error.message,
            query,
            metadata: {
                fileId,
                timestamp: new Date().toISOString(),
                resultCount: 0,
            },
        };
    }
};

/**
 * Document QA Tool for LangChain
 */
export const documentQATool = tool(documentQAFunction, {
    name: 'documentQA',
    description: `Search within uploaded documents to find relevant information.
    Use this tool when the user asks about specific documents or when fileId is provided.
    The tool searches through document chunks to find the most relevant information.`,
    schema: z.object({
        query: z
            .string()
            .min(1)
            .describe('The search query to find relevant information in the document'),
        fileId: z
            .string()
            .min(1)
            .describe('The ID of the file to search in'),
        maxResults: z
            .number()
            .min(1)
            .max(5)
            .optional()
            .default(3)
            .describe('Maximum number of chunks to return (1-5). Default is 3.'),
    }),
});

export default documentQATool;
