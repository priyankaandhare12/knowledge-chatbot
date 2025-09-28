// Auth0 Service unit tests
import { jest } from '@jest/globals';

// Mock Auth0 clients
const mockAuthenticationClient = {
    oauth: {
        authorizationCodeGrant: jest.fn(),
    },
};

const mockManagementClient = {
    users: {
        get: jest.fn(),
    },
};

jest.unstable_mockModule('auth0', () => ({
    AuthenticationClient: jest.fn(() => mockAuthenticationClient),
    ManagementClient: jest.fn(() => mockManagementClient),
}));

// Mock axios
const mockAxios = {
    get: jest.fn(),
};
jest.unstable_mockModule('axios', () => ({
    default: mockAxios,
}));

// Mock config
jest.unstable_mockModule('../../config/environment.js', () => ({
    config: {
        auth0: {
            domain: 'test.auth0.com',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            scope: 'openid profile email',
        },
        domainRestrictions: {
            blockMessage: 'Contact admin for access',
        },
    },
    isEmailDomainAllowed: jest.fn(),
}));

// Import after mocking
const auth0Service = (await import('../../app/services/auth0.service.js')).default;
const { isEmailDomainAllowed } = await import('../../config/environment.js');
const { factories } = await import('../utils/testHelpers.js');

describe('Auth0Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset axios mock
        mockAxios.get.mockReset();

        // Reset auth client mocks
        mockAuthenticationClient.oauth.authorizationCodeGrant.mockReset();

        // Reset domain validation
        isEmailDomainAllowed.mockReturnValue(true);
    });

    describe('generateLoginUrl', () => {
        it('should generate correct Auth0 login URL', () => {
            const state = 'test-state-jwt';
            const redirectUri = 'http://localhost:3001/api/auth/callback';

            const loginUrl = auth0Service.generateLoginUrl(state, redirectUri);

            expect(loginUrl).toContain('https://test.auth0.com/authorize');
            expect(loginUrl).toContain('response_type=code');
            expect(loginUrl).toContain('client_id=test-client-id');
            expect(loginUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fcallback');
            expect(loginUrl).toMatch(/scope=openid[%20\+]profile[%20\+]email/);
            expect(loginUrl).toContain('state=test-state-jwt');
            expect(loginUrl).toContain('connection=google-oauth2');
        });

        it('should handle special characters in redirect URI', () => {
            const state = 'test-state';
            const redirectUri = 'https://example.com/callback?param=value&other=test';

            const loginUrl = auth0Service.generateLoginUrl(state, redirectUri);

            expect(loginUrl).toContain(encodeURIComponent(redirectUri));
        });

        it('should handle empty state parameter', () => {
            const state = '';
            const redirectUri = 'http://localhost:3001/callback';

            const loginUrl = auth0Service.generateLoginUrl(state, redirectUri);

            expect(loginUrl).toContain('state=');
        });
    });

    describe('exchangeCodeForTokens', () => {
        it('should successfully exchange code for tokens', async () => {
            const mockTokens = {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                id_token: 'mock-id-token',
                expires_in: 3600,
            };

            mockAuthenticationClient.oauth.authorizationCodeGrant.mockResolvedValue({
                data: mockTokens,
            });

            const result = await auth0Service.exchangeCodeForTokens('auth-code-123', 'http://localhost:3001/callback');

            expect(mockAuthenticationClient.oauth.authorizationCodeGrant).toHaveBeenCalledWith({
                code: 'auth-code-123',
                redirect_uri: 'http://localhost:3001/callback',
            });
            expect(result).toEqual(mockTokens);
        });

        it('should handle token exchange failure', async () => {
            mockAuthenticationClient.oauth.authorizationCodeGrant.mockRejectedValue(new Error('Invalid authorization code'));

            await expect(auth0Service.exchangeCodeForTokens('invalid-code', 'http://localhost:3001/callback')).rejects.toThrow(
                'Failed to exchange authorization code for tokens',
            );
        });

        it('should handle network errors', async () => {
            mockAuthenticationClient.oauth.authorizationCodeGrant.mockRejectedValue(new Error('Network error'));

            await expect(auth0Service.exchangeCodeForTokens('code', 'http://localhost:3001/callback')).rejects.toThrow(
                'Failed to exchange authorization code for tokens',
            );
        });
    });

    describe('getUserInfo', () => {
        it('should successfully get user info', async () => {
            const mockUserInfo = {
                sub: 'auth0|123456789',
                email: 'test@example.com',
                name: 'Test User',
                picture: 'https://example.com/avatar.jpg',
                email_verified: true,
            };

            mockAxios.get.mockResolvedValue({
                data: mockUserInfo,
            });

            const result = await auth0Service.getUserInfo('mock-access-token');

            expect(mockAxios.get).toHaveBeenCalledWith('https://test.auth0.com/userinfo', {
                headers: {
                    Authorization: 'Bearer mock-access-token',
                    'Content-Type': 'application/json',
                },
            });
            expect(result).toEqual(mockUserInfo);
        });

        it('should handle invalid access token', async () => {
            mockAxios.get.mockRejectedValue({
                response: {
                    data: { error: 'Invalid token' },
                },
            });

            await expect(auth0Service.getUserInfo('invalid-token')).rejects.toThrow('Failed to get user information');
        });

        it('should handle network errors for user info', async () => {
            mockAxios.get.mockRejectedValue(new Error('Network error'));

            await expect(auth0Service.getUserInfo('valid-token')).rejects.toThrow('Failed to get user information');
        });

        it('should handle Auth0 API errors', async () => {
            mockAxios.get.mockRejectedValue({
                response: {
                    status: 401,
                    data: { error: 'Unauthorized', error_description: 'Token expired' },
                },
            });

            await expect(auth0Service.getUserInfo('expired-token')).rejects.toThrow('Failed to get user information');
        });
    });

    describe('validateUserDomain', () => {
        it('should validate allowed email domains', () => {
            isEmailDomainAllowed.mockReturnValue(true);

            const result = auth0Service.validateUserDomain('user@example.com');

            expect(isEmailDomainAllowed).toHaveBeenCalledWith('user@example.com');
            expect(result).toBe(true);
        });

        it('should reject disallowed email domains', () => {
            isEmailDomainAllowed.mockReturnValue(false);

            expect(() => {
                auth0Service.validateUserDomain('user@blocked.com');
            }).toThrow('Access denied for domain: blocked.com. Contact admin for access');
        });

        it('should handle missing email', () => {
            expect(() => {
                auth0Service.validateUserDomain(null);
            }).toThrow('User email is required');

            expect(() => {
                auth0Service.validateUserDomain('');
            }).toThrow('User email is required');

            expect(() => {
                auth0Service.validateUserDomain(undefined);
            }).toThrow('User email is required');
        });

        it('should handle malformed email addresses', () => {
            isEmailDomainAllowed.mockReturnValue(false);

            expect(() => {
                auth0Service.validateUserDomain('invalid-email');
            }).toThrow('Access denied for domain: undefined. Contact admin for access');
        });

        it('should extract domain correctly from email', () => {
            isEmailDomainAllowed.mockReturnValue(false);

            expect(() => {
                auth0Service.validateUserDomain('user@subdomain.example.com');
            }).toThrow('Access denied for domain: subdomain.example.com. Contact admin for access');
        });
    });

    describe('generateLogoutUrl', () => {
        it('should generate correct logout URL', () => {
            const returnTo = 'http://localhost:3000';

            const logoutUrl = auth0Service.generateLogoutUrl(returnTo);

            expect(logoutUrl).toContain('https://test.auth0.com/v2/logout');
            expect(logoutUrl).toContain('client_id=test-client-id');
            // Note: returnTo is commented out in current implementation
            expect(logoutUrl).not.toContain('returnTo');
        });

        it('should handle different return URLs', () => {
            const returnTo = 'https://production.example.com/dashboard';

            const logoutUrl = auth0Service.generateLogoutUrl(returnTo);

            expect(logoutUrl).toContain('https://test.auth0.com/v2/logout');
            expect(logoutUrl).toContain('client_id=test-client-id');
        });
    });

    describe('completeAuthentication', () => {
        it('should complete full authentication flow successfully', async () => {
            const mockTokens = {
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                id_token: 'id-token',
                expires_in: 3600,
            };

            const mockUserInfo = {
                sub: 'auth0|123456789',
                email: 'test@example.com',
                name: 'Test User',
                picture: 'https://example.com/avatar.jpg',
                email_verified: true,
            };

            mockAuthenticationClient.oauth.authorizationCodeGrant.mockResolvedValue({
                data: mockTokens,
            });
            mockAxios.get.mockResolvedValue({ data: mockUserInfo });
            isEmailDomainAllowed.mockReturnValue(true);

            const result = await auth0Service.completeAuthentication('auth-code', 'http://localhost:3001/callback');

            expect(result).toEqual({
                user: {
                    id: 'auth0|123456789',
                    email: 'test@example.com',
                    name: 'Test User',
                    picture: 'https://example.com/avatar.jpg',
                    emailVerified: true,
                },
                tokens: {
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    idToken: 'id-token',
                    expiresIn: 3600,
                },
            });
        });

        it('should handle domain validation failure during authentication', async () => {
            const mockTokens = {
                access_token: 'access-token',
            };

            const mockUserInfo = {
                sub: 'auth0|123456789',
                email: 'blocked@blocked.com',
                name: 'Blocked User',
            };

            mockAuthenticationClient.oauth.authorizationCodeGrant.mockResolvedValue({
                data: mockTokens,
            });
            mockAxios.get.mockResolvedValue({ data: mockUserInfo });
            isEmailDomainAllowed.mockReturnValue(false);

            await expect(auth0Service.completeAuthentication('auth-code', 'http://localhost:3001/callback')).rejects.toThrow(
                'Access denied for domain: blocked.com',
            );
        });

        it('should handle token exchange failure during authentication', async () => {
            mockAuthenticationClient.oauth.authorizationCodeGrant.mockRejectedValue(new Error('Invalid code'));

            await expect(auth0Service.completeAuthentication('invalid-code', 'http://localhost:3001/callback')).rejects.toThrow(
                'Failed to exchange authorization code for tokens',
            );
        });

        it('should handle user info retrieval failure during authentication', async () => {
            const mockTokens = {
                access_token: 'access-token',
            };

            mockAuthenticationClient.oauth.authorizationCodeGrant.mockResolvedValue({
                data: mockTokens,
            });
            mockAxios.get.mockRejectedValue(new Error('User info failed'));

            await expect(auth0Service.completeAuthentication('auth-code', 'http://localhost:3001/callback')).rejects.toThrow(
                'Failed to get user information',
            );
        });

        it('should preserve original error during authentication flow', async () => {
            const customError = new Error('Custom Auth0 Error');
            customError.code = 'AUTH0_CUSTOM_ERROR';

            mockAuthenticationClient.oauth.authorizationCodeGrant.mockRejectedValue(customError);

            await expect(auth0Service.completeAuthentication('auth-code', 'http://localhost:3001/callback')).rejects.toThrow('Custom Auth0 Error');
        });
    });

    describe('Integration scenarios', () => {
        it('should handle concurrent authentication requests', async () => {
            const mockTokens = {
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                id_token: 'id-token',
                expires_in: 3600,
            };

            const mockUserInfo = {
                sub: 'auth0|123456789',
                email: 'test@example.com',
                name: 'Test User',
                email_verified: true,
            };

            mockAuthenticationClient.oauth.authorizationCodeGrant.mockResolvedValue({
                data: mockTokens,
            });
            mockAxios.get.mockResolvedValue({ data: mockUserInfo });
            isEmailDomainAllowed.mockReturnValue(true);

            // Make multiple concurrent calls
            const promises = [
                auth0Service.completeAuthentication('code1', 'callback'),
                auth0Service.completeAuthentication('code2', 'callback'),
                auth0Service.completeAuthentication('code3', 'callback'),
            ];

            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            results.forEach((result) => {
                expect(result.user.email).toBe('test@example.com');
            });
        });

        it('should handle rate limiting gracefully', async () => {
            mockAxios.get.mockRejectedValue({
                response: {
                    status: 429,
                    data: { error: 'Too Many Requests' },
                },
            });

            await expect(auth0Service.getUserInfo('token')).rejects.toThrow('Failed to get user information');
        });
    });
});
