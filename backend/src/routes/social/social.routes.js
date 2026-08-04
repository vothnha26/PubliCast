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

const youtubePubSubController = require('../../controllers/social/youtube-pubsub.controller');

const router = express.Router();

// YouTube PubSubHubbub Webhooks (Public Webhook Endpoints - No Auth Middleware)
router.get('/youtube/pubsub/callback', youtubePubSubController.verifyWebhook);
router.post('/youtube/pubsub/callback', express.raw({ type: ['application/atom+xml', 'text/xml', 'application/xml'] }), youtubePubSubController.handleEventPayload);

// OAuth
router.get('/google/url', verifyAuth, oauthController.getGoogleAuthUrl);
router.get('/google/callback', oauthController.googleCallback);
router.get('/google-drive/auth-url', verifyAuth, oauthController.getGoogleDriveAuthUrl);
router.get('/google-drive/callback', oauthController.googleDriveCallback);
router.get('/facebook/url', verifyAuth, oauthController.getFacebookAuthUrl);
router.get('/facebook/callback', oauthController.facebookCallback);
router.get('/facebook/webhook', facebookWebhookController.verifyWebhook);
router.post('/facebook/webhook', facebookWebhookController.handleWebhookEvent);
router.get('/instagram/url', verifyAuth, oauthController.getInstagramAuthUrl);
router.get('/instagram/callback', oauthController.instagramCallback);
router.get('/tiktok/url', verifyAuth, oauthController.getTikTokAuthUrl);
router.get('/tiktok/callback', oauthController.tiktokCallback);
router.get('/tiktok/webhook', oauthController.handleTikTokWebhook);
router.post('/tiktok/webhook', oauthController.handleTikTokWebhook);
router.get('/threads/url', verifyAuth, oauthController.getThreadsAuthUrl);
router.get('/threads/callback', oauthController.threadsCallback);
router.get('/reddit/url', verifyAuth, redditController.getAuthUrl);
router.get('/reddit/callback', redditController.callback);
router.get('/reddit/subreddits', verifyAuth, requireBrandMember, redditController.getUserSubreddits);
router.get('/reddit/subreddits/search', verifyAuth, requireBrandMember, redditController.searchSubreddits);
router.get('/reddit/subreddits/:subreddit/flairs', verifyAuth, requireBrandMember, redditController.getSubredditFlairs);
router.post('/reddit/disconnect', verifyAuth, requireManageConnections, redditController.disconnect);

// Twitch
router.get('/twitch/url', verifyAuth, twitchController.getTwitchAuthUrl);
router.get('/twitch/callback', twitchController.twitchCallback);
router.post('/twitch/disconnect', verifyAuth, requireManageConnections, twitchController.disconnectTwitchAccount);
router.post('/reddit/submit', verifyAuth, requireBrandMember, redditController.submitPost);

