# GitHub Integration User Stories

This document outlines the user stories for integrating GitHub into the Universal Knowledge Chatbot, following the same pattern as Jira integration.

## Phase 1: Refactor Vector Storage Service for GitHub

### Story 1: Create Generic GitHub Vector Storage Service
**As a** system
**I want** to store GitHub commit and activity data in the vector database
**So that** it can be semantically searched and analyzed by the agent.

**Acceptance Criteria:**
1. Update webhook controller to handle GitHub webhook data structure
2. Extract relevant fields from GitHub webhook payload:
   - user: GitHub username
   - commits: array of commit objects (message, date, repo)
   - repo: repository name
   - commit message: commit description
   - commit date: timestamp
3. Serialize commit data into a string for embedding
4. Store the entire GitHub data object as metadata
5. Generate vector IDs as `{source}-{repo}-{timestamp}`
6. Maintain backward compatibility with other integrations

## Phase 2: GitHub Search Tool Implementation

### Story 2: Create GitHub Search Tool
**As an** AI agent
**I want** a tool to search through stored GitHub commits and activity
**So that** I can retrieve relevant project information, commit history, and user contributions.

**Acceptance Criteria:**
1. Create `GitHubSearchTool.js` following the existing tool architecture
2. The tool should accept:
   - query: search query for semantic search
   - user: optional filter for GitHub username
   - repo: optional filter for repository name
   - date: optional filter for commit date
3. Use OpenAI embeddings for semantic search
4. Query Pinecone with filters for `source: "github"`
5. Return formatted results with:
   - Commit message
   - Commit date
   - Repo name
   - User
6. Handle cases where no relevant commits are found
7. Register the tool in the central tool registry

## Phase 3: Update Universal Agent Prompt

### Story 3: Update Prompt for GitHub Knowledge
**As an** AI agent
**I want** to understand and respond to queries about GitHub commits, repositories, and user activity
**So that** I can provide accurate, context-aware answers based on GitHub data.

**Acceptance Criteria:**
1. Update the universal agent prompt to include GitHub knowledge source
2. Add instructions for when to use the `github_search` tool
3. Define response patterns for different types of GitHub queries:
   - Commit history
   - User contributions
   - Repository changes
   - Project activity
4. Ensure the agent can synthesize insights from multiple related commits
5. Maintain professional tone while providing technical project information

## Phase 4: End-to-End Testing and Documentation

### Story 4: End-to-End Testing
**As a** developer
**I want** to test the complete GitHub integration flow
**So that** I can ensure the system works correctly from webhook to agent response.

**Acceptance Criteria:**
1. Test GitHub webhook → API → vector storage flow
2. Verify GitHub commits are properly stored in Pinecone with correct metadata
3. Test GitHub search tool with various query types
4. Verify agent can answer questions about GitHub commits and activity
5. Test error handling for malformed webhook data
6. Performance test with high-volume GitHub events

### Story 5: Documentation and Monitoring
**As a** system administrator
**I want** comprehensive documentation and monitoring for the GitHub integration
**So that** I can maintain and troubleshoot the system effectively.

**Acceptance Criteria:**
1. Document GitHub webhook configuration steps
2. Create troubleshooting guide for common issues
3. Add monitoring for webhook delivery rates
4. Set up alerts for failed webhook processing
5. Document metadata schema for GitHub messages
6. Create examples of common GitHub queries and expected responses

## Technical Implementation Notes

### Vector Storage Schema
```javascript
{
  id: "github-{repo}-{timestamp}",
  values: [embedding],
  metadata: {
    source: "github",
    user: "username",
    repo: "Chatbot Backend",
    commits: [
      { message: "commit message", date: "timestamp", repo: "repo name" },
      // ...more commits
    ],
    timestamp: "2025-09-28T08:49:00Z"
  }
}
```

### GitHub Webhook Payload Mapping
```javascript
{
  Data: {
    user: "username",
    commits: [
      { message: "commit message", date: "timestamp", repo: "repo name" },
      // ...more commits
    ]
  },
  Source: "github"
}
```

### GitHub Data Ingestion Example

To avoid storing too much data at once, ingest GitHub commits one by one:

```javascript
for (const userCommits of githubData.data) {
  for (const commit of userCommits.commits) {
    await storeMessage({
      text: commit.message,
      source: "github",
      channel: userCommits.user,  // or repo name
      metadata: {
        author: userCommits.user,
        date: commit.date,
        repo: commit.repo,
      },
    });
  }
}
```

- This approach ensures each commit is stored as a separate vector.
- Prevents overloading Pinecone with large batch inserts.
- Metadata includes author, date, and repo for each commit.
