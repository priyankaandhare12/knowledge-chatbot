import { asyncHandler } from '../middleware/validation.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../../config/environment.js';
import logger from '../utils/logger.js';

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey,
});

/**
 * List uploaded files
 */
export const listFiles = asyncHandler(async (req, res) => {
    try {
        const index = pinecone.index(config.pinecone.indexName);
        
        // Query metadata to get unique fileIds
        const queryResponse = await index.query({
            topK: 1,
            filter: {},
            includeMetadata: true,
        });

        // Extract unique files from metadata
        const files = queryResponse.matches
            .filter(match => match.metadata?.fileId)
            .map(match => ({
                fileId: match.metadata.fileId,
                fileName: match.metadata.fileName,
                uploadedAt: match.metadata.processedAt,
                uploadedBy: match.metadata.userId,
            }));

        res.json({
            success: true,
            data: {
                files,
                count: files.length,
            },
        });
    } catch (error) {
        logger.error(error, 'Error in listFiles:');
        res.status(500).json({
            success: false,
            error: 'Failed to list files',
            message: error.message,
        });
    }
});

/**
 * Delete a file and its vectors
 */
export const deleteFile = asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    try {
        const index = pinecone.index(config.pinecone.indexName);
        
        // Delete all vectors for this fileId
        await index.delete1({
            filter: {
                fileId: fileId,
            },
        });

        res.json({
            success: true,
            data: {
                message: 'File deleted successfully',
                fileId,
            },
        });
    } catch (error) {
        logger.error(error, `Error deleting file ${fileId}:`);
        res.status(500).json({
            success: false,
            error: 'Failed to delete file',
            message: error.message,
        });
    }
});
