const express = require('express');
const oauthController = require('../../controllers/social/oauth.controller');
const youtubeController = require('../../controllers/social/youtube.controller');
const facebookController = require('../../controllers/social/facebook.controller');
const facebookWebhookController = require('../../controllers/social/facebook-webhook.controller');
const tiktokController = require('../../controllers/social/tiktok.controller');
const instagramController = require('../../controllers/social/instagram.controller');
const googleDriveController = require('../../controllers/social/google-drive.controller');
const socialAnalyticsController = require('../../controllers/social/social-analytics.controller');
const socialConnectionController = require('../../controllers/social/social-connection.controller');
const telegramController = require('../../controllers/social/telegram.controller');
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

module.exports = router;
