# Universal Knowledge Chatbot - Implementation Stories

## 🎯 Project Overview
Transform the current smart dealer inventory chatbot into a Universal Knowledge Chatbot that can handle multiple data sources using LangGraph architecture, starting with web search as the first tool.

---

## 📋 Implementation Stories

### **Story 1: Create Web Search Tool for LangGraph** 
**Priority:** High | **Status:** Ready  
**Estimated Time:** 2-3 hours

#### **Acceptance Criteria:**
- [ ] Extract Tavily search functionality from `powersports-agent.js`
- [ ] Create a new `WebSearchTool.js` in `/server/app/tools/web-search/`
- [ ] Implement tool using LangChain tool interface
- [ ] Add proper error handling and response formatting
- [ ] Update tool registry to include web search tool
- [ ] Test tool independently

#### **Technical Tasks:**
1. Create `/server/app/tools/web-search/WebSearchTool.js`
2. Define Zod schema for web search parameters (query, maxResults, searchDepth)
3. Implement search function using Tavily API
4. Add comprehensive error handling
5. Update `/server/app/tools/registry.js` to include web search tool
6. Create unit tests for the web search tool

#### **Files to Create/Modify:**
- `server/app/tools/web-search/WebSearchTool.js` (NEW)
- `server/app/tools/registry.js` (MODIFY)

---

### **Story 2: Update Prompts for Universal Knowledge Chatbot**
**Priority:** High | **Status:** Ready  
**Estimated Time:** 2-3 hours

#### **Acceptance Criteria:**
- [ ] Replace inventory-specific prompts with universal knowledge prompts
- [ ] Create new prompt for universal knowledge agent
- [ ] Update prompt system to support web search and future knowledge sources
- [ ] Remove inventory/powersports specific instructions
- [ ] Add proper instructions for web search tool usage

#### **Technical Tasks:**
1. Create `/server/app/prompts/universal/universal-knowledge-prompt.md`
2. Update prompt to handle web search queries effectively
3. Remove inventory-specific instructions and examples
4. Add instructions for using web search tool
5. Update `/server/app/prompts/index.js` to include universal prompt
6. Create system prompt that's extensible for future knowledge sources
7. Test prompt effectiveness with sample queries

#### **Files to Create/Modify:**
- `server/app/prompts/universal/universal-knowledge-prompt.md` (NEW)
- `server/app/prompts/index.js` (MODIFY)

---

### **Story 3: Create Universal Knowledge Agent**
**Priority:** High | **Status:** Blocked by Stories 1 & 2  
**Estimated Time:** 3-4 hours

#### **Acceptance Criteria:**
- [ ] Create a new universal knowledge agent that replaces inventory-specific logic
- [ ] Agent should use web search tool as primary capability
- [ ] Implement proper conversation context management
- [ ] Add intent detection for different knowledge sources
- [ ] Agent should be extensible for future tools

#### **Technical Tasks:**
1. Create `/server/app/agents/universal-agent.js`
2. Implement agent with web search tool integration
3. Create prompt templates for universal knowledge queries
4. Add comprehensive logging and tracing

#### **Files to Create/Modify:**
- `server/app/agents/universal-agent.js` (NEW)
- `server/app/prompts/universal-prompt.md` (NEW)
- `server/app/prompts/index.js` (MODIFY)

---

### **Story 4: Update LangGraph Workflow for Universal Knowledge**
**Priority:** High | **Status:** Blocked by Story 3  
**Estimated Time:** 4-5 hours

#### **Acceptance Criteria:**
- [ ] Modify existing workflow to support universal knowledge architecture
- [ ] Replace inventory-specific routing with generic knowledge source routing
- [ ] Add web search node as primary knowledge source
- [ ] Implement router logic for future knowledge sources
- [ ] Maintain conversation state and context across nodes

#### **Technical Tasks:**
1. Update `/server/app/workflows/workflow.js`
2. Replace inventory agent node with universal knowledge node
3. Update router logic for knowledge source detection
4. Add web search node implementation
5. Update state management for universal context
6. Add conditional routing for future knowledge sources (files, databases)
7. Implement proper error handling and fallbacks

#### **Files to Create/Modify:**
- `server/app/workflows/workflow.js` (MAJOR REFACTOR)

---

### **Story 5: Implement SSO Authentication Endpoint**
**Priority:** Medium | **Status:** Ready  
**Estimated Time:** 2 hours

#### **Acceptance Criteria:**
- [ ] Create `/api/auth/sso` endpoint
- [ ] Endpoint allows all users for now (placeholder implementation)
- [ ] Proper middleware structure for future SSO integration
- [ ] Return appropriate JWT tokens or session data

#### **Technical Tasks:**
1. Create `/server/app/controllers/auth-controller.js`
2. Implement placeholder SSO endpoint that accepts all users
3. Update `/server/app/middleware/auth.js` with proper structure
4. Add JWT token generation (placeholder)
5. Update API routes to include auth endpoints

#### **Files to Create/Modify:**
- `server/app/controllers/auth-controller.js` (NEW)
- `server/app/middleware/auth.js` (MODIFY)
- `server/routes/api/index.js` (MODIFY)

---

