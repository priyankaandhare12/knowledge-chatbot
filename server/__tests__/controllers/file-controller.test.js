import { jest } from '@jest/globals';
import { listFiles, getFileById, deleteFile } from '../../app/controllers/file-controller.js';

// Mock dependencies
const mockIndex = {
    query: jest.fn(),
    deleteMany: jest.fn(),
};

jest.mock('@pinecone-database/pinecone', () => ({
    Pinecone: jest.fn(() => ({
        index: jest.fn(() => mockIndex),
    })),
}));

jest.mock('../../config/environment.js', () => ({
    config: {
        pinecone: {
            apiKey: 'test-api-key',
            indexName: 'test-index',
        },
    },
}));

jest.mock('../../app/utils/logger.js', () => ({
    error: jest.fn(),
}));

describe('File Controller', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            user: { id: 'test-user-id' },
            params: {},
        };
        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe('listFiles', () => {
        it('should list files successfully for authenticated user', async () => {
            const mockResponse = {
                matches: [
                    {
                        metadata: {
                            fileId: 'file-1',
                            fileName: 'document1.pdf',
                            uploadedAt: '2023-01-01T00:00:00Z',
                            userId: 'test-user-id',
                        },
                    },
                    {
                        metadata: {
                            fileId: 'file-1',
                            fileName: 'document1.pdf',
                            uploadedAt: '2023-01-01T00:00:00Z',
                            userId: 'test-user-id',
                        },
                    },
                    {
                        metadata: {
                            fileId: 'file-2',
                            fileName: 'document2.pdf',
                            uploadedAt: '2023-01-02T00:00:00Z',
                            userId: 'test-user-id',
                        },
                    },
                ],
            };

            mockIndex.query.mockResolvedValue(mockResponse);

            await listFiles(mockReq, mockRes);

            expect(mockIndex.query).toHaveBeenCalledWith({
                vector: [],
                filter: { userId: 'test-user-id' },
                includeMetadata: true,
                topK: 10000,
            });

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: [
                    {
                        fileId: 'file-1',
                        fileName: 'document1.pdf',
                        uploadedAt: '2023-01-01T00:00:00Z',
                        chunks: 2,
                    },
                    {
                        fileId: 'file-2',
                        fileName: 'document2.pdf',
                        uploadedAt: '2023-01-02T00:00:00Z',
                        chunks: 1,
                    },
                ],
            });
        });

        it('should handle anonymous user', async () => {
            mockReq.user = null;
            mockIndex.query.mockResolvedValue({ matches: [] });

            await listFiles(mockReq, mockRes);

            expect(mockIndex.query).toHaveBeenCalledWith({
                vector: [],
                filter: { userId: 'anonymous' },
                includeMetadata: true,
                topK: 10000,
            });

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: [],
            });
        });

        it('should handle Pinecone query errors', async () => {
            const error = new Error('Pinecone query failed');
            mockIndex.query.mockRejectedValue(error);

            await listFiles(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to list files',
                message: 'Pinecone query failed',
            });
        });
    });

    describe('getFileById', () => {
        beforeEach(() => {
            mockReq.params = { fileId: 'test-file-id' };
        });

        it('should get file details successfully', async () => {
            const mockResponse = {
                matches: [
                    {
                        metadata: {
                            fileId: 'test-file-id',
                            fileName: 'test.pdf',
                            uploadedAt: '2023-01-01T00:00:00Z',
                            chunkIndex: 0,
                            chunk: 'First chunk content',
                        },
                    },
                    {
                        metadata: {
                            fileId: 'test-file-id',
                            fileName: 'test.pdf',
                            uploadedAt: '2023-01-01T00:00:00Z',
                            chunkIndex: 1,
                            chunk: 'Second chunk content',
                        },
                    },
                ],
            };

            mockIndex.query.mockResolvedValue(mockResponse);

            await getFileById(mockReq, mockRes);

            expect(mockIndex.query).toHaveBeenCalledWith({
                vector: [],
                filter: {
                    fileId: 'test-file-id',
                    userId: 'test-user-id',
                },
                includeMetadata: true,
                topK: 10000,
            });

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    fileId: 'test-file-id',
                    fileName: 'test.pdf',
                    uploadedAt: '2023-01-01T00:00:00Z',
                    chunks: 2,
                    content: 'First chunk content\\nSecond chunk content',
                },
            });
        });

        it('should return 404 when file not found', async () => {
            mockIndex.query.mockResolvedValue({ matches: [] });

            await getFileById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'File not found',
                message: 'No file found with the provided ID',
            });
        });

        it('should handle query errors', async () => {
            const error = new Error('Query failed');
            mockIndex.query.mockRejectedValue(error);

            await getFileById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to get file',
                message: 'Query failed',
            });
        });

        it('should sort chunks by chunkIndex', async () => {
            const mockResponse = {
                matches: [
                    {
                        metadata: {
                            fileId: 'test-file-id',
                            fileName: 'test.pdf',
                            uploadedAt: '2023-01-01T00:00:00Z',
                            chunkIndex: 2,
                            chunk: 'Third chunk',
                        },
                    },
                    {
                        metadata: {
                            fileId: 'test-file-id',
                            fileName: 'test.pdf',
                            uploadedAt: '2023-01-01T00:00:00Z',
                            chunkIndex: 0,
                            chunk: 'First chunk',
                        },
                    },
                    {
                        metadata: {
                            fileId: 'test-file-id',
                            fileName: 'test.pdf',
                            uploadedAt: '2023-01-01T00:00:00Z',
                            chunkIndex: 1,
                            chunk: 'Second chunk',
                        },
                    },
                ],
            };

            mockIndex.query.mockResolvedValue(mockResponse);

            await getFileById(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    content: 'First chunk\\nSecond chunk\\nThird chunk',
                }),
            });
        });
    });

    describe('deleteFile', () => {
        beforeEach(() => {
            mockReq.params = { fileId: 'test-file-id' };
        });

        it('should delete file successfully', async () => {
            mockIndex.deleteMany.mockResolvedValue({});

            await deleteFile(mockReq, mockRes);

            expect(mockIndex.deleteMany).toHaveBeenCalledWith({
                filter: {
                    fileId: 'test-file-id',
                    userId: 'test-user-id',
                },
            });

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'File deleted successfully',
            });
        });

        it('should handle delete errors', async () => {
            const error = new Error('Delete failed');
            mockIndex.deleteMany.mockRejectedValue(error);

            await deleteFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to delete file',
                message: 'Delete failed',
            });
        });

        it('should handle anonymous user deletion', async () => {
            mockReq.user = null;
            mockIndex.deleteMany.mockResolvedValue({});

            await deleteFile(mockReq, mockRes);

            expect(mockIndex.deleteMany).toHaveBeenCalledWith({
                filter: {
                    fileId: 'test-file-id',
                    userId: 'anonymous',
                },
            });
        });
    });
});
