/**
 * routes/auth.ts
 * 
 * Purpose: Zoho OAuth 2.0 authentication flow.
 * 
 * OAuth Flow:
 * 1. User clicks "Connect Zoho" in frontend
 * 2. Frontend redirects to GET /api/auth/zoho
 * 3. Backend redirects to Zoho's OAuth consent page
 * 4. User approves, Zoho redirects back to /api/auth/zoho/callback?code=...
 * 5. Backend exchanges code for access token + refresh token
 * 6. Store tokens in session, redirect user back to frontend
 * 
 * Security notes:
 * - Tokens stored in secure HTTP-only cookies (session)
 * - State parameter prevents CSRF attacks (TODO)
 * - Refresh tokens used to get new access tokens when expired
 * - Never expose tokens to frontend
 * 
 * Zoho OAuth docs: https://www.zoho.com/accounts/protocol/oauth/web-server-applications.html
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ============================================================================
// Configuration
// ============================================================================

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI || 'http://localhost:5000/api/auth/zoho/callback';
const ZOHO_SCOPE = process.env.ZOHO_SCOPE || 'ZohoProjects.projects.ALL,ZohoProjects.tasks.ALL';

const ZOHO_AUTH_URL = 'https://accounts.zoho.com/oauth/v2/auth';
const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';

// ============================================================================
// GET /api/auth/zoho
// Initiate OAuth flow
// ============================================================================

/**
 * Redirect user to Zoho's OAuth consent page
 * 
 * Query params will include:
 * - response_type=code
 * - client_id=YOUR_CLIENT_ID
 * - scope=ZohoProjects.projects.ALL,ZohoProjects.tasks.ALL
 * - redirect_uri=http://localhost:5000/api/auth/zoho/callback
 * - access_type=offline (to get refresh token)
 * - state=RANDOM_STRING (CSRF protection, TODO)
 */
router.get('/zoho', (req: Request, res: Response) => {
  // NOTE: In production, generate and store a random state token for CSRF protection
  // const state = crypto.randomBytes(16).toString('hex');
  // req.session.oauthState = state;

  if (!ZOHO_CLIENT_ID) {
    return res.status(500).json({
      error: 'OAuth not configured',
      message: 'ZOHO_CLIENT_ID is not set. Please configure Zoho OAuth credentials.',
      helpUrl: 'https://api-console.zoho.com/',
    });
  }

  const authUrl = new URL(ZOHO_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', ZOHO_CLIENT_ID);
  authUrl.searchParams.set('scope', ZOHO_SCOPE);
  authUrl.searchParams.set('redirect_uri', ZOHO_REDIRECT_URI);
  authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
  // authUrl.searchParams.set('state', state); // TODO: Add CSRF protection

  console.log('[Auth] Redirecting to Zoho OAuth:', authUrl.toString());
  
  res.redirect(authUrl.toString());
});

// ============================================================================
// GET /api/auth/zoho/callback
// Handle OAuth callback from Zoho
// ============================================================================

/**
 * Exchange authorization code for access token
 * 
 * Zoho will redirect here with:
 * - code=AUTH_CODE (exchange this for tokens)
 * - state=RANDOM_STRING (verify this matches what we sent)
 * 
 * We then POST to Zoho's token endpoint to get:
 * - access_token (use for API calls)
 * - refresh_token (use to get new access tokens)
 * - expires_in (seconds until access token expires)
 */
router.get('/zoho/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  // Handle user denial
  if (error) {
    console.error('[Auth] User denied authorization:', error);
    return res.redirect('http://localhost:3000/?auth=denied');
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: 'Missing authorization code',
      message: 'OAuth callback requires a code parameter',
    });
  }

  // TODO: Verify state parameter to prevent CSRF
  // if (req.query.state !== req.session.oauthState) {
  //   return res.status(400).json({ error: 'Invalid state parameter' });
  // }

  try {
    console.log('[Auth] Exchanging code for tokens...');

    // Exchange code for tokens
    const tokenResponse = await fetch(ZOHO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        redirect_uri: ZOHO_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json();

    // Store tokens in session
    req.session.zohoTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    };

    console.log('[Auth] Tokens stored in session');

    // Redirect back to frontend
    res.redirect('http://localhost:3000/dashboard?auth=success');
  } catch (error) {
    console.error('[Auth] Token exchange error:', error);
    
    res.status(500).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// GET /api/auth/status
// Check if user is authenticated
// ============================================================================

/**
 * Return authentication status
 * Frontend can call this to check if user is logged in
 */
router.get('/status', (req: Request, res: Response) => {
  const isAuthenticated = !!req.session?.zohoTokens?.accessToken;
  
  res.json({
    authenticated: isAuthenticated,
    // NOTE: Never send actual tokens to frontend
  });
});

// ============================================================================
// POST /api/auth/logout
// Clear session and log out
// ============================================================================

/**
 * Destroy session and clear tokens
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