### **Story 6: Update Chat Controller for Universal Knowledge**
**Priority:** Medium | **Status:** Blocked by Story 4  
**Estimated Time:** 2-3 hours

#### **Acceptance Criteria:**
- [ ] Refactor chat controller to use universal knowledge workflow
- [ ] Remove inventory-specific logic and endpoints
- [ ] Maintain proper response formatting
- [ ] Add support for different knowledge source responses
- [ ] Implement proper error handling

#### **Technical Tasks:**
1. Refactor `/server/app/controllers/chat-controller.js`
2. Remove inventory-specific endpoints (`sendMessage` inventory logic)
3. Update `webSearch` to use universal workflow
4. Implement generic `sendMessage` for universal knowledge
5. Add response formatting for different knowledge sources
6. Update error handling and logging

#### **Files to Create/Modify:**
- `server/app/controllers/chat-controller.js` (MAJOR REFACTOR)

---

### **Story 7: Update API Routes and Remove Inventory Dependencies**
**Priority:** Medium | **Status:** Blocked by Story 6  
**Estimated Time:** 2 hours

#### **Acceptance Criteria:**
- [ ] Update API routes to reflect universal knowledge chatbot
- [ ] Remove inventory-specific routes
- [ ] Add SSO authentication routes
- [ ] Maintain clean API structure
- [ ] Update route documentation

#### **Technical Tasks:**
1. Update `/server/routes/api/index.js`
2. Remove inventory-specific routes
3. Add authentication routes
4. Update route structure for universal knowledge
5. Add proper middleware application
6. Update API documentation

#### **Files to Create/Modify:**
- `server/routes/api/index.js` (MODIFY)
- Remove inventory-specific route files if any

---

### **Story 8: Cleanup and Project Structure Updates**
**Priority:** Low | **Status:** Blocked by Story 7  
**Estimated Time:** 3-4 hours

#### **Acceptance Criteria:**
- [ ] Remove unnecessary inventory-specific files
- [ ] Update package.json metadata
- [ ] Clean up unused dependencies
- [ ] Update project documentation
- [ ] Organize file structure for universal knowledge architecture

#### **Technical Tasks:**
1. Remove unused inventory agent files
2. Remove inventory-specific tools and helpers
3. Update `package.json` name, description, and keywords
4. Clean up unused dependencies
5. Update README.md for universal knowledge chatbot
6. Reorganize file structure if needed
7. Update environment configuration

#### **Files to Create/Modify:**
- `package.json` (MODIFY)
- `README.md` (MODIFY)
- Various cleanup tasks

---

### **Story 9: Testing and Validation**
**Priority:** High | **Status:** Blocked by Story 8  
**Estimated Time:** 4-5 hours

#### **Acceptance Criteria:**
- [ ] Create comprehensive tests for web search functionality
- [ ] Test universal knowledge workflow end-to-end
- [ ] Validate SSO endpoint functionality
- [ ] Test error handling and edge cases
- [ ] Performance testing for web search queries

#### **Technical Tasks:**
1. Create unit tests for web search tool
2. Create integration tests for universal workflow
3. Test SSO endpoint functionality
4. Create end-to-end API tests
5. Test error handling scenarios
6. Performance and load testing
7. Documentation of test coverage

#### **Files to Create/Modify:**
- `server/tests/unit/web-search-tool.test.js` (NEW)
- `server/tests/integration/universal-workflow.test.js` (NEW)
- `server/tests/api/auth.test.js` (NEW)

---

## 🚀 Future Enhancement Stories (Post-MVP)

### **Story 10: File Processing Knowledge Source**
**Priority:** Future | **Status:** Blocked by Story 9  
- Add PDF and document processing capabilities
- Implement file upload and indexing
- Create file processing tools and agents

### **Story 11: Database Query Knowledge Source**
**Priority:** Future | **Status:** Blocked by Story 9  
- Add database connection and query capabilities
- Implement natural language to SQL translation
- Create database tools and agents

### **Story 12: Advanced SSO Integration**
**Priority:** Future | **Status:** Blocked by Story 5  
- Implement real SSO with identity providers
- Add role-based access control
- Implement proper session management

---

## 📝 Notes

### **Dependencies Between Stories:**
- Story 1 → Story 2 → Story 3 → Story 4 → Story 6 → Story 7 → Story 8 → Story 9
- Story 5 (SSO) can be done in parallel with Stories 1-4

### **Key Technical Decisions:**
1. Keep LangGraph architecture but make it universal
2. Start with web search as first knowledge source
3. Maintain tool registry pattern for extensibility
4. Use placeholder SSO for immediate development needs

### **Success Metrics:**
- [ ] Web search queries work through LangGraph workflow
- [ ] SSO endpoint is functional (placeholder)
- [ ] Clean, extensible architecture for future knowledge sources
- [ ] All inventory-specific code removed
- [ ] Comprehensive test coverage

---

## 🎯 Getting Started

**Recommended Implementation Order:**
1. Start with Story 1 (Web Search Tool)
2. Implement Story 4 (SSO) in parallel
3. Continue with Stories 2, 3, 5, 6 in sequence
4. Finish with Stories 7 and 8

**Ready to begin with Story 1?** Let me know when you want to start implementing the Web Search Tool!
