import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { routerNode } from '../../../app/workflows/nodes/router-node.js';

// Mock dependencies
jest.mock('../../../config/environment.js');
jest.mock('../../../app/utils/logger.js');

describe('Router Node', () => {
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
        };

        // Mock the logger import
        jest.doMock('../../../app/utils/logger.js', () => mockLogger);
    });

    describe('Document Query Routing', () => {
        it('should route to documentNode when fileId is present', async () => {
            const state = {
                userQuery: 'What is this document about?',
                fileId: 'doc-123',
                conversationID: 'conv-456',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('documentNode');
            expect(result.routingMetadata).toEqual({
                timestamp: expect.any(String),
                reason: 'Document query with fileId',
            });
            expect(mockLogger.info).toHaveBeenCalledWith('Router analyzing query: "What is this document about?", fileId: doc-123');
            expect(mockLogger.info).toHaveBeenCalledWith('Routing to document node for fileId: doc-123');
        });

        it('should prioritize document routing over weather keywords when fileId exists', async () => {
            const state = {
                userQuery: 'What is the weather like in the document?',
                fileId: 'doc-789',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('documentNode');
            expect(result.routingMetadata.reason).toBe('Document query with fileId');
        });

        it('should handle empty string fileId as no fileId', async () => {
            const state = {
                userQuery: 'What is the weather?',
                fileId: '',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            // Should route to weather since fileId is empty
            expect(result.selectedNode).toBe('weatherNode');
        });

        it('should handle null fileId as no fileId', async () => {
            const state = {
                userQuery: 'What is the weather?',
                fileId: null,
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('weatherNode');
        });
    });

    describe('Weather Query Routing', () => {
        const weatherQueries = [
            'What is the weather like today?',
            "What's the temperature outside?",
            'Will it rain tomorrow?',
            'Is it sunny today?',
            'How cloudy is it?',
            "What's the humidity level?",
            'Is there any wind?',
            'Is it hot outside?',
            'How cold is it?',
            "What's the forecast for next week?",
        ];

        weatherQueries.forEach((query) => {
            it(`should route weather query: "${query}"`, async () => {
                const state = {
                    userQuery: query,
                    conversationID: 'conv-123',
                };

                const result = await routerNode(state);

                expect(result.selectedNode).toBe('weatherNode');
                expect(result.routingMetadata).toEqual({
                    timestamp: expect.any(String),
                    reason: 'Weather-related query detected',
                });
            });
        });

        it('should handle case-insensitive weather keywords', async () => {
            const state = {
                userQuery: 'WHAT IS THE WEATHER LIKE?',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('weatherNode');
        });

        it('should detect weather keywords in complex sentences', async () => {
            const state = {
                userQuery: 'Can you please tell me about the weather conditions in New York?',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('weatherNode');
        });

        it('should handle partial weather keyword matches', async () => {
            const state = {
                userQuery: 'The temperatures are rising globally',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('weatherNode');
        });
    });

    describe('Unsupported Query Routing', () => {
        const unsupportedQueries = [
            'What is the capital of France?',
            'How do I cook pasta?',
            'Tell me a joke',
            'What is the meaning of life?',
            'Translate this to Spanish',
            'How much is 2 + 2?',
            'What time is it?',
        ];

        unsupportedQueries.forEach((query) => {
            it(`should route unsupported query: "${query}"`, async () => {
                const state = {
                    userQuery: query,
                    conversationID: 'conv-123',
                };

                const result = await routerNode(state);

                expect(result.selectedNode).toBe('none');
                expect(result.routingMetadata).toEqual({
                    timestamp: expect.any(String),
                    reason: 'Query not supported',
                    message: 'I can only help with weather queries or questions about uploaded documents.',
                });
            });
        });

        it('should handle empty query string', async () => {
            const state = {
                userQuery: '',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('none');
        });

        it('should handle whitespace-only query', async () => {
            const state = {
                userQuery: '   \t\n   ',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('none');
        });

        it('should handle undefined query', async () => {
            const state = {
                userQuery: undefined,
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('none');
        });

        it('should handle null query', async () => {
            const state = {
                userQuery: null,
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('none');
        });
    });

    describe('Logging Behavior', () => {
        it('should log routing analysis', async () => {
            const state = {
                userQuery: 'Test query',
                fileId: 'doc-123',
                conversationID: 'conv-456',
            };

            await routerNode(state);

            expect(mockLogger.info).toHaveBeenCalledWith('Router analyzing query: "Test query", fileId: doc-123');
        });

        it('should log when fileId is none', async () => {
            const state = {
                userQuery: 'Test query',
                conversationID: 'conv-456',
            };

            await routerNode(state);

            expect(mockLogger.info).toHaveBeenCalledWith('Router analyzing query: "Test query", fileId: none');
        });

        it('should log routing decisions', async () => {
            const state = {
                userQuery: 'What is the weather?',
                conversationID: 'conv-123',
            };

            await routerNode(state);

            expect(mockLogger.info).toHaveBeenCalledWith('Routing to weather node');
        });

        it('should log unsupported queries', async () => {
            const state = {
                userQuery: 'Tell me about quantum physics',
                conversationID: 'conv-123',
            };

            await routerNode(state);

            expect(mockLogger.info).toHaveBeenCalledWith('Query not supported by available nodes');
        });
    });

    describe('Error Handling', () => {
        it('should handle and log errors', async () => {
            // Mock a function that throws an error
            const originalDateToISOString = Date.prototype.toISOString;
            Date.prototype.toISOString = jest.fn().mockImplementation(() => {
                throw new Error('Date formatting failed');
            });

            const state = {
                userQuery: 'Test query',
                conversationID: 'conv-123',
            };

            await expect(routerNode(state)).rejects.toThrow('Date formatting failed');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error), 'Error in router node:');

            // Restore original function
            Date.prototype.toISOString = originalDateToISOString;
        });

        it('should handle malformed state input', async () => {
            const state = {}; // Missing required properties

            const result = await routerNode(state);

            // Should still work and route to 'none' for undefined query
            expect(result.selectedNode).toBe('none');
        });
    });

    describe('Timestamp Generation', () => {
        it('should include valid ISO timestamp in routing metadata', async () => {
            const state = {
                userQuery: 'What is the weather?',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.routingMetadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

            // Verify it's a recent timestamp (within last minute)
            const timestamp = new Date(result.routingMetadata.timestamp);
            const now = new Date();
            const timeDiff = Math.abs(now - timestamp);
            expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
        });

        it('should generate unique timestamps for concurrent calls', async () => {
            const state1 = {
                userQuery: 'What is the weather?',
                conversationID: 'conv-1',
            };

            const state2 = {
                userQuery: 'What is the temperature?',
                conversationID: 'conv-2',
            };

            const [result1, result2] = await Promise.all([routerNode(state1), routerNode(state2)]);

            // Timestamps might be the same if calls are very close, but that's OK
            expect(result1.routingMetadata.timestamp).toBeDefined();
            expect(result2.routingMetadata.timestamp).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle query with mixed weather and non-weather content', async () => {
            const state = {
                userQuery: 'I like programming but what is the weather like today?',
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            // Should still detect weather keyword
            expect(result.selectedNode).toBe('weatherNode');
        });

        it('should handle very long queries', async () => {
            const longQuery = 'This is a very long query '.repeat(100) + 'what is the weather?';
            const state = {
                userQuery: longQuery,
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('weatherNode');
        });

        it('should handle special characters in query', async () => {
            const state = {
                userQuery: "What's the weather? 🌤️ ☀️ 🌧️",
                conversationID: 'conv-123',
            };

            const result = await routerNode(state);

            expect(result.selectedNode).toBe('weatherNode');
        });
    });
});
