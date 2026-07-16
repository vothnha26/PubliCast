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
const discordController = require('../../controllers/social/discord.controller');
const discordOAuthController = require('../../controllers/social/discord-oauth.controller');
const discordStatsController = require('../../controllers/social/discord-stats.controller');
const threadsController = require('../../controllers/social/threads.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = checkPermission;
const { PRODUCT_IDS, PERMISSION_KEYS } = require('../../utils/constants');

const requireManageConnections = checkPermission(PERMISSION_KEYS.MANAGE_CONNECTIONS);

const router = express.Router();

// OAuth
router.get('/google/url', verifyAuth, oauthController.getGoogleAuthUrl);
router.get('/google/callback', oauthController.googleCallback);
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
router.get('/linkedin/url', verifyAuth, oauthController.getLinkedInAuthUrl);
router.get('/linkedin/callback', oauthController.linkedinCallback);
router.get('/threads/url', verifyAuth, oauthController.getThreadsAuthUrl);
router.get('/threads/callback', oauthController.threadsCallback);
router.get('/discord/url', verifyAuth, discordOAuthController.getDiscordAuthUrl);
router.get('/discord/callback', discordOAuthController.discordCallback);
router.get('/discord/channels', verifyAuth, discordOAuthController.getGuildChannels);
router.post('/discord/connect-channel', verifyAuth, requireManageConnections, discordOAuthController.connectGuildChannel);
router.post('/discord/connect-server', verifyAuth, requireManageConnections, discordOAuthController.connectGuildServer);
router.post('/discord/disconnect-channel', verifyAuth, requireManageConnections, discordOAuthController.disconnectGuildChannel);
router.get('/discord/stats', verifyAuth, requireBrandMember, discordStatsController.getStats);
router.post('/discord/snapshot', verifyAuth, requireBrandMember, discordStatsController.triggerSnapshot);

// Facebook Features
router.get('/facebook/published-posts', verifyAuth, requireBrandMember, facebookController.getFacebookPublishedPosts);
router.post('/facebook/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectFacebookAccount);

// Facebook Post Detail Analytics
// These three already verify brand access inline via brandRepository.userCanAccessBrand
router.get('/facebook/post-insights', verifyAuth, facebookController.getFacebookPostInsights);
router.get('/facebook/post-analytics', verifyAuth, facebookController.getFacebookPostAnalytics);
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
router.post('/linkedin/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectLinkedInAccount);
router.post('/threads/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectThreadsAccount);
router.post('/telegram/connect', verifyAuth, requireManageConnections, telegramController.connectTelegram);
router.post('/telegram/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectTelegramAccount);
router.post('/discord/connect', verifyAuth, requireManageConnections, discordController.connectDiscord);
router.post('/discord/disconnect', verifyAuth, requireManageConnections, socialConnectionController.disconnectDiscordAccount);
// NOTE: /reassign checks MANAGE_CONNECTIONS on BOTH the source and target brand
// inside the controller (authorizationFacade called twice), not via this
// single-brandId middleware — see reassignSocialAccount in social-connection.controller.js.
router.post('/reassign', verifyAuth, socialConnectionController.reassignSocialAccount);
router.get('/tiktok/published-videos', verifyAuth, requireBrandMember, tiktokController.getTikTokPublishedVideos);
router.get('/instagram/published-posts', verifyAuth, requireBrandMember, instagramController.getInstagramPublishedPosts);
router.get('/instagram/audio-search', verifyAuth, requireBrandMember, instagramController.searchAudio);
router.get('/threads/published-posts', verifyAuth, requireBrandMember, threadsController.getThreadsPublishedPosts);

// Real-time Metrics
router.get('/metrics', verifyAuth, checkPermission(PERMISSION_KEYS.VIEW_ANALYTICS), socialAnalyticsController.getMetrics);

// YouTube Tracked Videos
router.post('/youtube/track', verifyAuth, requireBrandMember, youtubeController.trackYouTubeVideo);
router.get('/youtube/tracked-videos', verifyAuth, requireBrandMember, youtubeController.getTrackedVideos);
router.get('/youtube/published-videos', verifyAuth, requireBrandMember, youtubeController.getYouTubePublishedVideos);
router.get('/youtube/video-analytics', verifyAuth, requireBrandMember, youtubeController.getYouTubeVideoAnalytics);
router.get('/youtube/video-insights', verifyAuth, requireBrandMember, youtubeController.getYouTubeVideoInsights);
router.get('/youtube/playlists', verifyAuth, requireBrandMember, youtubeController.getYouTubePlaylists);

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

module.exports = router;

