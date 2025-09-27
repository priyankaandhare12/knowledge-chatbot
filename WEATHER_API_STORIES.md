# Weather API Integration Stories

## 🎯 Overview
Add weather information capability to our Universal Knowledge Chatbot by integrating with an external weather API (OpenWeatherMap). The LangGraph flow will route queries between Weather Node and Document Node based on query intent and fileId presence.

## 🔄 LangGraph Flow
```
START → Router Node → Weather Node → END
                   └→ Document Node → END
                   └→ "Not Supported" Message → END
```

## 📋 Implementation Stories

### **Story 1: Create Weather API Client**
**Priority:** High | **Status:** Ready  
**Estimated Time:** 2 hours

#### **Acceptance Criteria:**
- [ ] Set up OpenWeatherMap API client using axios
- [ ] Use WEATHER_API_KEY from .env
- [ ] Format weather data consistently
- [ ] Add proper error handling and retries

#### **Technical Tasks:**
1. Create API client utility with axios
2. Use environment variable: WEATHER_API_KEY
3. Implement endpoints:
   ```
   GET /data/2.5/weather?q={city}&appid={WEATHER_API_KEY}
   ```
4. Format responses:
   ```javascript
   {
     temperature: number,
     condition: string,
     humidity: number,
     windSpeed: number,
     description: string
   }
   ```
5. Add error handling and retries

---

### **Story 2: Create Weather Node and Tool**
**Priority:** High | **Status:** Blocked by Story 1  
**Estimated Time:** 2-3 hours

#### **Acceptance Criteria:**
- [ ] Create WeatherTool for the node
- [ ] Create dedicated Weather Node
- [ ] Handle location parsing
- [ ] Return formatted weather data

#### **Technical Tasks:**
1. Create `WeatherTool.js`
2. Create `weatherNode` function
3. Implement location extraction
4. Add proper error handling

---

### **Story 3: Update Router Logic**
**Priority:** High | **Status:** Blocked by Story 2  
**Estimated Time:** 2 hours

#### **Acceptance Criteria:**
- [ ] Router identifies weather vs document queries
- [ ] No default fallback behavior
- [ ] Clear "not supported" message for other queries
- [ ] Proper error handling

#### **Technical Tasks:**
1. Update router node logic
2. Implement query type detection:
   - Weather keywords → Weather Node
   - FileId present → Document Node
   - Otherwise → "Not supported" message
3. Add error handling

#### **Routing Rules:**
1. Weather Queries:
   - Contains weather keywords
   - No fileId needed
   - Example: "What's the weather in London?"

2. Document Queries:
   - Must have fileId
   - Example: "What does page 5 say about revenue?"

3. Unsupported Queries:
   - No weather keywords AND no fileId
   - Response: "I can only help with weather queries or questions about uploaded documents"

---

### **Story 4: Update Universal Prompt**
**Priority:** High | **Status:** Blocked by Story 3  
**Estimated Time:** 1 hour

#### **Acceptance Criteria:**
- [ ] Clear instructions for both query types
- [ ] Example queries for each type
- [ ] Response formatting guidelines
- [ ] Error handling instructions

#### **Technical Tasks:**
1. Update universal prompt
2. Add query type examples
3. Add response formats
4. Add error handling guidelines

## 🔑 Key Technical Decisions:
1. Strict routing (no defaults)
2. Clear separation between weather and document queries
3. Explicit unsupported query handling
4. Clean state management

## 📊 Success Metrics:
- [ ] Weather queries return accurate data
- [ ] Document queries work with fileId
- [ ] Clear error messages for unsupported queries
- [ ] No fallback behavior

## 🌤️ Example Queries:
1. Weather Queries:
   - "What's the weather in New York?"
   - "Will it rain in London tomorrow?"

2. Document Queries:
   - "What does the document say about X?" (with fileId)
   - "Find information about Y in the document" (with fileId)

3. Unsupported Queries:
   - "What's the latest news?" → Not supported message
   - "Who won the Oscar?" → Not supported message

## 🚀 Getting Started:
1. Sign up for OpenWeatherMap API key
2. Start with Story 1 (Weather API Client)
3. Build nodes one by one
4. Test routing logic thoroughly