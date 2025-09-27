import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { PDFDocument } from 'pdf-lib';
import logger from '../utils/logger.js';
import { config } from '../../config/environment.js';

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey,
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.openai.apiKey,
});

/**
 * Process a PDF file and extract text
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
export const extractTextFromPDF = async (buffer) => {
    try {
        // Ensure buffer is valid
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Invalid buffer provided');
        }

        logger.debug(`Processing PDF buffer of size: ${buffer.length} bytes`);

        // Load the PDF document
        const pdfDoc = await PDFDocument.load(buffer, {
            ignoreEncryption: true,
            updateMetadata: false,
        });

        // Get all pages
        const pages = pdfDoc.getPages();
        logger.debug(`PDF has ${pages.length} pages`);

        // Extract text from each page
        let fullText = '';
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            // Get text content
            const textContent = await page.doc.getPage(i + 1).then(p => p.textContent());
            fullText += textContent + '\\n\\n';
            logger.debug(`Extracted text from page ${i + 1}`);
        }

        if (!fullText || fullText.trim().length === 0) {
            throw new Error('No text content found in PDF');
        }

        logger.debug(`Successfully extracted ${fullText.length} characters from PDF`);
        return fullText;
    } catch (error) {
        logger.error(error, 'Error extracting text from PDF:');
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};

/**
 * Split text into chunks
 * @param {string} text - Text to split
 * @returns {Promise<string[]>} Array of text chunks
 */
export const splitTextIntoChunks = async (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid text provided for chunking');
    }

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    return splitter.splitText(text);
};

/**
 * Store document chunks in Pinecone
 * @param {string[]} chunks - Array of text chunks
 * @param {Object} metadata - Document metadata
 * @returns {Promise<string>} File ID
 */
export const storeDocumentChunks = async (chunks, metadata) => {
    try {
        if (!Array.isArray(chunks) || chunks.length === 0) {
            throw new Error('No valid chunks provided');
        }

        logger.info(`Storing ${chunks.length} chunks for file ${metadata.fileId}`);
        
        const index = pinecone.index(config.pinecone.indexName);
        
        // Create embeddings for chunks
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
                    },
                };
            })
        );

        // Upsert vectors to Pinecone in batches of 100
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch);
            logger.debug(`Uploaded batch ${i / batchSize + 1} of ${Math.ceil(vectors.length / batchSize)}`);
        }
        
        logger.info(`Successfully stored ${vectors.length} vectors for file ${metadata.fileId}`);
        return metadata.fileId;
    } catch (error) {
        logger.error(error, 'Error storing document chunks:');
        throw new Error(`Failed to store document chunks: ${error.message}`);
    }
};

/**
 * Process and store a document
 * @param {Buffer} fileBuffer - File buffer
 * @param {Object} metadata - File metadata
 * @returns {Promise<string>} File ID
 */
export const processDocument = async (fileBuffer, metadata) => {
    try {
        // Validate input
        if (!fileBuffer || !metadata || !metadata.fileId) {
            throw new Error('Invalid input: fileBuffer and metadata with fileId are required');
        }

        logger.info(`Starting document processing for file: ${metadata.fileName || metadata.fileId}`);
        
        // Extract text from PDF
        const text = await extractTextFromPDF(fileBuffer);
        if (!text || text.trim().length === 0) {
            throw new Error('No text content extracted from PDF');
        }
        
        // Split text into chunks
        const chunks = await splitTextIntoChunks(text);
        if (chunks.length === 0) {
            throw new Error('No valid chunks generated from text');
        }
        
        // Store chunks in Pinecone
        const fileId = await storeDocumentChunks(chunks, {
            ...metadata,
            chunkCount: chunks.length,
            processedAt: new Date().toISOString(),
        });
        
        logger.info(`Document processing completed successfully for file: ${fileId}`);
        return fileId;
    } catch (error) {
        logger.error(error, 'Error processing document:');
        throw error;
    }
};