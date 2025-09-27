import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        // For Vercel deployments, allow multiple origins
        allowedOrigins: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',').map((url) => url.trim())
            : [process.env.FRONTEND_URL || 'http://localhost:3000'],
    },

    auth0: {
        domain: process.env.AUTH0_DOMAIN,
        clientId: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        audience: process.env.AUTH0_AUDIENCE,
        scope: 'openid profile email',
        algorithms: ['RS256'],
    },

    session: {
        secret: process.env.SESSION_SECRET || 'change-this-in-production',
        cookieDomain: process.env.SESSION_COOKIE_DOMAIN || undefined, // No default domain for production
        secure: process.env.SESSION_SECURE === 'true' || process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },

    domainRestrictions: {
        enabled: process.env.DOMAIN_RESTRICTIONS_ENABLED === 'true',
        allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',').map((d) => d.trim()) : [],
        allowAllGmail: process.env.ALLOW_ALL_GMAIL !== 'false',
        blockMessage: process.env.DOMAIN_BLOCK_MESSAGE || 'Access restricted to authorized company domains only.',
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

    weather: {
        apiKey: process.env.WEATHER_API_KEY,
        baseUrl: 'https://api.openweathermap.org/data/2.5',
        units: 'metric', // Use Celsius
    },

    pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX || 'knowledge-base',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-jwt-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    upload: {
        maxFileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB default
        allowedTypes: ['application/pdf', 'text/plain'],
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
    const aiServiceVars = ['OPENAI_API_KEY', 'TAVILY_API_KEY'];
    const authRequiredVars = ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'SESSION_SECRET'];

    const aiMissing = aiServiceVars.filter((varName) => !process.env[varName]);
    const authMissing = authRequiredVars.filter((varName) => !process.env[varName]);

    if (aiMissing.length > 0) {
        console.warn(`Missing AI service configuration: ${aiMissing.join(', ')}. AI chat features will not work until these are configured.`);
    }

    if (authMissing.length > 0) {
        console.warn(`Missing Auth0 configuration: ${authMissing.join(', ')}. Authentication will not work properly.`);
    }

    // Log domain restriction status
    if (config.domainRestrictions.enabled) {
        console.log('Domain restrictions enabled:', {
            allowedDomains: config.domainRestrictions.allowedDomains,
            allowAllGmail: config.domainRestrictions.allowAllGmail,
        });
    }
};

// Domain validation utility
export const isEmailDomainAllowed = (email) => {
    if (!email || !email.includes('@')) return false;

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    // If domain restrictions are not enabled, allow all
    if (!config.domainRestrictions.enabled) return true;

    // Check if it's a Gmail address and Gmail is allowed
    if (domain === 'gmail.com' && config.domainRestrictions.allowAllGmail) return true;

    // If no specific domains configured, allow all (except Gmail if disabled)
    if (config.domainRestrictions.allowedDomains.length === 0) {
        return config.domainRestrictions.allowAllGmail || domain !== 'gmail.com';
    }

    // Check against allowed domains list
    return config.domainRestrictions.allowedDomains.includes(domain);
};
