import { asyncHandler } from '../middleware/validation.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { processPDFDocument } from '../services/file-processor.js';
import logger from '../utils/logger.js';

// Configure multer to store in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 5 * 1024 * 1024  // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        logger.debug({
            message: 'Received file',
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });

        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
}).single('file');

export const uploadFile = asyncHandler(async (req, res) => {
    upload(req, res, async (err) => {
        try {
            logger.info('Starting file upload process');

            if (err instanceof multer.MulterError) {
                logger.error({
                    message: 'Multer error',
                    error: err.message,
                    code: err.code
                });
                return res.status(400).json({
                    success: false,
                    error: 'File upload error',
                    message: err.code === 'LIMIT_FILE_SIZE' 
                        ? 'File size cannot exceed 5MB'
                        : err.message
                });
            }
            
            if (err) {
                logger.error({
                    message: 'Upload error',
                    error: err.message
                });
                return res.status(400).json({
                    success: false,
                    error: 'Upload failed',
                    message: err.message
                });
            }

            if (!req.file) {
                logger.error('No file in request');
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded',
                    message: 'Please select a PDF file to upload'
                });
            }

            // Log file details
            logger.info({
                message: 'File received',
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype
            });

            // Generate fileId
            const fileId = uuidv4();

            logger.info({
                message: 'Processing file',
                fileId,
                fileName: req.file.originalname
            });

            // Process the document using buffer
            const result = await processPDFDocument(req.file.buffer, {
                fileId,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                userId: req.user?.id || 'anonymous',
                uploadedAt: new Date().toISOString(),
            });

            logger.info({
                message: 'File processed successfully',
                fileId,
                fileName: req.file.originalname,
                chunks: result.chunks
            });

            // Return success response
            res.json({
                success: true,
                data: {
                    fileId,
                    fileName: req.file.originalname,
                    pages: result.pages,
                    chunks: result.chunks,
                    uploadedAt: new Date().toISOString(),
                }
            });

        } catch (error) {
            logger.error({
                message: 'Error in upload process',
                error: error.message,
                stack: error.stack,
                fileName: req.file?.originalname,
                fileSize: req.file?.size,
                mimeType: req.file?.mimetype
            });

            res.status(500).json({
                success: false,
                error: 'Failed to process PDF',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });
});