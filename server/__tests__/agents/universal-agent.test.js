import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph } from '@langchain/langgraph';
import { invokeAgent } from '../../app/agents/universal-agent.js';
import { config } from '../../config/environment.js';
import { getPrompt, Prompts } from '../../app/prompts/index.js';
import { tools } from '../../app/tools/registry.js';

// Mock external dependencies
jest.mock('@langchain/openai');
jest.mock('../../config/environment.js');
jest.mock('../../app/prompts/index.js');
jest.mock('../../app/tools/registry.js');
jest.mock('../../app/utils/logger.js');

describe('Universal Agent', () => {
    let mockLLMInstance;
    let mockAgentInstance;
    let mockConfig;
    let mockTools;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock config
        mockConfig = {
            openai: {
                apiKey: 'test-api-key',
                projectId: 'test-project-id',
            },
        };
        config.openai = mockConfig.openai;

        // Mock tools
        mockTools = [
            { name: 'document-qa', description: 'Document QA tool' },
            { name: 'weather', description: 'Weather tool' },
        ];
        tools.splice(0, tools.length, ...mockTools);

        // Mock prompts
        getPrompt.mockReturnValue('You are a helpful AI assistant.');

        // Mock LLM instance
        mockLLMInstance = {
            invoke: jest.fn(),
            bindTools: jest.fn().mockReturnThis(),
        };
        ChatOpenAI.mockImplementation(() => mockLLMInstance);

        // Mock StateGraph and agent
        mockAgentInstance = {
            invoke: jest.fn(),
        };

        const mockStateGraph = {
            addNode: jest.fn().mockReturnThis(),
            addEdge: jest.fn().mockReturnThis(),
            addConditionalEdges: jest.fn().mockReturnThis(),
            compile: jest.fn().mockReturnValue(mockAgentInstance),
        };
        StateGraph.mockImplementation(() => mockStateGraph);
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('invokeAgent', () => {
        it('should invoke agent successfully with basic query', async () => {
            const mockResponse = new AIMessage('This is a test response');
            const mockResult = {
                messages: [new HumanMessage('Hello'), mockResponse],
            };

            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Hello',
                conversationID: 'test-conv-123',
            };

            const result = await invokeAgent(state);

            expect(result).toEqual({
                messages: mockResult.messages,
                finalResponse: 'This is a test response',
                conversationId: 'test-conv-123',
            });

            expect(mockAgentInstance.invoke).toHaveBeenCalledWith(
                {
                    messages: [new HumanMessage('Hello')],
                    userQuery: 'Hello',
                    fileId: undefined,
                    conversationID: 'test-conv-123',
                },
                {
                    configurable: {
                        thread_id: 'test-conv-123',
                        projectId: 'test-project-id',
                    },
                    recursionLimit: 5,
                },
            );
        });

        it('should handle document queries with fileId', async () => {
            const mockResponse = new AIMessage('Document-based response');
            const mockResult = {
                messages: [new HumanMessage('[Using document: doc-123] What is this about?'), mockResponse],
            };

            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'What is this about?',
                conversationID: 'test-conv-456',
                fileId: 'doc-123',
            };

            const result = await invokeAgent(state);

            expect(result).toEqual({
                messages: mockResult.messages,
                finalResponse: 'Document-based response',
                conversationId: 'test-conv-456',
            });

            expect(mockAgentInstance.invoke).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [new HumanMessage('[Using document: doc-123] What is this about?')],
                    userQuery: 'What is this about?',
                    fileId: 'doc-123',
                    conversationID: 'test-conv-456',
                }),
                expect.any(Object),
            );
        });

        it('should initialize LLM with correct configuration', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            await invokeAgent(state);

            expect(ChatOpenAI).toHaveBeenCalledWith({
                model: 'gpt-4.1-mini',
                temperature: 0.1,
                apiKey: 'test-api-key',
                maxTokens: 1000,
                configuration: {
                    projectId: 'test-project-id',
                },
            });

            expect(mockLLMInstance.bindTools).toHaveBeenCalledWith(mockTools);
        });

        it('should use correct system prompt', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            await invokeAgent(state);

            expect(getPrompt).toHaveBeenCalledWith(Prompts.UNIVERSAL_KNOWLEDGE);
        });

        it('should handle agent invocation errors', async () => {
            const error = new Error('Agent failed');
            mockAgentInstance.invoke.mockRejectedValue(error);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            await expect(invokeAgent(state)).rejects.toThrow('Agent failed');
        });

        it('should handle empty messages array', async () => {
            const mockResult = {
                messages: [],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            const result = await invokeAgent(state);

            expect(result.finalResponse).toBeUndefined();
            expect(result.messages).toEqual([]);
        });

        it('should handle multiple messages in conversation', async () => {
            const mockMessages = [
                new HumanMessage('First question'),
                new AIMessage('First response'),
                new HumanMessage('Second question'),
                new AIMessage('Final response'),
            ];
            const mockResult = { messages: mockMessages };

            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Second question',
                conversationID: 'test-conv',
            };

            const result = await invokeAgent(state);

            expect(result.finalResponse).toBe('Final response');
            expect(result.messages).toEqual(mockMessages);
        });

        it('should set correct recursion limit', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            await invokeAgent(state);

            expect(mockAgentInstance.invoke).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    recursionLimit: 5,
                }),
            );
        });

        it('should handle null fileId gracefully', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
                fileId: null,
            };

            const result = await invokeAgent(state);

            expect(mockAgentInstance.invoke).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [new HumanMessage('Test query')],
                    fileId: null,
                }),
                expect.any(Object),
            );
        });

        it('should pass through conversation thread ID correctly', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const conversationId = 'very-specific-thread-id-12345';
            const state = {
                userQuery: 'Test query',
                conversationID: conversationId,
            };

            await invokeAgent(state);

            expect(mockAgentInstance.invoke).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    configurable: expect.objectContaining({
                        thread_id: conversationId,
                    }),
                }),
            );
        });
    });

    describe('Agent Configuration', () => {
        it('should create StateGraph with correct configuration', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            await invokeAgent(state);

            expect(StateGraph).toHaveBeenCalled();
        });

        it('should handle missing OpenAI configuration', async () => {
            // Remove OpenAI config
            config.openai = {};

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            // Should not throw, but might produce different behavior
            await expect(invokeAgent(state)).resolves.toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle LLM initialization errors', async () => {
            ChatOpenAI.mockImplementation(() => {
                throw new Error('Failed to initialize LLM');
            });

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            await expect(invokeAgent(state)).rejects.toThrow('Failed to initialize LLM');
        });

        it('should handle StateGraph compilation errors', async () => {
            const mockStateGraph = {
                addNode: jest.fn().mockReturnThis(),
                addEdge: jest.fn().mockReturnThis(),
                addConditionalEdges: jest.fn().mockReturnThis(),
                compile: jest.fn().mockImplementation(() => {
                    throw new Error('Failed to compile graph');
                }),
            };
            StateGraph.mockImplementation(() => mockStateGraph);

            const state = {
                userQuery: 'Test query',
                conversationID: 'test-conv',
            };

            await expect(invokeAgent(state)).rejects.toThrow('Failed to compile graph');
        });

        it('should handle malformed state input', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            // Test with missing required fields
            const state = {};

            const result = await invokeAgent(state);

            expect(mockAgentInstance.invoke).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [new HumanMessage('undefined')],
                    userQuery: undefined,
                    conversationID: undefined,
                }),
                expect.any(Object),
            );
        });
    });

    describe('Performance and Caching', () => {
        it('should reuse LLM instance across multiple calls', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state1 = {
                userQuery: 'First query',
                conversationID: 'conv-1',
            };

            const state2 = {
                userQuery: 'Second query',
                conversationID: 'conv-2',
            };

            await invokeAgent(state1);
            await invokeAgent(state2);

            // ChatOpenAI constructor should only be called once due to lazy loading
            expect(ChatOpenAI).toHaveBeenCalledTimes(1);
        });

        it('should reuse agent instance across multiple calls', async () => {
            const mockResult = {
                messages: [new AIMessage('Response')],
            };
            mockAgentInstance.invoke.mockResolvedValue(mockResult);

            const state1 = {
                userQuery: 'First query',
                conversationID: 'conv-1',
            };

            const state2 = {
                userQuery: 'Second query',
                conversationID: 'conv-2',
            };

            await invokeAgent(state1);
            await invokeAgent(state2);

            // StateGraph should only be instantiated once due to lazy loading
            expect(StateGraph).toHaveBeenCalledTimes(1);
        });
    });
});
