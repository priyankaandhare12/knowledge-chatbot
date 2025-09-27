# Auth0 Setup Guide for Universal Knowledge Chatbot

This guide will help you set up Auth0 for secure server-side authentication with Gmail SSO.

## Prerequisites

1. An Auth0 account (sign up at [auth0.com](https://auth0.com) if you don't have one)
2. Access to your project's backend server configuration

## Auth0 Application Setup

### Step 1: Create a New Application

1. Log in to your Auth0 Dashboard
2. Go to **Applications** > **Applications**
3. Click **Create Application**
4. Name: `Universal Knowledge Chatbot`
5. Application Type: **Regular Web Applications**
6. Click **Create**

### Step 2: Configure Application Settings

In your new application's **Settings** tab:

1. **Allowed Callback URLs**: `http://localhost:3001/api/auth/callback`
   - For production: `https://yourdomain.com/api/auth/callback`

2. **Allowed Logout URLs**: `http://localhost:3000/login`
   - For production: `https://yourfrontend.com/login`

3. **Allowed Web Origins**: `http://localhost:3000`
   - For production: `https://yourfrontend.com`

4. **Allowed Origins (CORS)**: `http://localhost:3000`
   - For production: `https://yourfrontend.com`

5. Click **Save Changes**

### Step 3: Enable Google Social Connection

1. Go to **Authentication** > **Social**
2. Click on **Google** (or **Create Connection** if not visible)
3. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. In **Applications** tab, enable it for your application
5. Click **Save**

## Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
5. Application type: **Web Application**
6. **Authorized redirect URIs**: 
   - `https://YOUR_AUTH0_DOMAIN/login/callback`
   - Example: `https://your-tenant.auth0.com/login/callback`

## Backend Environment Configuration

Create or update your `.env` file in the `knowledge-chatbot/server` directory:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-in-production
SESSION_SECURE=false  # Set to true in production with HTTPS
SESSION_COOKIE_DOMAIN=localhost  # Set to your domain in production

# Frontend Configuration
FRONTEND_URL=http://localhost:3000  # Your frontend URL

# Domain Restrictions (Optional)
DOMAIN_RESTRICTIONS_ENABLED=true
ALLOWED_DOMAINS=yourdomain.com,anotherdomain.com  # Comma-separated list
DOMAIN_BLOCK_MESSAGE=Access is restricted to authorized domains only.

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-should-be-very-long-and-random
JWT_EXPIRES_IN=24h

# Other existing configuration...
PORT=3001
NODE_ENV=development
```

## Frontend Environment Configuration

Update your frontend `.env` file in the `ai-knowledge-chat-ui` directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001  # Your backend URL

# Other existing configuration...
```

## Security Notes

1. **Never expose Auth0 credentials** in your frontend code
2. **Use HTTPS in production** - set `SESSION_SECURE=true`
3. **Use strong session secrets** - generate random 256-bit keys
4. **Configure proper CORS** origins for your production domains
5. **Enable domain restrictions** if you want to limit access to specific email domains

## Testing the Setup

1. Start your backend server: `npm start` (in knowledge-chatbot/server)
2. Start your frontend: `npm run dev` (in ai-knowledge-chat-ui)
3. Navigate to `http://localhost:3000/login`
4. Click "Sign in with Google"
5. Complete the OAuth flow
6. You should be redirected to the home page

## Troubleshooting

### Common Issues:

1. **CORS errors**: Check that your frontend URL is properly configured in both Auth0 and backend CORS settings
2. **Callback URL not found**: Ensure callback URLs match exactly in Auth0 settings
3. **Domain restrictions**: If enabled, make sure your email domain is in the allowed list
4. **Session issues**: Verify session secret is set and cookies are being set properly

### Debug Mode:

Add this to your backend `.env` for more verbose logging:
```bash
NODE_ENV=development
DEBUG=express-session
```

## Production Deployment

When deploying to production:

1. Update all URLs from localhost to your actual domains
2. Set `SESSION_SECURE=true` for HTTPS
3. Use strong, random secrets for JWT and session
4. Configure proper domain restrictions
5. Update Auth0 application settings with production URLs

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check backend server logs
3. Verify Auth0 application configuration
4. Ensure all environment variables are properly set