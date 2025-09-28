import { config } from '../../config/environment.js';

export const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    // API key should be configured in your environment variables
    if (!apiKey || apiKey !== config.n8nApiKey) {
        return res.status(401).json({
            success: false,
            error: 'Invalid API key'
        });
    }
    
    next();
};
