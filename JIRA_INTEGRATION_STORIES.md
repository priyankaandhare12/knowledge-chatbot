# Jira Integration User Stories

This document outlines the user stories for integrating Jira into the Universal Knowledge Chatbot, following the same pattern as Slack integration.

## Phase 1: Refactor Vector Storage Service

### Story 1: Create Generic Vector Storage Service
**As a** system
**I want** to refactor the Slack-specific vector service into a generic vector service
**So that** it can handle messages from multiple sources (Slack, Jira, etc.) with different metadata structures.

**Acceptance Criteria:**
1. Rename `slack-vector.service.js` to `vector-storage.service.js`
2. Create a generic `storeMessage` function that accepts:
   - `text`: message content
   - `source`: source application (e.g., "slack", "jira")
   - `channel`: channel/board identifier
   - `metadata`: additional source-specific metadata
3. Update the function to generate vector IDs as `{source}-{channel}-{timestamp}`
4. Maintain backward compatibility with existing Slack integration
5. Update all imports and references to use the new service

### Story 2: Update Webhook Controller for Multi-Source Support
**As a** webhook controller
**I want** to handle messages from different sources with their specific metadata structures
**So that** I can store Jira issues, comments, and updates in the vector database.

**Acceptance Criteria:**
1. Update `handleWebhookMessage` to handle Jira webhook data structure
2. Extract relevant fields from Jira webhook payload:
   - text: Data['Ticket Title'] + ' ' + Data['Ticket Description'],
   - user: Data['Assignee'] || Data['Creator'],
   - timestamp: Data['Created At'],
   - issueKey: Data['Epic'],
   - issueType: Data['Ticket Type'],
   - status: Data['Status'],
   - priority: Data['Priority'],
   - project: Data['Project Name']
3. Call the generic `storeMessage` function with appropriate parameters
4. Handle different Jira webhook event types (created, updated, commented)
5. Add proper error handling and logging for Jira-specific errors

## Phase 2: Jira Search Tool Implementation

### Story 3: Create Jira Search Tool
**As an** AI agent
**I want** a tool to search through stored Jira issues and comments
**So that** I can retrieve relevant project information and issue details to answer user queries.

**Acceptance Criteria:**
1. Create `JiraSearchTool.js` following the existing tool architecture
2. The tool should accept:
   - `query`: search query for semantic search
   - `issueKey`: optional filter for specific issue
   - `issueType`: optional filter for issue type
   - `status`: optional filter for issue status
   - `assignee`: optional filter for assignee
3. Use OpenAI embeddings for semantic search
4. Query Pinecone with filters for `source: "jira"`
5. Return formatted results with:
   - Issue key and title
   - Issue type and status
   - Assignee and reporter
   - Relevant comments or descriptions
   - Timestamps
6. Handle cases where no relevant issues are found
7. Register the tool in the central tool registry

### Story 4: Create Jira-Specific Agent Capabilities
**As an** AI agent
**I want** to understand and respond to queries about Jira issues and project management
**So that** I can provide accurate, context-aware answers based on Jira data.

**Acceptance Criteria:**
1. Update the universal agent prompt to include Jira knowledge source
2. Add instructions for when to use the `jira_search` tool
3. Define response patterns for different types of Jira queries:
   - Issue status and progress
   - Bug reports and resolutions
   - Feature requests and implementations
   - Project timeline and milestones
   - Team workload and assignments
4. Ensure the agent can synthesize insights from multiple related issues
5. Maintain professional tone while providing technical project information