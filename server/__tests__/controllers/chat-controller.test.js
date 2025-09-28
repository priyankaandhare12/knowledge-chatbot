// Chat controller unit tests
import { jest } from '@jest/globals';

// Mock dependencies
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

const mockInvokeAgent = jest.fn();
const mockUuidv4 = jest.fn();

jest.unstable_mockModule('../../app/utils/logger.js', () => ({
    default: mockLogger,
}));

jest.unstable_mockModule('../../app/agents/universal-agent.js', () => ({
    invokeAgent: mockInvokeAgent,
}));

jest.unstable_mockModule('uuid', () => ({
    v4: mockUuidv4,
}));

jest.unstable_mockModule('../../app/middleware/validation.js', () => ({
    asyncHandler: (fn) => fn, // Simple pass-through for testing
}));

// Import after mocking
const { chat } = await import('../../app/controllers/chat-controller.js');
const { factories, assertions } = await import('../utils/testHelpers.js');

describe('Chat Controller', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = global.testUtils.createMockRequest();
        mockRes = global.testUtils.createMockResponse();
        mockNext = global.testUtils.createMockNext();

        // Reset mocks
        jest.clearAllMocks();

        // Default UUID mock
        mockUuidv4.mockReturnValue('test-conversation-id');
    });

    describe('POST /chat', () => {
        it('should process chat message successfully', async () => {
            const mockAgentResult = {
                finalResponse: 'This is the AI response',
                conversationId: 'test-conversation-id',
                messages: [
                    {
                        content: 'AI response',
                        role: 'assistant',
                    },
                ],
            };

            mockReq.body = {
                message: 'What is the weather today?',
                conversationId: 'existing-conversation-id',
            };
            mockReq.user = { id: 'user123' };

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockInvokeAgent).toHaveBeenCalledWith({
                userQuery: 'What is the weather today?',
                conversationID: 'existing-conversation-id',
                fileId: undefined,
            });

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    message: 'This is the AI response',
                    metadata: {
                        conversationId: 'test-conversation-id',
                        timestamp: expect.any(String),
                        fileId: null,
                    },
                    user: {
                        id: 'user123',
                    },
                },
            });
        });

        it('should generate new conversation ID when not provided', async () => {
            const mockAgentResult = {
                finalResponse: 'AI response',
                conversationId: 'generated-conversation-id',
                messages: [],
            };

            mockReq.body = {
                message: 'Hello',
            };

            mockUuidv4.mockReturnValue('generated-conversation-id');
            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockUuidv4).toHaveBeenCalled();
            expect(mockInvokeAgent).toHaveBeenCalledWith({
                userQuery: 'Hello',
                conversationID: 'generated-conversation-id',
                fileId: undefined,
            });
        });

        it('should handle document queries with fileId', async () => {
            const mockAgentResult = {
                finalResponse: 'Document-based response',
                conversationId: 'doc-conversation-id',
                messages: [],
            };

            mockReq.body = {
                message: 'What does this document say about AI?',
                fileId: 'document-123',
            };

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockLogger.info).toHaveBeenCalledWith('Processing document query for fileId: document-123');
            expect(mockInvokeAgent).toHaveBeenCalledWith({
                userQuery: 'What does this document say about AI?',
                conversationID: expect.any(String),
                fileId: 'document-123',
            });

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        metadata: expect.objectContaining({
                            fileId: 'document-123',
                        }),
                    }),
                }),
            );
        });

        it('should handle web search queries without fileId', async () => {
            const mockAgentResult = {
                finalResponse: 'Web search response',
                conversationId: 'web-conversation-id',
                messages: [],
            };

            mockReq.body = {
                message: 'What is machine learning?',
            };

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockLogger.info).toHaveBeenCalledWith('Processing web search query');
            expect(mockInvokeAgent).toHaveBeenCalledWith({
                userQuery: 'What is machine learning?',
                conversationID: expect.any(String),
                fileId: undefined,
            });
        });

        it('should include tool usage information when available', async () => {
            const mockAgentResult = {
                finalResponse: 'Response with tools',
                conversationId: 'tool-conversation-id',
                messages: [
                    {
                        role: 'assistant',
                        content: 'Response',
                        tool_calls: [{ name: 'web_search' }, { name: 'document_qa' }],
                    },
                ],
            };

            mockReq.body = {
                message: 'Search for information',
            };

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        toolsUsed: ['web_search', 'document_qa'],
                    }),
                }),
            );
        });

        it('should handle anonymous users', async () => {
            const mockAgentResult = {
                finalResponse: 'Anonymous response',
                conversationId: 'anon-conversation-id',
                messages: [],
            };

            mockReq.body = {
                message: 'Hello from anonymous user',
            };
            // No user set on request

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        user: {
                            id: 'anonymous',
                        },
                    }),
                }),
            );
        });

        it('should return 400 for missing message', async () => {
            mockReq.body = {
                conversationId: 'test-id',
                // message is missing
            };

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Message is required',
            });

            expect(mockInvokeAgent).not.toHaveBeenCalled();
        });

        it('should return 400 for empty message', async () => {
            mockReq.body = {
                message: '',
                conversationId: 'test-id',
            };

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Message is required',
            });
        });

        it('should return 400 for whitespace-only message', async () => {
            mockReq.body = {
                message: '   \n\t   ',
                conversationId: 'test-id',
            };

            // Assuming the validation checks for falsy values after trim
            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle agent invocation errors', async () => {
            mockReq.body = {
                message: 'This will cause an error',
            };

            const agentError = new Error('Agent processing failed');
            mockInvokeAgent.mockRejectedValue(agentError);

            await chat(mockReq, mockRes);

            expect(mockLogger.error).toHaveBeenCalledWith(agentError, 'Error in chat:');
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to generate response',
                message: 'Agent processing failed',
            });
        });

        it('should handle agent timeout errors', async () => {
            mockReq.body = {
                message: 'Long processing message',
            };

            const timeoutError = new Error('Request timeout');
            timeoutError.code = 'TIMEOUT';
            mockInvokeAgent.mockRejectedValue(timeoutError);

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to generate response',
                message: 'Request timeout',
            });
        });

        it('should handle network errors gracefully', async () => {
            mockReq.body = {
                message: 'Network test message',
            };

            const networkError = new Error('Network unreachable');
            networkError.code = 'ENETUNREACH';
            mockInvokeAgent.mockRejectedValue(networkError);

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should validate conversation ID format', async () => {
            const mockAgentResult = {
                finalResponse: 'Response',
                conversationId: 'malformed-id',
                messages: [],
            };

            mockReq.body = {
                message: 'Test message',
                conversationId: 'valid-uuid-format',
            };

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockInvokeAgent).toHaveBeenCalledWith(
                expect.objectContaining({
                    conversationID: 'valid-uuid-format',
                }),
            );
        });

        it('should handle very long messages', async () => {
            const longMessage = 'a'.repeat(10000); // 10KB message
            const mockAgentResult = {
                finalResponse: 'Processed long message',
                conversationId: 'long-msg-id',
                messages: [],
            };

            mockReq.body = {
                message: longMessage,
            };

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockInvokeAgent).toHaveBeenCalledWith(
                expect.objectContaining({
                    userQuery: longMessage,
                }),
            );
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                }),
            );
        });

        it('should include proper timestamps', async () => {
            const mockAgentResult = {
                finalResponse: 'Timestamped response',
                conversationId: 'timestamp-id',
                messages: [],
            };

            mockReq.body = {
                message: 'Test timestamp',
            };

            const beforeTime = new Date();
            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            const afterTime = new Date();
            const responseCall = mockRes.json.mock.calls[0][0];
            const timestamp = new Date(responseCall.data.metadata.timestamp);

            expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        });

        it('should handle special characters in messages', async () => {
            const specialMessage = '🚀 Hello! @#$%^&*()_+{}|:"<>?[]\\;\',./ 你好 مرحبا';
            const mockAgentResult = {
                finalResponse: 'Special chars processed',
                conversationId: 'special-id',
                messages: [],
            };

            mockReq.body = {
                message: specialMessage,
            };

            mockInvokeAgent.mockResolvedValue(mockAgentResult);

            await chat(mockReq, mockRes);

            expect(mockInvokeAgent).toHaveBeenCalledWith(
                expect.objectContaining({
                    userQuery: specialMessage,
                }),
            );
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                }),
            );
        });
    });

    describe('Error handling edge cases', () => {
        it('should handle malformed request body', async () => {
            mockReq.body = null;

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle missing body entirely', async () => {
            delete mockReq.body;

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle agent returning malformed response', async () => {
            mockReq.body = {
                message: 'Test message',
            };

            // Agent returns incomplete response
            mockInvokeAgent.mockResolvedValue({
                // Missing finalResponse
                conversationId: 'test-id',
            });

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should handle agent returning null response', async () => {
            mockReq.body = {
                message: 'Test message',
            };

            mockInvokeAgent.mockResolvedValue(null);

            await chat(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
