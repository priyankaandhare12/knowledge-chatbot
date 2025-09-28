import { setContextVariable } from '@langchain/core/context';
import { HumanMessage, isAIMessage, SystemMessage } from '@langchain/core/messages';
import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { config } from '../../config/environment.js';
import { getPrompt, Prompts } from '../prompts/index.js';
import { tools } from '../tools/registry.js';
import logger from '../utils/logger.js';

// Lazy initialization - these will be created when first needed
let llm = null;
let agent = null;
const toolNode = new ToolNode(tools);

// Define state schema with fileId support
const stateSchema = Annotation.Root({
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
});

// Function to initialize the LLM (lazy loading)
function initializeLLM() {
    if (!llm) {
        llm = new ChatOpenAI({
            model: 'gpt-4.1-mini',
            temperature: 0.1,
            apiKey: config.openai.apiKey,
            maxTokens: 1000,
            configuration: {
                projectId: config.openai.projectId,
            },
        }).bindTools(tools);
    }
    return llm;
}

// Define model node
async function llmCall(state) {
    const llmInstance = initializeLLM();
    const response = await llmInstance.invoke([
        new SystemMessage(getPrompt(Prompts.UNIVERSAL_KNOWLEDGE)),
        ...state.messages,
    ]);
    return {
        messages: response,
    };
}

// Define logic to determine whether to end
async function shouldContinue(state) {
    const lastMessage = state.messages.at(-1);
    if (lastMessage == null || !isAIMessage(lastMessage)) return END;

    // If the LLM makes a tool call, then perform an action
    if (lastMessage.tool_calls?.length) {
        return 'tools';
    }

    // Otherwise, we stop (reply to the user)
    return END;
}

function initializeAgent() {
    if (!agent) {
        agent = new StateGraph(stateSchema)
            .addNode('agent', llmCall)
            .addNode('tools', toolNode)
            .addEdge(START, 'agent')
            .addConditionalEdges('agent', shouldContinue, ['tools', END])
            .addEdge('tools', 'agent')
            .compile();
    }
    return agent;
}

/**
 * Invokes the universal knowledge agent
 * @param {Object} state - The state object containing user query and metadata
 * @param {string} state.userQuery - The user's question
 * @param {string} state.conversationID - Conversation identifier
 * @param {string} [state.fileId] - Optional file ID for document queries
 * @returns {Promise<Object>} The agent's response
 */
export async function invokeAgent(state) {
    const agentInstance = initializeAgent();

    // Create the initial message with fileId context if provided
    const userMessage = state.fileId
        ? `[Using document: ${state.fileId}] ${state.userQuery}`
        : state.userQuery;

    const result = await agentInstance.invoke(
        {
            messages: [new HumanMessage(userMessage)],
            userQuery: state.userQuery,
            fileId: state.fileId,
            conversationID: state.conversationID,
        },
        {
            configurable: {
                thread_id: state.conversationID,
                projectId: config.openai.projectId,
            },
            recursionLimit: 5,
        },
    );

    return {
        messages: result.messages,
        finalResponse: result.messages[result.messages.length - 1].content,
        conversationId: state.conversationID,
    };
}