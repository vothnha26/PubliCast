const googleOAuthService = require('../../services/social/google-oauth.service');
const googleDriveOAuthService = require('../../services/social/google-drive-oauth.service');
const youtubeService = require('../../services/social/youtube');
const facebookService = require('../../services/social/facebook');
const tiktokService = require('../../services/social/tiktok');
const instagramService = require('../../services/social/instagram');
const tiktokGateway = require('../../services/social/tiktok/tiktok.gateway');
const notificationService = require('../../services/core/notification.service');
const { SOCIAL_TECHNICAL, GOOGLE_SCOPES, GOOGLE_OAUTH_SCOPE_SETS, FACEBOOK_SCOPES, FACEBOOK_API, DEFAULT_CONFIG, API_VERSIONS, NOTIFICATION_TYPES } = require('../../utils/constants');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');
const redisClient = require('../../config/redis');
const crypto = require('crypto');

class OAuthController {
  /**
   * Helper to get base URL for redirect URIs (supports ngrok)
   */
  _getRedirectBaseUrl(req) {
    return process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
  }

  // brandId is presence-checked by the caller (both v1 and v2 public
  // methods) before this runs — kept out of here so it stays a pure
  // "given a valid brandId, build the URL" helper reusable by either
  // response envelope.
  _buildGoogleAuthUrl(req, brandId, frontendOrigin) {
    const scopes = GOOGLE_OAUTH_SCOPE_SETS.YOUTUBE;
    // frontendOrigin (optional) lets frontends specify custom return URL (e.g. /manage/workplace/new?step=2)
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
    const isValidOrigin = frontendOrigin
      && /^https?:\/\/[^/]+/.test(frontendOrigin)
      && (allowedOrigins.some(o => frontendOrigin.startsWith(o)) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(frontendOrigin));
    const state = isValidOrigin ? `${brandId}::${encodeURIComponent(frontendOrigin)}` : brandId;

    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/google/callback`;
    return googleOAuthService.getAuthUrl(scopes, state, redirectUri);
  }

  getGoogleAuthUrl = asyncHandler(async (req, res) => {
    const { brandId, frontendOrigin } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = this._buildGoogleAuthUrl(req, brandId, frontendOrigin);
    res.json({ url });
  });

  _buildGoogleDriveAuthUrl(req, brandId) {
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/google-drive/callback`;
    return googleDriveOAuthService.getAuthUrl(brandId, redirectUri);
  }

  getGoogleDriveAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = this._buildGoogleDriveAuthUrl(req, brandId);
    res.json({ url });
  });

  _handleCallbackError(error, frontendUrl, res) {
    if (error.name === 'ConnectionConflictError') {
      const queryParams = new URLSearchParams({
        error: 'social_connection_conflict',
        conflictType: error.type,
        channelName: error.channelName,
        platformAccountId: error.platformAccountId,
        platform: error.platform,
        existingBrandName: error.existingBrandName || ''
      }).toString();
      return res.redirect(`${frontendUrl}/manage/connections?${queryParams}`);
    }
    logger.error('Social OAuth Connection Error:', error);
    return res.redirect(`${frontendUrl}/manage/connections?error=connection_failed&message=${encodeURIComponent(error.message)}`);
  }

  googleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const [brandId, encodedFrontendOrigin] = (state || '').split('::');
    let targetUrl = `${DEFAULT_CONFIG.FRONTEND_URL}/manage/connections?tab=connections`;

    if (encodedFrontendOrigin) {
      try {
        const decoded = decodeURIComponent(encodedFrontendOrigin);
        targetUrl = decoded.includes('?') ? `${decoded}&success=youtube_connected` : `${decoded}?success=youtube_connected`;
      } catch (e) {
        targetUrl = `${DEFAULT_CONFIG.FRONTEND_URL}/manage/connections?tab=connections&success=youtube_connected`;
      }
    } else {
      targetUrl = `${DEFAULT_CONFIG.FRONTEND_URL}/manage/connections?tab=connections&success=youtube_connected`;
    }

    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/google/callback`;

    if (!brandId) return res.redirect(`${DEFAULT_CONFIG.FRONTEND_URL}/manage/connections?error=brand_id_missing`);

    try {
      const account = await youtubeService.connectChannel(brandId, code, redirectUri);
      this._backfillPostsSync(youtubeService, brandId, account?.id, 'YouTube');
      await this._notifySocialConnected(brandId, 'YouTube');
      return res.redirect(targetUrl);
    } catch (error) {
      return this._handleCallbackError(error, DEFAULT_CONFIG.FRONTEND_URL, res);
    }
  });

  googleDriveCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const brandId = state;
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/google-drive/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    try {
      await googleDriveOAuthService.connectAccount(brandId, code, redirectUri);
      await this._notifySocialConnected(brandId, 'Google Drive');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=google_drive_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  _buildFacebookAuthUrl(req, brandId) {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/facebook/callback`;
    const state = `facebook:${brandId}`;
    return FACEBOOK_API.dialogUrl(
      API_VERSIONS.FACEBOOK,
      appId,
      redirectUri,
      state,
      FACEBOOK_SCOPES.FACEBOOK
    );
  }

  getFacebookAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = this._buildFacebookAuthUrl(req, brandId);
    res.json({ url });
  });

  facebookCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    
    let platform = 'facebook';
    let brandId = state;

    if (state && state.includes(':')) {
      const parts = state.split(':');
      platform = parts[0];
      brandId = parts[1];
    }

    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/facebook/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    try {
      if (platform === 'instagram') {
        const account = await instagramService.connectChannel(brandId, code, redirectUri);
        this._backfillPostsSync(instagramService, brandId, account?.id, 'Instagram');
        await this._notifySocialConnected(brandId, 'Instagram');
        return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=instagram_connected`);
      }

      const account = await facebookService.connectChannel(brandId, code, redirectUri);
      this._backfillPostsSync(facebookService, brandId, account?.id, 'Facebook');
      await this._notifySocialConnected(brandId, 'Facebook');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=facebook_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  _buildInstagramAuthUrl(req, brandId) {
    const appId = process.env.FACEBOOK_APP_ID;
    // Reuse facebook callback to prevent Whitelist Redirect URI block issues on FB App Console
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/facebook/callback`;
    const state = `instagram:${brandId}`;
    return FACEBOOK_API.dialogUrl(
      API_VERSIONS.FACEBOOK,
      appId,
      redirectUri,
      state,
      FACEBOOK_SCOPES.INSTAGRAM
    );
  }

  getInstagramAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = this._buildInstagramAuthUrl(req, brandId);
    res.json({ url });
  });

  instagramCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const brandId = state;
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/instagram/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    try {
      const account = await instagramService.connectChannel(brandId, code, redirectUri);
      this._backfillPostsSync(instagramService, brandId, account?.id, 'Instagram');
      await this._notifySocialConnected(brandId, 'Instagram');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=instagram_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  getTikTokAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = await this._buildTikTokAuthUrl(req, brandId);
    res.json({ url });
  });

  async _buildTikTokAuthUrl(req, brandId) {
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/tiktok/callback`;
    logger.debug('[TikTok OAuth] Constructing auth URL', { redirectUri });

    // Sinh PKCE
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Lưu codeVerifier vào Redis
    const cacheKey = `tiktok_oauth_verifier:${brandId}`;
    await redisClient.setEx(cacheKey, 600, codeVerifier); // Hết hạn sau 10 phút

    return tiktokGateway.getAuthUrl(SOCIAL_TECHNICAL.TIKTOK_SCOPES, brandId, redirectUri, codeChallenge);
  }

  tiktokCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const brandId = state;
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/tiktok/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    // Lấy codeVerifier từ Redis
    const cacheKey = `tiktok_oauth_verifier:${brandId}`;
    const codeVerifier = await redisClient.get(cacheKey);
    if (!codeVerifier) {
      logger.warn('[TikTok OAuth] PKCE code verifier expired or not found', { brandId });
      return res.redirect(`${frontendUrl}/manage/connections?error=oauth_session_expired`);
    }
    // Xóa ngay lập tức (Single Use)
    await redisClient.del(cacheKey);

    try {
      const account = await tiktokService.connectChannel(brandId, code, redirectUri, codeVerifier);
      this._backfillPostsSync(tiktokService, brandId, account?.id, 'TikTok');
      await this._notifySocialConnected(brandId, 'TikTok');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=tiktok_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  handleTikTokWebhook = asyncHandler(async (req, res) => {
    const challenge = req.query.challenge || req.body.challenge;

    if (challenge) {
      logger.debug('[TikTok Webhook] Verification challenge received');
      return res.status(200).send(challenge);
    }

    logger.info('[TikTok Webhook] Event received', { type: req.body?.type || 'unknown' });
    res.status(200).json({ status: 'ok' });
  });

  _buildThreadsAuthUrl(req, brandId) {
    const threadsGateway = require('../../services/social/threads/threads.gateway');
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/threads/callback`;
    return threadsGateway.getAuthUrl(brandId, redirectUri);
  }

  getThreadsAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = this._buildThreadsAuthUrl(req, brandId);
    res.json({ url });
  });

  threadsCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const brandId = state;
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/threads/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    try {
      const threadsService = require('../../services/social/threads');
      const account = await threadsService.connectChannel(brandId, code, redirectUri);
      this._backfillPostsSync(threadsService, brandId, account?.id, 'Threads');
      await this._notifySocialConnected(brandId, 'Threads');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=threads_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  /**
   * Smart Fetch cold-start mitigation: one immediate, non-blocking
   * syncPublishedPosts() call right after a fresh OAuth connect, so the
   * user's PostMetricDaily-backed published-posts view isn't empty until
   * the next 15-min posts-sync cron tick. Fire-and-forget — never blocks
   * the OAuth redirect, and a failure here just means the cron catches up
   * on its next pass.
   */
  _backfillPostsSync(service, brandId, socialAccountId, platformName) {
    if (!socialAccountId || typeof service.syncPublishedPosts !== 'function') return;
    service.syncPublishedPosts(brandId, socialAccountId).catch(err => {
      logger.warn(`[OAuthController] ${platformName} OAuth-connect backfill sync failed for account ${socialAccountId}: ${err.message}`);
    });
  }

  async _notifySocialConnected(brandId, platformName) {
    try {
      await notificationService.create({
        brandId,
        type: NOTIFICATION_TYPES.PLATFORM,
        title: `${platformName} connected`,
        message: `${platformName} has been connected successfully.`,
        actionUrl: '/manage/connections'
      });
    } catch (err) {
      logger.error(`[OAuthController] Failed to create ${platformName} connection notification:`, err);
    }
  }
}

module.exports = new OAuthController();
