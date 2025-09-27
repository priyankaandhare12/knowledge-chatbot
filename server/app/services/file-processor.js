import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { config } from '../../config/environment.js';
import logger from '../utils/logger.js';
import pdf from 'pdf-parse/lib/pdf-parse.js';

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey,
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.openai.apiKey,
});

export async function processPDFDocument(buffer, metadata) {
    try {
        logger.info(`Starting to process PDF: ${metadata.fileName}`);

        // 1. Extract text from PDF using pdf-parse
        const data = await pdf(buffer);
        const text = data.text;
        
        logger.info(`PDF text extracted successfully. Length: ${text.length}`);

        // 2. Split text into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const chunks = await textSplitter.splitText(text);
        
        logger.info(`Text split into ${chunks.length} chunks`);

        // 3. Generate embeddings and prepare vectors
        const vectors = await Promise.all(
            chunks.map(async (chunk, i) => {
                const embedding = await embeddings.embedQuery(chunk);
                return {
                    id: `${metadata.fileId}-chunk-${i}`,
                    values: embedding,
                    metadata: {
                        ...metadata,
                        chunk,
                        chunkIndex: i,
                        pageNumber: data.numpages,
                    },
                };
            })
        );
        
        logger.info(`Generated ${vectors.length} embeddings`);

        // 4. Store in Pinecone
        const index = pinecone.index(config.pinecone.indexName);
        
        // Store in batches of 100
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch);
            logger.debug(`Uploaded batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(vectors.length/batchSize)}`);
        }
        
        logger.info(`Successfully stored all vectors in Pinecone`);
        
        return {
            chunks: vectors.length,
            pages: data.numpages,
            text: text,
        };
    } catch (error) {
        logger.error(error, 'Error processing PDF:');
        throw error;
    }
}