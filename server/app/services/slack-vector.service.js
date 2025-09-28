// Deprecated: Use vector-storage.service.js instead
export {};

// import { Pinecone } from "@pinecone-database/pinecone";
// import { config } from '../../config/environment.js';
// import { OpenAI } from 'openai';
// import logger from '../utils/logger.js';

// // Initialize OpenAI
// const openai = new OpenAI({
//     apiKey: config.openai.apiKey
// });

// // Initialize Pinecone
// const pinecone = new Pinecone({
//     apiKey: config.pinecone.apiKey
// });

// /**
//  * Store a Slack message in Pinecone
//  */
// export async function storeSlackMessage(message) {
//     try {
//         const { text, user } = message;
//         const timestamp = Date.now().toString();
        
//         // Generate embedding
//         const response = await openai.embeddings.create({
//             model: "text-embedding-ada-002",
//             input: text,
//         });
        
//         const embedding = response.data[0].embedding;
        
//         // Get Pinecone index
//         const index = pinecone.index(config.pinecone.indexName);
//         console.log("Pinecone index initialized:", index);
        
//         // Store in Pinecone - passing vectors directly as array
//         await index.upsert([{
//             id: `knowledge-chatbot-${timestamp}`,
//             values: embedding,
//             metadata: {
//                 source: "slack",
//                 channel: "knowledge-chatbot",
//                 user: user,
//                 timestamp: timestamp,
//                 text: text
//             }
//         }]);

//         return {
//             success: true,
//             vectorId: `knowledge-chatbot-${timestamp}`
//         };
//     } catch (error) {
//         console.error("Error in storeSlackMessage:", error);
//         throw error;
//     }
// }