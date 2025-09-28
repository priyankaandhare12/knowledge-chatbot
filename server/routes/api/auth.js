import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/environment.js';
import auth0Service from '../../app/services/auth0.service.js';
import { generateJwtToken, AuthenticationError, DomainNotAllowedError } from '../../app/middleware/auth.middleware.js';

const router = express.Router();

// GET /auth/login - Initiate login flow
router.get('/login', (req, res) => {
    try {
        const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
        const returnTo = req.query.returnTo || config.frontend.url;

        // Create stateless state parameter with JWT (serverless-friendly)
        const statePayload = {
            nonce: uuidv4(),
            returnTo: returnTo,
            timestamp: Date.now(),
        };

        const state = jwt.sign(statePayload, config.jwt.secret, { expiresIn: '10m' });

        const loginUrl = auth0Service.generateLoginUrl(state, redirectUri);

        res.json({
            success: true,
            loginUrl: loginUrl,
            message: 'Redirect to this URL to login with Google',
        });
    } catch (error) {
        console.error('Login initiation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate login',
        });
    }
});

// GET /auth/callback - Handle Auth0 callback
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Handle Auth0 errors
        if (error) {
            console.error('Auth0 callback error:', error, error_description);
            return res.redirect(`${config.frontend.url}/login?error=auth_failed&message=${encodeURIComponent(error_description || error)}`);
        }

        // Verify JWT-based state parameter (serverless-friendly)
        let statePayload;
        try {
            statePayload = jwt.verify(state, config.jwt.secret);
            console.log('State verified successfully:', statePayload.nonce);
        } catch (stateError) {
            console.error('Invalid or expired state parameter:', stateError.message);
            return res.redirect(
                `${config.frontend.url}/login?error=invalid_state&message=${encodeURIComponent('Authentication state expired, please try again')}`,
            );
        }

        if (!code) {
            console.error('No authorization code received');
            return res.redirect(`${config.frontend.url}/login?error=no_code`);
        }

        // Complete authentication
        const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
        const authResult = await auth0Service.completeAuthentication(code, redirectUri);

        // Generate JWT token
        const jwtToken = generateJwtToken(authResult.user);

        // Store user in session
        req.session.user = authResult.user;
        req.session.tokens = {
            jwt: jwtToken,
            auth0AccessToken: authResult.tokens.accessToken,
            auth0RefreshToken: authResult.tokens.refreshToken,
        };

        // Get return URL from state payload (no session cleanup needed)
        const returnTo = statePayload.returnTo || config.frontend.url;

        // Set JWT as HTTP-only cookie
        const cookieOptions = {
            httpOnly: true,
            secure: config.session.secure,
            sameSite: 'none', // Changed for cross-domain
            maxAge: config.session.maxAge,
            // Don't set domain for cross-domain cookies
        };

        console.log('=== COOKIE SETTING DEBUG ===');
        console.log('User authenticated:', authResult.user.email);
        console.log('JWT token length:', jwtToken.length);
        console.log('Cookie options:', cookieOptions);
        console.log('Return URL:', returnTo);
        console.log('============================');

        res.cookie('auth_token', jwtToken, cookieOptions);

        // Also include token in URL as backup for cross-domain issues
        const separator = returnTo.includes('?') ? '&' : '?';
        res.redirect(`${returnTo}${separator}auth=success&token=${jwtToken}`);
    } catch (error) {
        console.error('Callback processing error:', error);

        if (error.message.includes('Access denied for domain')) {
            return res.redirect(`${config.frontend.url}/login?error=domain_not_allowed&message=${encodeURIComponent(error.message)}`);
        }

        res.redirect(`${config.frontend.url}/login?error=callback_failed&message=${encodeURIComponent(error.message)}`);
    }
});

// POST /auth/logout - Logout user
router.post('/logout', (req, res) => {
    try {
        const returnTo = req.body.returnTo || `${config.frontend.url}/logout`;

        // Clear session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
        });

        // Clear all auth-related cookies more thoroughly
        const cookieOptions = {
            domain: config.session.cookieDomain,
            path: '/',
            httpOnly: true,
            secure: config.session.secure,
        };

        res.clearCookie('auth_token', cookieOptions);
        res.clearCookie('connect.sid', cookieOptions); // Clear session cookie

        // Also clear without domain to ensure cleanup
        res.clearCookie('auth_token', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });

        // Generate Auth0 logout URL with proper returnTo
        const logoutUrl = auth0Service.generateLogoutUrl(returnTo);

        res.json({
            success: true,
            logoutUrl: logoutUrl,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout',
        });
    }
});

// GET /auth/user - Get current user info
router.get('/user', (req, res) => {
    try {
        console.log('=== /auth/user DEBUG ===');
        console.log('Session exists:', !!req.session);
        console.log('Session user:', req.session?.user);
        console.log('All cookies:', req.cookies);
        console.log('Auth token cookie:', req.cookies.auth_token);
        console.log('Request origin:', req.get('origin'));
        console.log('Cookie domain config:', config.session.cookieDomain);
        console.log('=======================');

        // Check session first
        if (req.session && req.session.user) {
            console.log('✅ Using session authentication');
            return res.json({
                success: true,
                user: req.session.user,
                authenticated: true,
            });
        }

        // Check JWT cookie or Authorization header
        let token = req.cookies.auth_token;
        
        // Also check Authorization header as fallback
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.replace('Bearer ', '');
        }
        
        if (token) {
            console.log('✅ Found auth_token, verifying JWT...');
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                console.log('✅ JWT verified for user:', decoded.email);
                return res.json({
                    success: true,
                    user: {
                        id: decoded.userId,
                        email: decoded.email,
                        name: decoded.name,
                        emailVerified: decoded.emailVerified,
                    },
                    authenticated: true,
                });
            } catch (jwtError) {
                console.log('❌ JWT verification failed:', jwtError.message);
                // Invalid JWT, clear cookie
                res.clearCookie('auth_token');
            }
        } else {
            console.log('❌ No auth_token cookie found');
        }

        console.log('❌ No authentication found, returning null user');
        res.json({
            success: true,
            user: null,
            authenticated: false,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user information',
        });
    }
});

// GET /auth/status - Check authentication status
router.get('/status', (req, res) => {
    const isAuthenticated = !!(req.session?.user || req.cookies.auth_token);

    res.json({
        success: true,
        authenticated: isAuthenticated,
        domainRestrictions: {
            enabled: config.domainRestrictions.enabled,
            allowedDomains: config.domainRestrictions.allowedDomains,
            allowAllGmail: config.domainRestrictions.allowAllGmail,
        },
    });
});

export default router;
