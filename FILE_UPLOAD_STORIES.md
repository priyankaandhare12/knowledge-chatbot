# File Upload Feature Implementation Stories

## 🎯 Overview
Add document Q&A capability to our Universal Knowledge Chatbot while maintaining the current web search functionality. The LLM agent will intelligently choose between web search and document search based on the query and context.

## 📋 Implementation Stories

### **Story 1: Create File Upload and Processing**
**Priority:** High | **Status:** Ready  
**Estimated Time:** 2-3 hours

#### **Acceptance Criteria:**
- [ ] Create file upload endpoint
- [ ] Process PDF/text files into chunks
- [ ] Generate embeddings for chunks
- [ ] Store in Pinecone with fileId
- [ ] Return fileId to user

#### **Technical Tasks:**
1. Add file upload endpoint `/api/upload`
2. Implement PDF text extraction
3. Create text chunking logic
4. Setup Pinecone connection
5. Store embeddings with metadata

#### **Files to Create/Modify:**
- `server/app/controllers/upload-controller.js` (NEW)
- `server/app/services/file-processor.js` (NEW)
- `server/config/environment.js` (MODIFY - add Pinecone config)

---

### **Story 2: Create Document QA Tool**
**Priority:** High | **Status:** Blocked by Story 1  
**Estimated Time:** 2-3 hours

#### **Acceptance Criteria:**
- [ ] Create DocumentQATool similar to WebSearchTool
- [ ] Implement vector similarity search
- [ ] Return relevant document chunks
- [ ] Include source/context information

#### **Technical Tasks:**
1. Create `DocumentQATool.js`
2. Implement Pinecone query logic
3. Add tool to registry
4. Add proper error handling

#### **Files to Create/Modify:**
- `server/app/tools/document-qa/DocumentQATool.js` (NEW)
- `server/app/tools/registry.js` (MODIFY)

---

### **Story 3: Update Universal Agent**
**Priority:** High | **Status:** Blocked by Story 2  
**Estimated Time:** 2 hours

#### **Acceptance Criteria:**
- [ ] Agent can handle fileId in context
- [ ] Smart tool selection logic
- [ ] Can combine information from both tools if needed
- [ ] Maintains conversation context

#### **Technical Tasks:**
1. Update agent state to include fileId
2. Add tool selection logic
3. Update response formatting
4. Handle tool-specific errors

#### **Files to Create/Modify:**
- `server/app/agents/universal-agent.js` (MODIFY)
- `server/app/prompts/universal/universal-knowledge-prompt.md` (MODIFY)

---

### **Story 4: Update Chat API**
**Priority:** High | **Status:** Blocked by Story 3  
**Estimated Time:** 1-2 hours

#### **Acceptance Criteria:**
- [ ] Chat endpoint accepts optional fileId
- [ ] Proper error handling for invalid fileIds
- [ ] Clear response format for document sources
- [ ] Maintain backward compatibility

#### **Technical Tasks:**
1. Update chat endpoint to handle fileId
2. Add fileId validation
3. Update response formatting
4. Update error handling

#### **Files to Create/Modify:**
- `server/app/controllers/chat-controller.js` (MODIFY)
- `server/app/validators/chat-validation.js` (MODIFY)

---

### **Story 5: Basic File Management**
**Priority:** Medium | **Status:** Blocked by Story 1  
**Estimated Time:** 2 hours

#### **Acceptance Criteria:**
- [ ] List uploaded files
- [ ] Delete file endpoint
- [ ] Basic file metadata storage
- [ ] Error handling for missing files

#### **Technical Tasks:**
1. Create file listing endpoint
2. Create file deletion endpoint
3. Implement metadata storage
4. Add cleanup for Pinecone data

#### **Files to Create/Modify:**
- `server/app/controllers/file-controller.js` (NEW)
- `server/routes/api/index.js` (MODIFY)

---

## 📝 Dependencies Between Stories:
- Story 1 → Story 2 → Story 3 → Story 4
- Story 5 can be done in parallel after Story 1

## 🔑 Key Technical Decisions:
1. Use Pinecone for vector storage
2. Keep existing web search capability
3. Single chat endpoint with smart routing
4. Simple file upload and management

## 📊 Success Metrics:
- [ ] File upload and processing works
- [ ] Agent correctly chooses between tools
- [ ] Document Q&A provides accurate answers
- [ ] Web search still works as before
- [ ] Clear source attribution in responses

## 🚀 Getting Started:
1. Start with Story 1 (File Upload)
2. Test thoroughly before moving to Story 2
3. Keep changes modular and focused
4. Maintain existing functionality
