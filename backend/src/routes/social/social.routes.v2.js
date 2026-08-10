const express = require('express');
const oauthController = require('../../controllers/social/oauth.controller');
const youtubeController = require('../../controllers/social/youtube.controller');
const facebookController = require('../../controllers/social/facebook.controller');
const tiktokController = require('../../controllers/social/tiktok.controller');
const instagramController = require('../../controllers/social/instagram.controller');
const googleDriveController = require('../../controllers/social/google-drive.controller');
const socialAnalyticsController = require('../../controllers/social/social-analytics.controller');
const socialConnectionController = require('../../controllers/social/social-connection.controller');
const postingUsageController = require('../../controllers/workspace/posting-usage.controller');
const threadsController = require('../../controllers/social/threads.controller');
const blueskyController = require('../../controllers/social/bluesky.controller');
const redditController = require('../../controllers/social/reddit.controller');
const twitchController = require('../../controllers/social/twitch.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = checkPermission;
const { PRODUCT_IDS, PERMISSION_KEYS } = require('../../utils/constants');

const requireManageConnections = checkPermission(PERMISSION_KEYS.MANAGE_CONNECTIONS);
const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Social V2
 *   description: Universal Social Networks Auth & Connections management (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/social/metrics:
 *   get:
 *     summary: Get social analytics metrics across networks
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Metrics data returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/metrics', verifyAuth, checkPermission(PERMISSION_KEYS.VIEW_ANALYTICS), (req, res, next) => {
  socialAnalyticsController.getMetrics(req, res, next);
});

/**
 * @openapi
 * /v2/social/metrics/version:
 *   get:
 *     summary: Cheap version signal for a brand's metrics, used to reconcile after a socket reconnect
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Metrics version returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/metrics/version', verifyAuth, checkPermission(PERMISSION_KEYS.VIEW_ANALYTICS), (req, res, next) => {
  socialAnalyticsController.getMetricsVersion(req, res, next);
});

/**
 * @openapi
 * /v2/social/facebook/published-posts:
 *   get:
 *     summary: Get Facebook published posts list for brand
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Facebook published posts list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/facebook/published-posts', verifyAuth, requireBrandMember, facebookController.getFacebookPublishedPosts);

/**
 * @openapi
 * /v2/social/facebook/competitors:
 *   get:
 *     summary: Get tracked Facebook competitor pages for brand
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Facebook competitors list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   post:
 *     summary: Add a Facebook competitor page to track
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       201:
 *         description: Facebook competitor added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/facebook/competitors', verifyAuth, requireBrandMember, facebookController.addFacebookCompetitor);
router.get('/facebook/competitors', verifyAuth, requireBrandMember, facebookController.getFacebookCompetitors);
router.delete('/facebook/competitors/:id', verifyAuth, facebookController.deleteFacebookCompetitor);

/**
 * @openapi
 * /v2/social/instagram/published-posts:
 *   get:
 *     summary: Get Instagram published posts list for brand
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Instagram published posts list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/instagram/published-posts', verifyAuth, requireBrandMember, instagramController.getInstagramPublishedPosts);

/**
 * @openapi
 * /v2/social/threads/published-posts:
 *   get:
 *     summary: Get Threads published posts list for brand
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Threads published posts list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/threads/published-posts', verifyAuth, requireBrandMember, threadsController.getThreadsPublishedPosts);

/**
 * @openapi
 * /v2/social/facebook/disconnect:
 *   post:
 *     summary: Disconnect Facebook account connection
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Account disconnected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/facebook/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectFacebookAccount);

/**
 * @openapi
 * /v2/social/instagram/disconnect:
 *   post:
 *     summary: Disconnect Instagram account connection
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Account disconnected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/instagram/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectInstagramAccount);

/**
 * @openapi
 * /v2/social/tiktok/disconnect:
 *   post:
 *     summary: Disconnect TikTok account connection
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Account disconnected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/tiktok/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectTikTokAccount);

/**
 * @openapi
 * /v2/social/google/drive/files:
 *   get:
 *     summary: List files from Google Drive integration
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Drive files list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/google/drive/files', verifyAuth, requireBrandMember, requireFeature(PRODUCT_IDS.GOOGLE_DRIVE), googleDriveController.getGoogleDriveFiles);
router.post('/google/drive/download', verifyAuth, requireBrandMember, requireFeature(PRODUCT_IDS.GOOGLE_DRIVE), googleDriveController.downloadGoogleDriveFile);
router.post('/google/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectGoogleAccount);
router.post('/google-drive/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectGoogleDriveAccount);

/**
 * @openapi
 * /v2/social/accounts/set-default:
 *   post:
 *     summary: Mark one connected account as the default for its platform
 *     description: >
 *       Display-only hint pre-checked by default in the post composer when a
 *       brand has multiple accounts of the same platform. Not enforced
 *       anywhere else.
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, socialAccountId]
 *             properties:
 *               brandId: { type: string }
 *               socialAccountId: { type: string }
 *     responses:
 *       200:
 *         description: Updated social account
 *       404:
 *         description: Social account not found for this brand
 */
