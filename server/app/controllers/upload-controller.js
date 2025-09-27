import { asyncHandler } from '../middleware/validation.js';
import { processDocument } from '../services/file-processor.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Handle file upload and processing
 */
export const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded',
        });
    }

    try {
        // Check file type
        if (!req.file.mimetype.includes('pdf')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid file type',
                message: 'Only PDF files are supported',
            });
        }

        // Check file size (5MB limit)
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                message: 'Maximum file size is 5MB',
            });
        }

        // Generate a unique file ID
        const fileId = uuidv4();
        
        logger.info(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Process the document
        await processDocument(req.file.buffer, {
            fileId,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            userId: req.user?.id || 'anonymous',
            uploadedAt: new Date().toISOString(),
            fileSize: req.file.size,
        });

        logger.info(`File processed successfully: ${fileId}`);

        res.json({
            success: true,
            data: {
                fileId,
                fileName: req.file.originalname,
                message: 'File processed successfully',
                uploadedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error(error, `Error processing file: ${req.file.originalname}`);
        res.status(500).json({
            success: false,
            error: 'Failed to process file',
            message: error.message || 'An unexpected error occurred while processing the file',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});
