import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import logger from '../utils/logger.js';
import { invokeUniversalAgent } from '../agents/index.js';

// Simple state schema - only what we need
const WorkflowState = Annotation.Root({
    userQuery: Annotation({
        default: () => '',
    }),
    messages: Annotation({
        reducer: messagesStateReducer,
    }),
    finalResponse: Annotation({
        reducer: (state, update) => update ?? state,
        default: () => '',
    }),
    conversationID: Annotation({
        reducer: (state, update) => update ?? state,
        default: () => '',
    }),
});

// Universal knowledge node - handles web search
const universalNode = async (state) => {
    logger.info(`Executing universal knowledge node with query: "${state.userQuery}"`);

    const result = await invokeUniversalAgent(state);

    return {
        messages: result.messages,
        finalResponse: result.finalResponse,
        conversationID: result.conversationId,
    };
};

// Create the workflow graph - simple linear flow
const graph = new StateGraph(WorkflowState)
    .addNode('universal', universalNode)
    .addEdge(START, 'universal')
    .addEdge('universal', END);

// Compile the workflow
const compiledWorkflow = graph.compile();

export { compiledWorkflow };