// Facebook Features
router.get('/facebook/published-posts', verifyAuth, requireBrandMember, facebookController.getFacebookPublishedPosts);
router.post('/facebook/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectFacebookAccount);

// Facebook Reels
// Already verifies brand access inline via brandRepository.userCanAccessBrand
router.get('/facebook/reels/:videoId/copyright-check', verifyAuth, facebookController.checkFacebookReelCopyright);

// Facebook Competitors
// deleteFacebookCompetitor verifies ownership itself (brandId isn't in the
// URL alone — see facebook-competitor.service.js), so no route-level guard here.
router.get('/facebook/search-pages', verifyAuth, requireBrandMember, facebookController.searchFacebookPages);
router.post('/facebook/competitors', verifyAuth, requireBrandMember, facebookController.addFacebookCompetitor);
router.get('/facebook/competitors', verifyAuth, requireBrandMember, facebookController.getFacebookCompetitors);
router.delete('/facebook/competitors/:id', verifyAuth, facebookController.deleteFacebookCompetitor);

router.post('/instagram/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectInstagramAccount);
router.post('/tiktok/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectTikTokAccount);
router.post('/threads/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectThreadsAccount);
router.get('/bluesky/client-metadata.json', blueskyController.getClientMetadata);
router.get('/bluesky/url', verifyAuth, blueskyController.getBlueskyAuthUrl);
router.get('/bluesky/comments', verifyAuth, requireBrandMember, blueskyController.getBlueskyComments);
router.get('/bluesky/callback', blueskyController.blueskyCallback);
router.post('/bluesky/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectBlueskyAccount);
router.post('/telegram/connect', verifyAuth, requireManageConnections, telegramController.connectTelegram);
router.post('/telegram/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectTelegramAccount);
// NOTE: /reassign checks MANAGE_CONNECTIONS on BOTH the source and target brand
// inside the controller (authorizationFacade called twice), not via this
// single-brandId middleware — see reassignSocialAccount in social-connection.controller.js.
router.post('/reassign', verifyAuth, socialConnectionController.reassignSocialAccount);
router.get('/tiktok/published-videos', verifyAuth, requireBrandMember, tiktokController.getTikTokPublishedVideos);
router.get('/tiktok/comments', verifyAuth, requireBrandMember, tiktokController.getTikTokComments);
router.get('/instagram/published-posts', verifyAuth, requireBrandMember, instagramController.getInstagramPublishedPosts);
router.get('/instagram/audio-search', verifyAuth, requireBrandMember, instagramController.searchAudio);
router.get('/threads/published-posts', verifyAuth, requireBrandMember, threadsController.getThreadsPublishedPosts);

// Real-time Metrics
router.get('/metrics', verifyAuth, checkPermission(PERMISSION_KEYS.VIEW_ANALYTICS), socialAnalyticsController.getMetrics);

// YouTube Tracked Videos
/**
 * @swagger
 * /social/youtube/track:
 *   post:
 *     summary: Track a YouTube video by URL
 *     tags: [YouTube]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, videoUrl]
 *             properties:
 *               brandId:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video tracked successfully
 *                 data:
 *                   type: object
 */
router.post('/youtube/track', verifyAuth, requireBrandMember, youtubeController.trackYouTubeVideo);
router.get('/youtube/tracked-videos', verifyAuth, requireBrandMember, youtubeController.getTrackedVideos);

/**
 * @swagger
 * /social/youtube/published-videos:
 *   get:
 *     summary: List published YouTube videos for a brand
 *     description: >
 *       Response is NOT wrapped in an envelope on v1 — the raw service
 *       result is returned as-is. See /api/v2/social/youtube/published-videos
 *       for the {message, data}-wrapped equivalent.
 *     tags: [YouTube]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of published videos (unwrapped)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 videos:
 *                   type: array
 *                   items:
 *                     type: object
 *                 nextPageToken:
 *                   type: string
 *                   nullable: true
 *                 prevPageToken:
 *                   type: string
 *                   nullable: true
 */
router.get('/youtube/published-videos', verifyAuth, requireBrandMember, youtubeController.getYouTubePublishedVideos);
router.put('/youtube/videos', verifyAuth, requireBrandMember, youtubeController.updateYouTubeVideo);
router.get('/youtube/video-analytics', verifyAuth, requireBrandMember, youtubeController.getYouTubeVideoAnalytics);
router.get('/youtube/video-insights', verifyAuth, requireBrandMember, youtubeController.getYouTubeVideoInsights);
router.get('/youtube/playlists', verifyAuth, requireBrandMember, youtubeController.getYouTubePlaylists);
router.get('/youtube/video-categories', verifyAuth, requireBrandMember, youtubeController.getYouTubeVideoCategories);

// YouTube Competitors
// deleteYouTubeCompetitor verifies ownership itself (brandId comes from
// query, cross-checked in youtube-analytics.service.js), no route-level guard.
router.get('/youtube/search-channels', verifyAuth, requireBrandMember, youtubeController.searchYouTubeChannels);
router.post('/youtube/competitors', verifyAuth, requireBrandMember, youtubeController.addYouTubeCompetitor);
router.get('/youtube/competitors', verifyAuth, requireBrandMember, youtubeController.getYouTubeCompetitors);
router.delete('/youtube/competitors/:id', verifyAuth, youtubeController.deleteYouTubeCompetitor);

// Google Drive
// requireBrandMember closes an IDOR: without it, any authenticated user on a
// plan with GOOGLE_DRIVE could list/download another brand's Drive files —
// the server calls the Google API using that brand's stored OAuth token.
router.get('/google/drive/files', verifyAuth, requireBrandMember, requireFeature(PRODUCT_IDS.GOOGLE_DRIVE), googleDriveController.getGoogleDriveFiles);
router.post('/google/drive/download', verifyAuth, requireBrandMember, requireFeature(PRODUCT_IDS.GOOGLE_DRIVE), googleDriveController.downloadGoogleDriveFile);
router.post('/google/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectGoogleAccount);
router.post('/google-drive/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectGoogleDriveAccount);

module.exports = router;

