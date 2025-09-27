# PDF Processing Implementation Guide

## Overview
This guide outlines the implementation of PDF processing using LangChain and Pinecone. The system will:
1. Accept PDF uploads as buffer
2. Extract text using LangChain's PDFLoader
3. Split text into chunks
4. Generate embeddings
5. Store in Pinecone
6. Return a fileId for future reference

## Implementation Steps

### 1. File Processor Service
```javascript
// app/services/file-processor.js

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { config } from '../../config/environment.js';
import logger from '../utils/logger.js';

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: config.pinecone.apiKey,
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.openai.apiKey,
});

export async function processPDFDocument(buffer, metadata) {
    try {
        // 1. Load PDF using PDFLoader with buffer
        const loader = new PDFLoader(buffer, {
            parsedItemSeparator: '\\n',
            useBuffer: true  // Important: Use buffer directly
        });
        const rawDocs = await loader.load();
        
        // 2. Split text into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const splitDocs = await textSplitter.splitDocuments(rawDocs);
        
        // 3. Generate embeddings and prepare vectors
        const vectors = await Promise.all(
            splitDocs.map(async (doc, i) => {
                const embedding = await embeddings.embedQuery(doc.pageContent);
                return {
                    id: `${metadata.fileId}-chunk-${i}`,
                    values: embedding,
                    metadata: {
                        ...metadata,
                        ...doc.metadata,
                        chunk: doc.pageContent,
                        chunkIndex: i,
                    },
                };
            })
        );
        
        // 4. Store in Pinecone
        const index = pinecone.index(config.pinecone.indexName);
        await index.upsert(vectors);
        
        return {
            chunks: vectors.length,
            pages: rawDocs.length,
            text: rawDocs.map(doc => doc.pageContent).join('\\n'),
        };
    } catch (error) {
        logger.error(error, 'Error processing PDF:');
        throw error;
    }
}
```

### 2. Upload Controller
```javascript
// app/controllers/upload-controller.js

import { asyncHandler } from '../middleware/validation.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { processPDFDocument } from '../services/file-processor.js';
import logger from '../utils/logger.js';

// Configure multer to store in memory
const upload = multer({
    storage: multer.memoryStorage(),  // Store in memory instead of disk
    limits: { 
        fileSize: 5 * 1024 * 1024  // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
}).single('file');

export const uploadFile = asyncHandler(async (req, res) => {
    upload(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            // Generate fileId
            const fileId = uuidv4();

            // Process the document using buffer
            const result = await processPDFDocument(req.file.buffer, {
                fileId,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                userId: req.user?.id || 'anonymous',
                uploadedAt: new Date().toISOString(),
            });

            // Return success response
            res.json({
                success: true,
                data: {
                    fileId,
                    fileName: req.file.originalname,
                    pages: result.pages,
                    chunks: result.chunks,
                    text: result.text,
                    uploadedAt: new Date().toISOString(),
                }
            });

        } catch (error) {
            logger.error(error, 'Upload error:');
            res.status(500).json({
                success: false,
                error: 'Failed to process PDF',
                message: error.message
            });
        }
    });
});
```

### 3. API Route
```javascript
// routes/api/index.js

import express from 'express';
import { uploadFile } from '../../app/controllers/upload-controller.js';

const router = express.Router();

router.post('/upload', uploadFile);

export default router;
```

## Testing the Implementation

1. **Environment Variables**:
```env
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
```

2. **Test Using cURL**:
```bash
curl -X POST -F "file=@test.pdf" http://localhost:3001/api/upload
```

Expected Response:
```json
{
    "success": true,
    "data": {
        "fileId": "uuid-v4-string",
        "fileName": "test.pdf",
        "pages": 5,
        "chunks": 12,
        "text": "PDF content...",
        "uploadedAt": "2025-09-27T11:30:00.000Z"
    }
}
```

## Error Handling

The implementation includes error handling for:
- Invalid file types
- File size limits
- PDF processing errors
- Pinecone storage errors
- Memory buffer handling

## Notes

1. **File Processing**:
   - Uses LangChain's PDFLoader with buffer support
   - Processes file directly from memory
   - Splits text into manageable chunks
   - Generates embeddings using OpenAI
   - Stores in Pinecone with metadata

2. **Storage**:
   - Each chunk is stored in Pinecone with a unique ID
   - Metadata includes file info and chunk position
   - No temporary files needed

3. **Response**:
   - Returns fileId for future reference
   - Includes basic document stats
   - Provides original text content

4. **Security**:
   - File size limit (5MB)
   - PDF-only restriction
   - In-memory processing
   - Error logging

Would you like me to implement this updated version that uses the file buffer directly?