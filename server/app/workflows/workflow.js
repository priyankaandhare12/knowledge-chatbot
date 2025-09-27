import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import logger from '../utils/logger.js';
import { routerNode } from './nodes/router-node.js';
import { weatherNode } from './nodes/weather-node.js';
import { documentNode } from './nodes/document-node.js';

// Define state schema
const WorkflowState = Annotation.Root({
    messages: Annotation({
        reducer: messagesStateReducer,
    }),
    userQuery: Annotation({
        default: () => '',
    }),
    fileId: Annotation({
        default: () => null,
    }),
    conversationID: Annotation({
        reducer: (state, update) => update ?? state,
        default: () => '',
    }),
    selectedNode: Annotation({
        reducer: (state, update) => update ?? state,
        default: () => '',
    }),
    routingMetadata: Annotation({
        reducer: (state, update) => update ?? state,
        default: () => ({}),
    }),
});

// Conditional routing function
function routeToNode(state) {
    const selectedNode = state.selectedNode;
    logger.info(`Routing to node: ${selectedNode}`);

    switch (selectedNode) {
        case 'weatherNode':
            return 'weatherNode';
        case 'documentNode':
            return 'documentNode';
        case 'none':
            // Return unsupported query message
            return {
                messages: [{
                    type: 'system',
                    content: state.routingMetadata.message,
                }],
            };
        default:
            throw new Error(`Unknown node type: ${selectedNode}`);
    }
}

// Create the workflow graph
const graph = new StateGraph(WorkflowState)
    .addNode('router', routerNode)
    .addNode('weatherNode', weatherNode)
    .addNode('documentNode', documentNode);

// Define the flow
graph
    .addEdge(START, 'router')
    .addConditionalEdges('router', routeToNode, {
        weatherNode: END,
        documentNode: END,
        none: END,
    });

// Compile the workflow
const compiledWorkflow = graph.compile();

export { compiledWorkflow };