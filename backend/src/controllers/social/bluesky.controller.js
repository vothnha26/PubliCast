const asyncHandler = require('../../utils/async-handler');
const { blueskyService } = require('../../services/social/bluesky');
const blueskyOAuthHelper = require('../../services/social/bluesky/bluesky-oauth.helper');
const notificationService = require('../../services/core/notification.service');
const { DEFAULT_CONFIG, NOTIFICATION_TYPES } = require('../../utils/constants');
const logger = require('../../utils/logger');
const redisClient = require('../../config/redis');
const crypto = require('crypto');

class BlueskyController {
  _getRedirectBaseUrl(req) {
    return process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
  }

  getClientMetadata = asyncHandler(async (req, res) => {
    const baseUrl = this._getRedirectBaseUrl(req);
    const redirectUri = `${baseUrl}/api/social/bluesky/callback`;
    const clientId = `${baseUrl}/api/social/bluesky/client-metadata.json`;

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      client_id: clientId,
      client_name: 'PubliCast',
      // client_uri must be a publicly resolvable hostname or Bluesky's AS
      // rejects it with invalid_client_metadata — FRONTEND_URL is often
      // localhost in dev, so use baseUrl (the same public tunnel serving
      // this metadata) instead.
      client_uri: baseUrl,
      redirect_uris: [redirectUri],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'none',
      dpop_bound_access_tokens: true
    });
  });

  getBlueskyAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const baseUrl = this._getRedirectBaseUrl(req);
    const redirectUri = `${baseUrl}/api/social/bluesky/callback`;
    const clientId = process.env.BLUESKY_CLIENT_ID || `${baseUrl}/api/social/bluesky/client-metadata.json`;

    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Generate DPoP ES256 Keypair for this session
    const keyPair = blueskyOAuthHelper.generateES256KeyPair();
    const privatePem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' });

    // state carries a per-attempt nonce, not just brandId — previously the
    // Redis session was cached under a fixed `bluesky_oauth_session:{brandId}`
    // key, so clicking "Connect" twice (double-click, or retrying after the
    // first attempt seemed to hang) overwrote the first attempt's DPoP
    // keypair with a second one before the user finished the OAuth redirect.
    // The authorization server had already bound the PAR request (and thus
    // the eventual authorization code) to the FIRST keypair's JWK thumbprint,
    // so the token exchange — signed with the second, now-cached keypair —
    // failed with invalid_grant/JKT mismatch. Scoping the cache key to this
    // attempt's own nonce makes concurrent attempts fully independent.
    const attemptNonce = crypto.randomBytes(16).toString('hex');
    const state = `${brandId}::${attemptNonce}`;

    // Save PKCE verifier & DPoP Keypair to Redis (10 minutes expiry)
    const sessionData = {
      codeVerifier,
      privatePem,
      jwk: keyPair.jwk
    };
    const cacheKey = `bluesky_oauth_session:${state}`;
    try {
      await redisClient.setEx(cacheKey, 600, JSON.stringify(sessionData));
    } catch (err) {
      logger.warn('[BlueskyController] Redis setEx session failed:', err.message);
    }

    const parUrl = process.env.BLUESKY_PAR_URL || 'https://bsky.social/oauth/par';
    const oauthHost = process.env.BLUESKY_OAUTH_HOST || 'https://bsky.social';

    logger.info('[BlueskyController] Sending PAR request:', { parUrl, clientId, redirectUri });

    try {
      const { requestUri } = await blueskyOAuthHelper.sendPARRequest({
        parUrl,
        clientId,
        redirectUri,
        state,
        codeChallenge,
        keyPair
      });

      const authUrl = `${oauthHost}/oauth/authorize?client_id=${encodeURIComponent(clientId)}&request_uri=${encodeURIComponent(requestUri)}`;
      return res.json({ url: authUrl });
    } catch (err) {
      logger.warn('[BlueskyController] PAR flow failed, falling back to direct authorize:', { message: err.message, stack: err.stack });

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'atproto transition:generic',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      const fallbackUrl = `${oauthHost}/oauth/authorize?${params.toString()}`;
      return res.json({ url: fallbackUrl });
    }
  });

  blueskyCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    // state is "<brandId>::<attemptNonce>" (see getBlueskyAuthUrl) — split
    // defensively, first segment is always brandId. cacheKey below uses the
    // full state string (not just brandId), so any OAuth attempt started
    // before this nonce-scoping change simply won't find its session (it
    // was cached under a plain brandId key) and fails with the "session
    // expired" message below — a clean failure, not a silent mismatch.
    const [brandId] = (state || '').split('::');
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL || 'http://localhost:5173';
    const baseUrl = this._getRedirectBaseUrl(req);
    const redirectUri = `${baseUrl}/api/social/bluesky/callback`;
    const clientId = process.env.BLUESKY_CLIENT_ID || `${baseUrl}/api/social/bluesky/client-metadata.json`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    let sessionData = null;
    try {
      const cacheKey = `bluesky_oauth_session:${state}`;
      const rawSession = await redisClient.get(cacheKey);
      if (rawSession) {
        sessionData = JSON.parse(rawSession);
        await redisClient.del(cacheKey);
      }
    } catch (err) {
      logger.warn('[BlueskyController] Redis session read failed:', err.message);
    }

    if (!sessionData || !sessionData.privatePem || !sessionData.jwk) {
      logger.error('[BlueskyController] Missing OAuth session data (expired or lost) for brandId:', brandId);
      return res.redirect(`${frontendUrl}/manage/connections?error=connection_failed&message=${encodeURIComponent('OAuth session expired, please try connecting again')}`);
    }

    try {
      const privateKey = crypto.createPrivateKey(sessionData.privatePem);
      const keyPair = { privateKey, jwk: sessionData.jwk };
      const tokenUrl = process.env.BLUESKY_TOKEN_URL || 'https://bsky.social/oauth/token';

      const tokenData = await blueskyOAuthHelper.exchangeCodeForToken({
        tokenUrl,
        clientId,
        redirectUri,
        code,
        codeVerifier: sessionData.codeVerifier,
        keyPair
      });

      const account = await blueskyService.connectChannelViaOAuth(brandId, {
        tokenData,
        keyPair
      });

      // Smart Fetch cold-start mitigation — see OAuthController#_backfillPostsSync.
      if (account?.id) {
        blueskyService.syncPublishedPosts(brandId, account.id).catch(err => {
          logger.warn(`[BlueskyController] OAuth-connect backfill sync failed for account ${account.id}: ${err.message}`);
        });
      }

      try {
        await notificationService.create({
          brandId,
          type: NOTIFICATION_TYPES.PLATFORM,
          title: 'Bluesky connected',
          message: `Bluesky account (@${account.username || account.displayName || 'connected'}) has been connected successfully via OAuth2.`,
          actionUrl: '/manage/connections'
        });
      } catch (err) {
        logger.error('[BlueskyController] Failed to create notification:', err);
      }

      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=bluesky_connected`);
    } catch (error) {
      logger.error('Bluesky OAuth Connection Error:', error);
      return res.redirect(`${frontendUrl}/manage/connections?error=connection_failed&message=${encodeURIComponent(error.message)}`);
    }
  });

  getBlueskyComments = asyncHandler(async (req, res) => {
    const { brandId, uri, depth, parentHeight, socialAccountId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    if (!uri) {
      return res.status(400).json({ message: 'Post URI (uri) is required' });
    }

    const data = await blueskyService.getPostComments(brandId, {
      uri,
      depth: depth ? parseInt(depth) : 6,
      parentHeight: parentHeight ? parseInt(parentHeight) : 80,
      socialAccountId
    });

    return res.json(data);
  });

  getBlueskyPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await blueskyService.getPublishedVideos(
      brandId,
      pageToken || null,
      limit ? parseInt(limit) : 10,
      socialAccountId || null
    );
    res.json(result);
  });
}

module.exports = new BlueskyController();
