import { asyncHandler } from '../middleware/validation.js';
import { Pinecone } from "@pinecone-database/pinecone";
import { config } from '../../config/environment.js';
import logger from '../utils/logger.js';

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey,
});

/**
 * List all files for a user
 */
export const listFiles = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?.id || 'anonymous';
        const index = pinecone.index(config.pinecone.indexName);

        // Query Pinecone for all vectors with this userId
        // We'll use metadata filtering to get unique fileIds
        const queryResponse = await index.query({
            vector: [], // Empty vector for metadata-only query
            filter: {
                userId: userId
            },
            includeMetadata: true,
            topK: 10000 // High number to get all files
        });

        // Extract unique files from the results
        const filesMap = new Map();
        queryResponse.matches.forEach(match => {
            const metadata = match.metadata;
            if (!filesMap.has(metadata.fileId)) {
                filesMap.set(metadata.fileId, {
                    fileId: metadata.fileId,
                    fileName: metadata.fileName,
                    uploadedAt: metadata.uploadedAt,
                    chunks: 0
                });
            }
            filesMap.get(metadata.fileId).chunks++;
        });

        const files = Array.from(filesMap.values());

        res.json({
            success: true,
            data: files
        });
    } catch (error) {
        logger.error(error, 'Error listing files:');
        res.status(500).json({
            success: false,
            error: 'Failed to list files',
            message: error.message
        });
    }
});

/**
 * Get file details by ID
 */
export const getFileById = asyncHandler(async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user?.id || 'anonymous';
        const index = pinecone.index(config.pinecone.indexName);

        // Query Pinecone for all chunks of this file
        const queryResponse = await index.query({
            vector: [], // Empty vector for metadata-only query
            filter: {
                fileId: fileId,
                userId: userId
            },
            includeMetadata: true,
            topK: 10000 // High number to get all chunks
        });

        if (!queryResponse.matches.length) {
            return res.status(404).json({
                success: false,
                error: 'File not found',
                message: 'No file found with the provided ID'
            });
        }

        // Combine all chunks and sort by chunkIndex
        const chunks = queryResponse.matches
            .map(match => ({
                chunkIndex: match.metadata.chunkIndex,
                content: match.metadata.chunk
            }))
            .sort((a, b) => a.chunkIndex - b.chunkIndex);

        // Get file metadata from first chunk
        const fileMetadata = queryResponse.matches[0].metadata;

        const fileDetails = {
            fileId: fileMetadata.fileId,
            fileName: fileMetadata.fileName,
            uploadedAt: fileMetadata.uploadedAt,
            chunks: chunks.length,
            content: chunks.map(chunk => chunk.content).join('\\n'),
        };

        res.json({
            success: true,
            data: fileDetails
        });
    } catch (error) {
        logger.error(error, 'Error getting file:');
        res.status(500).json({
            success: false,
            error: 'Failed to get file',
            message: error.message
        });
    }
});

/**
 * Delete file by ID
 */
export const deleteFile = asyncHandler(async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user?.id || 'anonymous';
        const index = pinecone.index(config.pinecone.indexName);

        // Delete all vectors for this file
        await index.deleteMany({
            filter: {
                fileId: fileId,
                userId: userId
            }
        });

        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        logger.error(error, 'Error deleting file:');
        res.status(500).json({
            success: false,
            error: 'Failed to delete file',
            message: error.message
        });
    }
});