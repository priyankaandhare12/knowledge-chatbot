# Knowledge Chatbot Server

A Node.js backend server for the AI Knowledge Chat application with comprehensive testing and authentication.

## 🧪 Testing & Coverage Report

### Current Test Status
- **Test Suites**: 5 passing, 14 failing (19 total)
- **Individual Tests**: 170 passing, 127 failing (297 total)
- **Success Rate**: 26.3% of test suites passing
- **Overall Coverage**: 43.02% statements, 41.54% branches

### ✅ Passing Test Suites

| Test Suite | Status | Coverage | Description |
|------------|---------|----------|-------------|
| `constants.test.js` | ✅ PASS | 100% | Application constants validation |
| `error-handler.test.js` | ✅ PASS | 92.3% | Error handling middleware |
| `auth0.service.test.js` | ✅ PASS | 100% | Auth0 authentication service |
| `auth.middleware.test.js` | ✅ PASS | 97.4% | JWT authentication middleware |
| `chat-controller.test.js` | ✅ PASS | 100% | Chat endpoint controller |

### 🔄 Test Suites Under Development

| Test Suite | Status | Main Issues | Progress |
|------------|---------|-------------|----------|
| `auth-controller.test.js` | 🔄 | JWT mocking configuration | 80% |
| `validation.test.js` | 🔄 | Express-validator mocking | 70% |
| `response.test.js` | 🔄 | HTTP-errors mocking | 75% |
| `chat-validation.test.js` | 🔄 | Body validator mocking | 65% |
| `workflow.test.js` | 🔄 | LangGraph StateGraph mocking | 50% |
| `router-node.test.js` | ✅ | Router logic testing | 100% coverage |

### 📊 Coverage Breakdown by Component

#### Controllers (45.79% coverage)
- ✅ `chat-controller.js` - 100% (fully tested)
- 🔄 `auth-controller.js` - 66.66% 
- 🔄 `file-controller.js` - 57.14%
- ❌ `upload-controller.js` - 7.69%
- ❌ `webhook-controller.js` - 6.66%

#### Middleware (57.84% coverage)
- ✅ `auth.middleware.js` - 97.43%
- ✅ `error-handler.js` - 92.30%
- 🔄 `validation.js` - 50%
- ❌ `api-key-auth.js` - 20%
- ❌ `auth.js` - 6.25%

#### Services (52.77% coverage)
- ✅ `auth0.service.js` - 100%
- ❌ `file-processor.js` - 8%
- ❌ `slack-vector.service.js` - 15.38%

#### Tools & Utilities
- ✅ `registry.js` - 100%
- ✅ `constants.js` - 100%
- 🔄 `response.js` - 66.66%
- 🔄 `logger.js` - 62.5%

#### Validators (100% coverage)
- ✅ `chat-validation.js` - 100%

#### Workflow System (45.83% coverage)
- ✅ `router-node.js` - 100%
- ❌ `weather-node.js` - 0%
- ❌ `web-search-node.js` - 0%
- 🔄 `workflow.js` - 0% (needs StateGraph mocking)

## 🎯 Test Improvement Roadmap

### Phase 1: Quick Wins (Target: 50% test suites passing)
- [ ] Fix JWT mocking in auth-controller tests
- [ ] Resolve express-validator mocking issues
- [ ] Complete HTTP-errors mock setup
- [ ] Fix async/await patterns in validation tests

### Phase 2: Integration Tests (Target: 70% test suites passing)
- [ ] Complete API route integration tests
- [ ] Fix LangGraph workflow mocking
- [ ] Add comprehensive file controller tests
- [ ] Implement upload controller testing

### Phase 3: Coverage Enhancement (Target: 80% overall coverage)
- [ ] Add webhook controller tests
- [ ] Complete service layer testing
- [ ] Add tool integration tests
- [ ] Implement comprehensive error scenario testing

## 🔧 Testing Infrastructure

### Mocking Strategies Implemented
1. **JWT Authentication**: Custom mock for jsonwebtoken default/named exports
2. **Express Validator**: Mock implementation for body(), validationResult()
3. **HTTP Errors**: Custom createError mock with proper error structure
4. **Auth0 Service**: Complete mock with token exchange and user info
5. **LangChain Tools**: Comprehensive mocking for AI workflow components

### Test Patterns Established
- ES Module mocking with proper default/named export handling
- Async handler testing with Express middleware
- Authentication middleware integration testing
- Error handling and validation testing
- Service layer unit and integration testing

### Known Testing Challenges
1. **LangGraph StateGraph**: Complex workflow mocking requiring specialized setup
2. **ES Module Imports**: Default vs named export mocking inconsistencies
3. **Express Integration**: Middleware chain and request/response mocking
4. **Async Patterns**: Proper handling of async/await in test scenarios

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test __tests__/controllers/chat-controller.test.js

# Run with coverage
npm test -- --coverage

# Run with verbose output
npm test -- --verbose

# Run with timeout for slow tests
npm test -- --testTimeout=10000
```

## 📈 Coverage Goals

| Metric | Current | Target | Status |
|---------|---------|--------|--------|
| Test Suites Passing | 26.3% | 50% | 🔄 In Progress |
| Statement Coverage | 43.02% | 70% | 🔄 In Progress |
| Branch Coverage | 41.54% | 70% | 🔄 In Progress |
| Function Coverage | 35.96% | 70% | 🔄 In Progress |

## 🏗 Architecture & Components

### Core Components
- **Authentication**: Auth0 integration with JWT tokens
- **Chat System**: LangChain-based conversational AI
- **File Processing**: Document upload and processing
- **Workflow Engine**: LangGraph-based AI workflows
- **Vector Search**: Pinecone integration for semantic search

### API Endpoints
- `POST /api/chat` - Process chat messages
- `POST /api/auth/sso-login` - SSO authentication
- `POST /api/files/upload` - File upload
- `GET /api/files/:id` - Retrieve file
- `POST /api/webhook` - Webhook processing

### Testing Philosophy
This project follows a comprehensive testing strategy focusing on:
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: API endpoint and middleware integration
3. **Service Tests**: External service mocking and integration
4. **Workflow Tests**: AI workflow and LangGraph testing

---

*Last Updated: September 28, 2025*
*Test Coverage Report Generated from Jest*