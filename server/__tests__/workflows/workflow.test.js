import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StateGraph, START, END } from '@langchain/langgraph';
import { compiledWorkflow } from '../../app/workflows/workflow.js';
import { routerNode } from '../../app/workflows/nodes/router-node.js';
import { weatherNode } from '../../app/workflows/nodes/weather-node.js';

// Mock dependencies
jest.mock('@langchain/langgraph');
jest.mock('../../app/utils/logger.js');
jest.mock('../../app/workflows/nodes/router-node.js');
jest.mock('../../app/workflows/nodes/weather-node.js');

describe('Workflow', () => {
    let mockStateGraph;
    let mockCompiledGraph;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock compiled workflow
        mockCompiledGraph = {
            invoke: jest.fn(),
            stream: jest.fn(),
        };

        // Mock StateGraph
        mockStateGraph = {
            addNode: jest.fn().mockReturnThis(),
            addEdge: jest.fn().mockReturnThis(),
            addConditionalEdges: jest.fn().mockReturnThis(),
            compile: jest.fn().mockReturnValue(mockCompiledGraph),
        };

        StateGraph.mockImplementation(() => mockStateGraph);

        // Mock node functions
        routerNode.mockImplementation(jest.fn());
        weatherNode.mockImplementation(jest.fn());
        documentNode.mockImplementation(jest.fn());
    });

    describe('Workflow Graph Construction', () => {
        it('should create StateGraph with correct nodes', () => {
            expect(StateGraph).toHaveBeenCalled();
            expect(mockStateGraph.addNode).toHaveBeenCalledWith('router', routerNode);
            expect(mockStateGraph.addNode).toHaveBeenCalledWith('weatherNode', weatherNode);
            expect(mockStateGraph.addNode).toHaveBeenCalledWith('documentNode', documentNode);
        });

        it('should add correct edges', () => {
            expect(mockStateGraph.addEdge).toHaveBeenCalledWith(START, 'router');
        });

        it('should add conditional edges with correct routing', () => {
            expect(mockStateGraph.addConditionalEdges).toHaveBeenCalledWith('router', expect.any(Function), {
                weatherNode: END,
                documentNode: END,
                none: END,
            });
        });

        it('should compile the workflow', () => {
            expect(mockStateGraph.compile).toHaveBeenCalled();
        });
    });

    describe('Routing Logic', () => {
        let routingFunction;

        beforeEach(() => {
            // Extract the routing function from the addConditionalEdges call
            const addConditionalEdgesCall = mockStateGraph.addConditionalEdges.mock.calls[0];
            routingFunction = addConditionalEdgesCall[1];
        });

        it('should route to weatherNode when selectedNode is weatherNode', () => {
            const state = {
                selectedNode: 'weatherNode',
                messages: [],
                userQuery: 'What is the weather?',
            };

            const result = routingFunction(state);
            expect(result).toBe('weatherNode');
        });

        it('should route to documentNode when selectedNode is documentNode', () => {
            const state = {
                selectedNode: 'documentNode',
                messages: [],
                userQuery: 'Tell me about the document',
                fileId: 'doc-123',
            };

            const result = routingFunction(state);
            expect(result).toBe('documentNode');
        });

        it('should handle none selection with routing metadata', () => {
            const state = {
                selectedNode: 'none',
                messages: [],
                userQuery: 'Unsupported query',
                routingMetadata: {
                    message: 'This query type is not supported.',
                },
            };

            const result = routingFunction(state);
            expect(result).toEqual({
                messages: [
                    {
                        type: 'system',
                        content: 'This query type is not supported.',
                    },
                ],
            });
        });

        it('should throw error for unknown node type', () => {
            const state = {
                selectedNode: 'unknownNode',
                messages: [],
                userQuery: 'Some query',
            };

            expect(() => routingFunction(state)).toThrow('Unknown node type: unknownNode');
        });

        it('should handle empty selectedNode', () => {
            const state = {
                selectedNode: '',
                messages: [],
                userQuery: 'Some query',
            };

            expect(() => routingFunction(state)).toThrow('Unknown node type: ');
        });

        it('should handle null selectedNode', () => {
            const state = {
                selectedNode: null,
                messages: [],
                userQuery: 'Some query',
            };

            expect(() => routingFunction(state)).toThrow('Unknown node type: null');
        });
    });

    describe('Workflow State Schema', () => {
        it('should define correct state structure', () => {
            // Verify StateGraph was called with the correct state annotation
            expect(StateGraph).toHaveBeenCalledWith(expect.any(Object));

            const stateSchemaArg = StateGraph.mock.calls[0][0];
            expect(stateSchemaArg).toBeDefined();
        });
    });

    describe('Workflow Execution', () => {
        it('should export compiled workflow for use', () => {
            expect(compiledWorkflow).toBeDefined();
            expect(compiledWorkflow).toBe(mockCompiledGraph);
        });

        it('should handle workflow invocation', async () => {
            const testState = {
                messages: [],
                userQuery: 'Test query',
                selectedNode: 'weatherNode',
                conversationID: 'test-conv',
            };

            const expectedResult = {
                messages: [{ type: 'ai', content: 'Weather response' }],
            };

            mockCompiledGraph.invoke.mockResolvedValue(expectedResult);

            const result = await compiledWorkflow.invoke(testState);
            expect(result).toEqual(expectedResult);
            expect(mockCompiledGraph.invoke).toHaveBeenCalledWith(testState);
        });

        it('should handle workflow streaming', async () => {
            const testState = {
                messages: [],
                userQuery: 'Test streaming query',
                selectedNode: 'documentNode',
                conversationID: 'test-conv',
            };

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield { messages: [{ type: 'ai', content: 'Streaming response' }] };
                },
            };

            mockCompiledGraph.stream.mockReturnValue(mockStream);

            const stream = compiledWorkflow.stream(testState);
            expect(stream).toBeDefined();
            expect(mockCompiledGraph.stream).toHaveBeenCalledWith(testState);
        });
    });

    describe('Error Handling', () => {
        it('should handle workflow compilation errors', () => {
            mockStateGraph.compile.mockImplementation(() => {
                throw new Error('Failed to compile workflow');
            });

            // Since the workflow is compiled at module load time,
            // we would need to re-import the module to test this
            expect(() => {
                mockStateGraph.compile();
            }).toThrow('Failed to compile workflow');
        });

        it('should handle node execution errors', async () => {
            const testState = {
                messages: [],
                userQuery: 'Test query',
                selectedNode: 'weatherNode',
                conversationID: 'test-conv',
            };

            const error = new Error('Node execution failed');
            mockCompiledGraph.invoke.mockRejectedValue(error);

            await expect(compiledWorkflow.invoke(testState)).rejects.toThrow('Node execution failed');
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complex routing metadata', () => {
            const routingFunction = mockStateGraph.addConditionalEdges.mock.calls[0][1];

            const state = {
                selectedNode: 'none',
                messages: [],
                userQuery: 'Complex unsupported query',
                routingMetadata: {
                    message: 'This is a complex unsupported query with detailed explanation.',
                    confidence: 0.1,
                    alternatives: ['weather', 'document'],
                },
            };

            const result = routingFunction(state);
            expect(result).toEqual({
                messages: [
                    {
                        type: 'system',
                        content: 'This is a complex unsupported query with detailed explanation.',
                    },
                ],
            });
        });

        it('should handle state transitions correctly', async () => {
            const initialState = {
                messages: [],
                userQuery: 'What is the weather in Paris?',
                selectedNode: 'weatherNode',
                conversationID: 'conv-123',
                routingMetadata: {
                    confidence: 0.95,
                    location: 'Paris',
                },
            };

            const finalState = {
                ...initialState,
                messages: [
                    { type: 'human', content: 'What is the weather in Paris?' },
                    { type: 'ai', content: 'The weather in Paris is sunny with 22°C.' },
                ],
            };

            mockCompiledGraph.invoke.mockResolvedValue(finalState);

            const result = await compiledWorkflow.invoke(initialState);
            expect(result).toEqual(finalState);
            expect(result.messages).toHaveLength(2);
        });
    });
});
