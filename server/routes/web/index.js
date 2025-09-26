// import express from 'express';
// import helmet from 'helmet';
// import path from 'path';
// import basicAuth from 'express-basic-auth';
// import { config } from '../../config/environment.js';

// const router = express.Router();

// router.get('/', (req, res) => {
//     res.json({
//         success: true,
//         message: 'Universal Knowledge Chatbot API',
//         version: '1.0.0',
//         timestamp: new Date().toISOString(),
//     });
// });

// // Serve docs HTML page - only in non-production environments
// if (config.nodeEnv !== 'production') {
//     // Permissive CSP middleware only for docs route
//     const docsCSP = helmet({
//         contentSecurityPolicy: {
//             directives: {
//                 defaultSrc: ["'self'"],
//                 scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
//                 'script-src-attr': ["'unsafe-inline'"],
//                 styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
//                 fontSrc: ["'self'", 'data:', 'fonts.gstatic.com'],
//                 imgSrc: ["'self'", 'data:'],
//                 connectSrc: ["'self'"],
//             },
//         },
//     });

//     // Serve static assets from docs directory
//     router.use(
//         '/docs',
//         basicAuth({
//             users: { [config.basicAuth.userName]: config.basicAuth.password },
//             challenge: true,
//         }),
//         docsCSP,
//         express.static(path.join(process.cwd(), 'docs')),
//     );
// }

// export default router;