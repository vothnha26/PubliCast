const googleOAuthService = require('../../services/social/google-oauth.service');
const youtubeService = require('../../services/social/youtube');
const facebookService = require('../../services/social/facebook');
const tiktokService = require('../../services/social/tiktok');
const instagramService = require('../../services/social/instagram');
const linkedinService = require('../../services/social/linkedin');
const linkedinGateway = require('../../services/social/linkedin/linkedin.gateway');
const tiktokGateway = require('../../services/social/tiktok/tiktok.gateway');
const notificationService = require('../../services/core/notification.service');
const { SOCIAL_TECHNICAL, GOOGLE_SCOPES, FACEBOOK_SCOPES, FACEBOOK_API, DEFAULT_CONFIG, API_VERSIONS, NOTIFICATION_TYPES } = require('../../utils/constants');
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

  getGoogleAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const scopes = [
      GOOGLE_SCOPES.YOUTUBE,
      GOOGLE_SCOPES.YOUTUBE_READONLY,
      GOOGLE_SCOPES.YOUTUBE_FORCE_SSL,
      GOOGLE_SCOPES.YT_ANALYTICS_READONLY,
      GOOGLE_SCOPES.USERINFO_EMAIL,
      GOOGLE_SCOPES.USERINFO_PROFILE,
      GOOGLE_SCOPES.DRIVE_READONLY
    ];
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/google/callback`;
    const url = googleOAuthService.getAuthUrl(scopes, brandId, redirectUri);
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
    const brandId = state;
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/google/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    try {
      // connectChannel ghi outbox row SOCIAL_SYNC_ENQUEUE trong cùng transaction lưu
      // socialAccount (social-account.repository.js) — không cần emit sự kiện ở đây nữa.
      await youtubeService.connectChannel(brandId, code, redirectUri);
      await this._notifySocialConnected(brandId, 'YouTube');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=youtube_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  getFacebookAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/facebook/callback`;
    const state = `facebook:${brandId}`;
    const url = FACEBOOK_API.dialogUrl(
      API_VERSIONS.FACEBOOK,
      appId,
      redirectUri,
      state,
      FACEBOOK_SCOPES.FACEBOOK
    );
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
        await instagramService.connectChannel(brandId, code, redirectUri);
        await this._notifySocialConnected(brandId, 'Instagram');
        return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=instagram_connected`);
      }

      await facebookService.connectChannel(brandId, code, redirectUri);
      await this._notifySocialConnected(brandId, 'Facebook');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=facebook_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  getInstagramAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const appId = process.env.FACEBOOK_APP_ID;
    // Reuse facebook callback to prevent Whitelist Redirect URI block issues on FB App Console
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/facebook/callback`;
    const state = `instagram:${brandId}`;
    const url = FACEBOOK_API.dialogUrl(
      API_VERSIONS.FACEBOOK,
      appId,
      redirectUri,
      state,
      FACEBOOK_SCOPES.INSTAGRAM
    );
    res.json({ url });
  });

  instagramCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const brandId = state;
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/instagram/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    try {
      await instagramService.connectChannel(brandId, code, redirectUri);
      await this._notifySocialConnected(brandId, 'Instagram');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=instagram_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  getTikTokAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/tiktok/callback`;
    logger.debug('[TikTok OAuth] Constructing auth URL', { redirectUri });

    // Sinh PKCE
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Lưu codeVerifier vào Redis
    const cacheKey = `tiktok_oauth_verifier:${brandId}`;
    await redisClient.setEx(cacheKey, 600, codeVerifier); // Hết hạn sau 10 phút

    const url = tiktokGateway.getAuthUrl(SOCIAL_TECHNICAL.TIKTOK_SCOPES, brandId, redirectUri, codeChallenge);
    res.json({ url });
  });

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
      await tiktokService.connectChannel(brandId, code, redirectUri, codeVerifier);
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

  getLinkedInAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/linkedin/callback`;
    const url = linkedinGateway.getAuthUrl(brandId, redirectUri);
    res.json({ url });
  });

  linkedinCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const brandId = state;
    const frontendUrl = DEFAULT_CONFIG.FRONTEND_URL;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/linkedin/callback`;

    if (!brandId) return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);

    try {
      await linkedinService.connectChannel(brandId, code, redirectUri);
      await this._notifySocialConnected(brandId, 'LinkedIn');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=linkedin_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

  getThreadsAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const threadsGateway = require('../../services/social/threads/threads.gateway');
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/threads/callback`;
    const url = threadsGateway.getAuthUrl(brandId, redirectUri);
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
      await threadsService.connectChannel(brandId, code, redirectUri);
      await this._notifySocialConnected(brandId, 'Threads');
      return res.redirect(`${frontendUrl}/manage/connections?tab=connections&success=threads_connected`);
    } catch (error) {
      return this._handleCallbackError(error, frontendUrl, res);
    }
  });

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
