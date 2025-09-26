import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:4000',
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        projectId: process.env.OPENAI_PROJECT_ID,
    },

    langchain: {
        verbose: process.env.LANGCHAIN_VERBOSE === 'true',
        tracing: process.env.LANGCHAIN_TRACING_V2 === 'true',
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },

    tavily: {
        apiKey: process.env.TAVILY_API_KEY,
    },

    jwt: {
        // This will be replaced with SSO configuration later
        secret: process.env.JWT_SECRET || 'placeholder-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // SSO config will be added here later
    sso: {
        // Example fields that will be needed:
        // provider: process.env.SSO_PROVIDER,
        // clientId: process.env.SSO_CLIENT_ID,
        // clientSecret: process.env.SSO_CLIENT_SECRET,
        // callbackUrl: process.env.SSO_CALLBACK_URL,
    },
};

export const validateEnvironment = () => {
    const requiredVars = ['OPENAI_API_KEY', 'TAVILY_API_KEY'];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};
