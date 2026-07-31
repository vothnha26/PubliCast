const express = require('express');
const youtubeControllerV2 = require('../../controllers/social/youtube.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = checkPermission;

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Social YouTube V2
 *   description: YouTube Integration & Analytics endpoints (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/social/youtube/track:
 *   post:
 *     summary: Track a YouTube video by URL or ID
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [videoUrl, brandId]
 *             properties:
 *               videoUrl: { type: string, example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
 *               brandId: { type: string }
 *     responses:
 *       200:
 *         description: Video tracking added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/track', verifyAuth, requireBrandMember, youtubeControllerV2.trackYouTubeVideo);

/**
 * @openapi
 * /v2/social/youtube/tracked-videos:
 *   get:
 *     summary: Get list of tracked YouTube videos for brand
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tracked videos list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/tracked-videos', verifyAuth, requireBrandMember, youtubeControllerV2.getTrackedVideos);

/**
 * @openapi
 * /v2/social/youtube/published-videos:
 *   get:
 *     summary: Get YouTube channel published videos
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Published videos list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/published-videos', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubePublishedVideos);

/**
 * @openapi
 * /v2/social/youtube/videos:
 *   put:
 *     summary: Update YouTube video details (title, description, tags)
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [videoId, title, brandId]
 *             properties:
 *               videoId: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               brandId: { type: string }
 *     responses:
 *       200:
 *         description: Video updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/videos', verifyAuth, requireBrandMember, youtubeControllerV2.updateYouTubeVideo);

/**
 * @openapi
 * /v2/social/youtube/video-analytics:
 *   get:
 *     summary: Get YouTube video analytics stats
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: videoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Video analytics metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/video-analytics', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeVideoAnalytics);

/**
 * @openapi
 * /v2/social/youtube/video-insights:
 *   get:
 *     summary: Get YouTube video insights and engagement data
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Insights data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/video-insights', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeVideoInsights);

/**
 * @openapi
 * /v2/social/youtube/playlists:
 *   get:
 *     summary: Get channel playlists
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Playlists list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/playlists', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubePlaylists);

/**
 * @openapi
 * /v2/social/youtube/video-categories:
 *   get:
 *     summary: Get YouTube video categories
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Categories list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/video-categories', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeVideoCategories);

/**
 * @openapi
 * /v2/social/youtube/search-channels:
 *   get:
 *     summary: Search YouTube channels
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Channels search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/search-channels', verifyAuth, requireBrandMember, youtubeControllerV2.searchYouTubeChannels);

/**
 * @openapi
 * /v2/social/youtube/competitors:
 *   post:
 *     summary: Add YouTube competitor channel to track
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, channelId]
 *             properties:
 *               brandId: { type: string }
 *               channelId: { type: string }
 *     responses:
 *       200:
 *         description: Competitor added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   get:
 *     summary: Get tracked competitor channels
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Competitor list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/competitors', verifyAuth, requireBrandMember, youtubeControllerV2.addYouTubeCompetitor);
router.get('/competitors', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeCompetitors);

/**
 * @openapi
 * /v2/social/youtube/competitors/{id}:
 *   delete:
 *     summary: Remove competitor channel from tracking
 *     tags: [Social YouTube V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Competitor removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.delete('/competitors/:id', verifyAuth, youtubeControllerV2.deleteYouTubeCompetitor);

module.exports = router;
