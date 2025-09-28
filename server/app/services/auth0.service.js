import { AuthenticationClient, ManagementClient } from 'auth0';
import { config, isEmailDomainAllowed } from '../../config/environment.js';

class Auth0Service {
    constructor() {
        this.authClient = new AuthenticationClient({
            domain: config.auth0.domain,
            clientId: config.auth0.clientId,
            clientSecret: config.auth0.clientSecret,
        });

        this.managementClient = new ManagementClient({
            domain: config.auth0.domain,
            clientId: config.auth0.clientId,
            clientSecret: config.auth0.clientSecret,
            audience: `https://${config.auth0.domain}/api/v2/`,
        });
    }

    // Generate Auth0 login URL
    generateLoginUrl(state, redirectUri) {
        const baseUrl = `https://${config.auth0.domain}/authorize`;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.auth0.clientId,
            redirect_uri: redirectUri,
            scope: config.auth0.scope,
            state: state,
            connection: 'google-oauth2', // Force Google login
        });

        return `${baseUrl}?${params.toString()}`;
    }

    // Exchange authorization code for tokens
    async exchangeCodeForTokens(code, redirectUri) {
        try {
            const tokenResponse = await this.authClient.oauth.authorizationCodeGrant({
                code: code,
                redirect_uri: redirectUri,
            });

            return tokenResponse.data;
        } catch (error) {
            console.error('Token exchange error:', error);
            // Preserve custom errors
            if (error.code || error.name !== 'Error') {
                throw error;
            }
            throw new Error('Failed to exchange authorization code for tokens');
        }
    }

    // Get user info from Auth0
    async getUserInfo(accessToken) {
        try {
            // Use axios to call the userinfo endpoint directly
            const axios = (await import('axios')).default;
            const response = await axios.get(`https://${config.auth0.domain}/userinfo`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get user info error:', error.response?.data || error.message);
            throw new Error('Failed to get user information');
        }
    }

    // Validate user domain
    validateUserDomain(userEmail) {
        if (!userEmail) {
            throw new Error('User email is required');
        }

        if (!isEmailDomainAllowed(userEmail)) {
            const domain = userEmail.split('@')[1];
            throw new Error(`Access denied for domain: ${domain}. ${config.domainRestrictions.blockMessage}`);
        }

        return true;
    }

    // Generate logout URL
    generateLogoutUrl(returnTo) {
        const baseUrl = `https://${config.auth0.domain}/v2/logout`;

        const params = new URLSearchParams({
            client_id: config.auth0.clientId,
            returnTo: returnTo || config.frontend.url, // Include returnTo for proper redirect
        });

        return `${baseUrl}?${params.toString()}`;
    }

    // Complete authentication flow
    async completeAuthentication(code, redirectUri) {
        try {
            // Exchange code for tokens
            const tokens = await this.exchangeCodeForTokens(code, redirectUri);

            // Get user information
            const userInfo = await this.getUserInfo(tokens.access_token);

            // Validate domain restrictions
            this.validateUserDomain(userInfo.email);

            return {
                user: {
                    id: userInfo.sub,
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture,
                    emailVerified: userInfo.email_verified,
                },
                tokens: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    idToken: tokens.id_token,
                    expiresIn: tokens.expires_in,
                },
            };
        } catch (error) {
            console.error('Authentication completion error:', error);
            throw error;
        }
    }
}

export default new Auth0Service();
