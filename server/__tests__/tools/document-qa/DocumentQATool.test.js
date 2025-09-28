import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '@langchain/core/tools';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { documentQATool } from '../../../app/tools/document-qa/DocumentQATool.js';
import { config } from '../../../config/environment.js';

// Mock all external dependencies
jest.mock('@langchain/core/tools');
jest.mock('@langchain/openai');
jest.mock('@langchain/pinecone');
jest.mock('@pinecone-database/pinecone');
jest.mock('../../../config/environment.js');
jest.mock('../../../app/utils/logger.js');

describe('DocumentQA Tool', () => {
    let mockPinecone;
    let mockIndex;
    let mockVectorStore;
    let mockEmbeddings;
    let mockLogger;
    let mockTool;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock config
        config.pinecone = {
            apiKey: 'test-pinecone-key',
            indexName: 'test-index',
        };
        config.openai = {
            apiKey: 'test-openai-key',
        };

        // Mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
        };
        jest.doMock('../../../app/utils/logger.js', () => mockLogger);

        // Mock Pinecone
        mockIndex = {
            query: jest.fn(),
            upsert: jest.fn(),
        };

        mockPinecone = {
            index: jest.fn().mockReturnValue(mockIndex),
        };
        Pinecone.mockImplementation(() => mockPinecone);

        // Mock embeddings
        mockEmbeddings = {
            embedQuery: jest.fn(),
        };
        OpenAIEmbeddings.mockImplementation(() => mockEmbeddings);

        // Mock vector store
        mockVectorStore = {
            similaritySearch: jest.fn(),
        };
        PineconeStore.fromExistingIndex.mockResolvedValue(mockVectorStore);

        // Mock the tool function
        mockTool = jest.fn();
        tool.mockImplementation((fn, options) => {
            mockTool.fn = fn;
            mockTool.options = options;
            return mockTool;
        });
    });

    describe('Tool Configuration', () => {
        it('should create tool with correct name and description', () => {
            expect(tool).toHaveBeenCalledWith(
                expect.any(Function),
                expect.objectContaining({
                    name: 'documentQA',
                    description: expect.stringContaining('Search within uploaded documents'),
                    schema: expect.any(Object),
                }),
            );
        });

        it('should have correct schema validation', () => {
            const toolCall = tool.mock.calls[0];
            const options = toolCall[1];

            expect(options.schema).toBeDefined();
            expect(options.schema._def).toBeDefined();
        });

        it('should export the tool correctly', () => {
            expect(documentQATool).toBeDefined();
            expect(documentQATool).toBe(mockTool);
        });
    });

    describe('Document Query Function', () => {
        let documentQAFunction;

        beforeEach(() => {
            // Get the actual function passed to tool()
            documentQAFunction = tool.mock.calls[0][0];
        });

        it('should successfully query documents', async () => {
            const mockResults = [
                {
                    pageContent: 'This is relevant content about AI',
                    metadata: { source: 'doc1.pdf', page: 1 },
                },
                {
                    pageContent: 'More information about machine learning',
                    metadata: { source: 'doc1.pdf', page: 2 },
                },
            ];

            mockVectorStore.similaritySearch.mockResolvedValue(mockResults);

            const result = await documentQAFunction({
                query: 'What is AI?',
                fileId: 'file-123',
                maxResults: 3,
            });

            expect(result).toEqual({
                success: true,
                query: 'What is AI?',
                results: [
                    {
                        content: 'This is relevant content about AI',
                        metadata: { source: 'doc1.pdf', page: 1 },
                    },
                    {
                        content: 'More information about machine learning',
                        metadata: { source: 'doc1.pdf', page: 2 },
                    },
                ],
                metadata: {
                    fileId: 'file-123',
                    timestamp: expect.any(String),
                    resultCount: 2,
                },
            });

            expect(mockLogger.info).toHaveBeenCalledWith('Querying document with fileId: file-123');
            expect(mockLogger.info).toHaveBeenCalledWith('Found 2 relevant chunks for query');
        });

        it('should handle Pinecone initialization correctly', async () => {
            mockVectorStore.similaritySearch.mockResolvedValue([]);

            await documentQAFunction({
                query: 'Test query',
                fileId: 'file-456',
            });

            expect(Pinecone).toHaveBeenCalledWith({
                apiKey: 'test-pinecone-key',
            });
            expect(mockPinecone.index).toHaveBeenCalledWith('test-index');
            expect(OpenAIEmbeddings).toHaveBeenCalledWith({
                openAIApiKey: 'test-openai-key',
            });
            expect(PineconeStore.fromExistingIndex).toHaveBeenCalledWith(mockEmbeddings, { pineconeIndex: mockIndex });
        });

        it('should call vector store with correct parameters', async () => {
            mockVectorStore.similaritySearch.mockResolvedValue([]);

            await documentQAFunction({
                query: 'Machine learning concepts',
                fileId: 'ml-doc-789',
                maxResults: 5,
            });

            expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith('Machine learning concepts', 5, { fileId: 'ml-doc-789' });
        });

        it('should use default maxResults when not provided', async () => {
            mockVectorStore.similaritySearch.mockResolvedValue([]);

            await documentQAFunction({
                query: 'Test query',
                fileId: 'file-123',
            });

            expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
                'Test query',
                3, // Default value
                { fileId: 'file-123' },
            );
        });

        it('should handle empty search results', async () => {
            mockVectorStore.similaritySearch.mockResolvedValue([]);

            const result = await documentQAFunction({
                query: 'Non-existent topic',
                fileId: 'file-123',
            });

            expect(result).toEqual({
                success: true,
                query: 'Non-existent topic',
                results: [],
                metadata: {
                    fileId: 'file-123',
                    timestamp: expect.any(String),
                    resultCount: 0,
                },
            });
        });

        it('should handle Pinecone errors gracefully', async () => {
            const error = new Error('Pinecone connection failed');
            mockVectorStore.similaritySearch.mockRejectedValue(error);

            const result = await documentQAFunction({
                query: 'Test query',
                fileId: 'file-123',
            });

            expect(result).toEqual({
                success: false,
                error: 'Pinecone connection failed',
                query: 'Test query',
                metadata: {
                    fileId: 'file-123',
                    timestamp: expect.any(String),
                    resultCount: 0,
                },
            });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error in documentQA:');
        });

        it('should handle vector store initialization errors', async () => {
            const error = new Error('Failed to create vector store');
            PineconeStore.fromExistingIndex.mockRejectedValue(error);

            const result = await documentQAFunction({
                query: 'Test query',
                fileId: 'file-123',
            });

            expect(result).toEqual({
                success: false,
                error: 'Failed to create vector store',
                query: 'Test query',
                metadata: {
                    fileId: 'file-123',
                    timestamp: expect.any(String),
                    resultCount: 0,
                },
            });
        });

        it('should include valid timestamp in metadata', async () => {
            mockVectorStore.similaritySearch.mockResolvedValue([]);

            const result = await documentQAFunction({
                query: 'Test query',
                fileId: 'file-123',
            });

            expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

            // Verify it's a recent timestamp
            const timestamp = new Date(result.metadata.timestamp);
            const now = new Date();
            expect(Math.abs(now - timestamp)).toBeLessThan(1000); // Within 1 second
        });

        it('should handle complex document metadata', async () => {
            const mockResults = [
                {
                    pageContent: 'Complex content',
                    metadata: {
                        source: 'complex-doc.pdf',
                        page: 5,
                        section: 'Introduction',
                        author: 'John Doe',
                        created: '2023-01-01',
                        tags: ['AI', 'ML'],
                    },
                },
            ];

            mockVectorStore.similaritySearch.mockResolvedValue(mockResults);

            const result = await documentQAFunction({
                query: 'Complex query',
                fileId: 'complex-file',
            });

            expect(result.results[0].metadata).toEqual({
                source: 'complex-doc.pdf',
                page: 5,
                section: 'Introduction',
                author: 'John Doe',
                created: '2023-01-01',
                tags: ['AI', 'ML'],
            });
        });

        it('should handle very long content', async () => {
            const longContent = 'Very long content '.repeat(1000);
            const mockResults = [
                {
                    pageContent: longContent,
                    metadata: { source: 'long-doc.pdf', page: 1 },
                },
            ];

            mockVectorStore.similaritySearch.mockResolvedValue(mockResults);

            const result = await documentQAFunction({
                query: 'Long content query',
                fileId: 'long-file',
            });

            expect(result.success).toBe(true);
            expect(result.results[0].content).toBe(longContent);
        });

        it('should handle special characters in query and content', async () => {
            const mockResults = [
                {
                    pageContent: 'Content with émojis 🚀 and spëcial chars',
                    metadata: { source: 'special-doc.pdf', page: 1 },
                },
            ];

            mockVectorStore.similaritySearch.mockResolvedValue(mockResults);

            const result = await documentQAFunction({
                query: 'Query with spëcial chars and émojis 🔍',
                fileId: 'special-file',
            });

            expect(result.success).toBe(true);
            expect(result.query).toBe('Query with spëcial chars and émojis 🔍');
            expect(result.results[0].content).toBe('Content with émojis 🚀 and spëcial chars');
        });
    });

    describe('Error Scenarios', () => {
        let documentQAFunction;

        beforeEach(() => {
            documentQAFunction = tool.mock.calls[0][0];
        });

        it('should handle Pinecone API errors', async () => {
            const apiError = new Error('API rate limit exceeded');
            apiError.code = 'RATE_LIMIT_EXCEEDED';
            mockVectorStore.similaritySearch.mockRejectedValue(apiError);

            const result = await documentQAFunction({
                query: 'Test query',
                fileId: 'file-123',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('API rate limit exceeded');
        });

        it('should handle network timeouts', async () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.code = 'TIMEOUT';
            mockVectorStore.similaritySearch.mockRejectedValue(timeoutError);

            const result = await documentQAFunction({
                query: 'Test query',
                fileId: 'file-123',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Request timeout');
        });

        it('should handle invalid file ID errors', async () => {
            const invalidIdError = new Error('File not found');
            invalidIdError.code = 'NOT_FOUND';
            mockVectorStore.similaritySearch.mockRejectedValue(invalidIdError);

            const result = await documentQAFunction({
                query: 'Test query',
                fileId: 'invalid-file-id',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('File not found');
        });
    });

    describe('Integration Scenarios', () => {
        let documentQAFunction;

        beforeEach(() => {
            documentQAFunction = tool.mock.calls[0][0];
        });

        it('should handle concurrent queries', async () => {
            const mockResults = [
                { pageContent: 'Result 1', metadata: { page: 1 } },
                { pageContent: 'Result 2', metadata: { page: 2 } },
            ];

            mockVectorStore.similaritySearch.mockResolvedValue(mockResults);

            const query1Promise = documentQAFunction({
                query: 'Query 1',
                fileId: 'file-1',
            });

            const query2Promise = documentQAFunction({
                query: 'Query 2',
                fileId: 'file-2',
            });

            const [result1, result2] = await Promise.all([query1Promise, query2Promise]);

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result1.query).toBe('Query 1');
            expect(result2.query).toBe('Query 2');
        });

        it('should maintain consistent performance with large result sets', async () => {
            const largeMockResults = Array.from({ length: 100 }, (_, i) => ({
                pageContent: `Content chunk ${i}`,
                metadata: { page: i + 1 },
            }));

            mockVectorStore.similaritySearch.mockResolvedValue(largeMockResults);

            const start = Date.now();
            const result = await documentQAFunction({
                query: 'Large dataset query',
                fileId: 'large-file',
                maxResults: 5,
            });
            const duration = Date.now() - start;

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(100);
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });
});
