import { jest } from '@jest/globals';
import { uploadFile } from '../../app/controllers/upload-controller.js';
import multer from 'multer';

// Mock dependencies
const mockProcessPDFDocument = jest.fn();

jest.mock('multer', () => {
    const mockMulter = jest.fn(() => ({
        single: jest.fn(() => jest.fn()),
    }));
    mockMulter.memoryStorage = jest.fn();
    mockMulter.MulterError = class MulterError extends Error {
        constructor(code, field) {
            super(`Multer error: ${code}`);
            this.name = 'MulterError';
            this.code = code;
            this.field = field;
        }
    };
    return mockMulter;
});

jest.mock('../../app/services/file-processor.js', () => ({
    processPDFDocument: mockProcessPDFDocument,
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-123'),
}));

jest.mock('../../app/utils/logger.js', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
}));

describe('Upload Controller', () => {
    let mockReq, mockRes, mockUpload;

    beforeEach(() => {
        mockReq = {
            user: { id: 'test-user-id' },
            file: null,
        };
        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
        mockUpload = jest.fn();
        multer.mockReturnValue({ single: () => mockUpload });
        jest.clearAllMocks();
    });

    describe('uploadFile', () => {
        it('should upload and process PDF file successfully', async () => {
            const mockFile = {
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024,
                buffer: Buffer.from('mock pdf content'),
            };
            mockReq.file = mockFile;

            const mockProcessResult = {
                pages: 5,
                chunks: 10,
            };
            mockProcessPDFDocument.mockResolvedValue(mockProcessResult);

            // Mock multer to call callback with no error
            mockUpload.mockImplementation((req, res, callback) => {
                callback(null);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockProcessPDFDocument).toHaveBeenCalledWith(mockFile.buffer, {
                fileId: 'mock-uuid-123',
                fileName: 'test.pdf',
                mimeType: 'application/pdf',
                fileSize: 1024,
                userId: 'test-user-id',
                uploadedAt: expect.any(String),
            });

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    fileId: 'mock-uuid-123',
                    fileName: 'test.pdf',
                    pages: 5,
                    chunks: 10,
                    uploadedAt: expect.any(String),
                },
            });
        });

        it('should handle anonymous user uploads', async () => {
            mockReq.user = null;
            mockReq.file = {
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024,
                buffer: Buffer.from('mock pdf content'),
            };

            mockProcessPDFDocument.mockResolvedValue({ pages: 3, chunks: 6 });
            mockUpload.mockImplementation((req, res, callback) => {
                callback(null);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockProcessPDFDocument).toHaveBeenCalledWith(
                expect.any(Buffer),
                expect.objectContaining({
                    userId: 'anonymous',
                }),
            );
        });

        it('should handle multer file size limit error', async () => {
            const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
            mockUpload.mockImplementation((req, res, callback) => {
                callback(multerError);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'File upload error',
                message: 'File size cannot exceed 5MB',
            });
        });

        it('should handle general multer errors', async () => {
            const multerError = new multer.MulterError('LIMIT_FIELD_COUNT');
            mockUpload.mockImplementation((req, res, callback) => {
                callback(multerError);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'File upload error',
                message: 'Multer error: LIMIT_FIELD_COUNT',
            });
        });

        it('should handle file type validation errors', async () => {
            const fileTypeError = new Error('Only PDF files are allowed');
            mockUpload.mockImplementation((req, res, callback) => {
                callback(fileTypeError);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Upload failed',
                message: 'Only PDF files are allowed',
            });
        });

        it('should handle missing file error', async () => {
            mockReq.file = null;
            mockUpload.mockImplementation((req, res, callback) => {
                callback(null);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'No file uploaded',
                message: 'Please select a PDF file to upload',
            });
        });

        it('should handle PDF processing errors', async () => {
            mockReq.file = {
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024,
                buffer: Buffer.from('invalid pdf content'),
            };

            const processingError = new Error('PDF processing failed');
            mockProcessPDFDocument.mockRejectedValue(processingError);
            mockUpload.mockImplementation((req, res, callback) => {
                callback(null);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to process PDF',
                message: 'PDF processing failed',
                details: undefined, // Not in development mode
            });
        });

        it('should generate unique file ID for each upload', async () => {
            mockReq.file = {
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024,
                buffer: Buffer.from('mock pdf content'),
            };

            mockProcessPDFDocument.mockResolvedValue({ pages: 2, chunks: 4 });
            mockUpload.mockImplementation((req, res, callback) => {
                callback(null);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        fileId: 'mock-uuid-123',
                    }),
                }),
            );
        });

        it('should include upload timestamp in response', async () => {
            mockReq.file = {
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024,
                buffer: Buffer.from('mock pdf content'),
            };

            mockProcessPDFDocument.mockResolvedValue({ pages: 1, chunks: 2 });
            mockUpload.mockImplementation((req, res, callback) => {
                callback(null);
            });

            await uploadFile(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        uploadedAt: expect.stringMatching(/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/),
                    }),
                }),
            );
        });
    });
});
