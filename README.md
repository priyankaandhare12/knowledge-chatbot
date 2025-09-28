# Universal Knowledge Chatbot

A powerful chatbot that can answer questions by searching and synthesizing information from the web. Built with LangChain, LangGraph, and modern AI technologies.

## 🌟 Features

- 🔍 Web Search: Get real-time information from the internet
- 🧠 Smart Synthesis: AI-powered understanding and explanation
- 🔐 SSO Authentication: Secure access control (placeholder for now)
- 📝 Clear Responses: Well-formatted answers with sources
- 🚀 Extensible: Ready for future knowledge sources


Universal Knowledge Chatbot – Tech Stack & Tools
Workflow & Integrations
N8n – Orchestrated automation workflows, integrated Slack for team communication and Jira for issue tracking.
Development & Automation
Cursor + GitHub Copilot – Used for AI-assisted coding, debugging, and automating development tasks.
Design
Canva – Designed chatbot branding assets including the logo.
Core Tools & Infrastructure
Pinecone – Managed vector database for semantic search and knowledge retrieval.
LangSmith – Tracing, debugging, and evaluating LLM applications.
Auth0 – Authentication and secure user access management.
Google Cloud Console – Infrastructure management, hosting, and monitoring.
Lovable (Tool) – Used to generate boilerplate code and kickstart project setup.
Playwright(ts) - To automate the application



## 🛠️ Tech Stack

- **Framework**: Express.js
- **AI/ML**: LangChain, LangGraph, OpenAI
- **Search**: Tavily API
- **Authentication**: JWT (SSO-ready)
- **Logging**: Pino
- **Process Manager**: PM2
- **Testing**: Jest

## 📋 Requirements

- Node.js >= 18
- OpenAI API Key
- Tavily API Key

## 🚀 Getting Started

1. **Clone & Install**
   ```bash
   git clone [repository-url]
   cd knowledge-chatbot/server
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start the Server**
   ```bash
   # Development
   npm start

   # Debug Mode
   npm run start:debug
   ```

## 🔑 Environment Variables

Required variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `TAVILY_API_KEY`: Your Tavily API key
- `JWT_SECRET`: Secret for JWT tokens

Optional:
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: CORS origin

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/sso`: SSO login endpoint (placeholder)

### Chat
- `POST /api/chat`: Main chat endpoint
  ```json
  {
    "message": "Your question here",
    "conversationId": "optional-conversation-id"
  }
  ```

### System
- `GET /api/health`: Health check
- `GET /`: API info

## 🔄 Development Workflow

1. Start the server: `npm start`
2. Watch logs: `npm run logs`
3. Run tests: `npm test`
4. Format code: `npm run format`

## 🔜 Future Enhancements

1. File Processing
   - Upload and query PDFs, documents
   - Document indexing and search

2. Database Integration
   - Connect to databases
   - Natural language queries

3. API Integration
   - Connect to external APIs
   - Custom data source integration
