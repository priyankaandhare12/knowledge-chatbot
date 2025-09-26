import { setContextVariable } from '@langchain/core/context';
import { HumanMessage, isAIMessage, SystemMessage } from '@langchain/core/messages';
import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { config } from '../../config/environment.js';
import { getPrompt, Prompts } from '../prompts/index.js';
import { webSearchTool } from '../tools/web-search/WebSearchTool.js';
import { CHAT_LIMITS } from '../utils/constants.js';

// Lazy initialization - these will be created when first needed
let llm = null;
let agent = null;
const tools = [webSearchTool];
const toolNode = new ToolNode(tools);

const stateSchema = Annotation.Root({
    messages: Annotation({
        reducer: messagesStateReducer,
    }),
});

// Function to initialize the LLM (lazy loading)
function initializeLLM() {
    if (!llm) {
        llm = new ChatOpenAI({
            model: 'gpt-4',
            temperature: 0.1,
            apiKey: config.openai.apiKey,
            maxTokens: CHAT_LIMITS.MAX_MESSAGE_LENGTH,
            configuration: {
                projectId: config.openai.projectId,
            },
            timeout: CHAT_LIMITS.TIMEOUT,
            maxRetries: CHAT_LIMITS.MAX_RETRIES,
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
 * @returns {Promise<Object>} The agent's response
 */
export async function invokeAgent(state) {
    const agentInstance = initializeAgent();

    const result = await agentInstance.invoke(
        {
            messages: [new HumanMessage(state.userQuery)],
        },
        {
            configurable: {
                thread_id: state.conversationID,
                projectId: config.openai.projectId,
            },
            recursionLimit: 5,
            runName: 'Universal Knowledge Agent',
        },
    );

    return {
        messages: result.messages,
        finalResponse: result.messages[result.messages.length - 1].content,
        conversationId: state.conversationID,
    };
}