router.post('/accounts/set-default', verifyAuth, requireManageConnections, socialConnectionController.setDefaultAccount);

// ── OAuth Auth URLs V2 ──
router.get('/google/url', verifyAuth, oauthController.getGoogleAuthUrl);
router.get('/google-drive/auth-url', verifyAuth, oauthController.getGoogleDriveAuthUrl);
router.get('/facebook/url', verifyAuth, oauthController.getFacebookAuthUrl);
router.get('/facebook/search-pages', verifyAuth, requireBrandMember, facebookController.searchFacebookPages);
router.get('/facebook/reels/:videoId/copyright-check', verifyAuth, facebookController.checkFacebookReelCopyright);
router.get('/instagram/url', verifyAuth, oauthController.getInstagramAuthUrl);
router.get('/instagram/audio-search', verifyAuth, requireBrandMember, instagramController.searchAudio);
router.get('/tiktok/url', verifyAuth, oauthController.getTikTokAuthUrl);
router.get('/tiktok/published-videos', verifyAuth, requireBrandMember, tiktokController.getTikTokPublishedVideos);
router.get('/tiktok/comments', verifyAuth, requireBrandMember, tiktokController.getTikTokComments);
router.get('/threads/url', verifyAuth, oauthController.getThreadsAuthUrl);
router.post('/threads/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectThreadsAccount);

// ── Reddit V2 ──
router.get('/reddit/url', verifyAuth, redditController.getAuthUrl);
router.get('/reddit/subreddits', verifyAuth, requireBrandMember, redditController.getUserSubreddits);
router.get('/reddit/subreddits/search', verifyAuth, requireBrandMember, redditController.searchSubreddits);
router.get('/reddit/subreddits/:subreddit/flairs', verifyAuth, requireBrandMember, redditController.getSubredditFlairs);
router.post('/reddit/disconnect', verifyAuth, requireManageConnections, redditController.disconnect);
router.post('/reddit/submit', verifyAuth, requireBrandMember, redditController.submitPost);

// ── Twitch V2 ──
router.get('/twitch/url', verifyAuth, twitchController.getTwitchAuthUrl);
router.post('/twitch/disconnect', verifyAuth, requireManageConnections, twitchController.disconnectTwitchAccount);

// ── Bluesky V2 ──
router.get('/bluesky/url', verifyAuth, blueskyController.getBlueskyAuthUrl);
router.get('/bluesky/comments', verifyAuth, requireBrandMember, blueskyController.getBlueskyComments);
/**
 * @openapi
 * /v2/social/bluesky/published-posts:
 *   get:
 *     summary: Get Bluesky published posts list for brand
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bluesky published posts list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/bluesky/published-posts', verifyAuth, requireBrandMember, blueskyController.getBlueskyPublishedPosts);
router.post('/bluesky/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectBlueskyAccount);

// ── Account Reassignment V2 ──
router.post('/reassign', verifyAuth, socialConnectionController.reassignSocialAccount);

/**
 * @openapi
 * /v2/social/posting-usage:
 *   get:
 *     summary: Fair Use daily posting usage per connected account (rolling 24h)
 *     tags: [Social V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Per-account daily usage returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/posting-usage', verifyAuth, requireBrandMember, postingUsageController.getDailyUsage);

module.exports = router;
