const express = require('express');
const smartLinkController = require('../../controllers/workspace/smart-link.controller');
const autoListController = require('../../controllers/workspace/auto-list.controller');
const hashtagController = require('../../controllers/workspace/hashtag.controller');
const calendarEventController = require('../../controllers/workspace/calendar-event.controller');
const stockController = require('../../controllers/stock.controller');
const livestreamController = require('../../controllers/workspace/livestream.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const { PRODUCT_IDS, PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();
router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Workspace Content Extras V2
 *   description: Smart Links, Auto Lists, Hashtags, Calendar, Stock & Livestreams endpoints (v2 Envelope API)
 */

// ── Smart Links V2 ──
/**
 * @openapi
 * /v2/content-extras/smart-links:
 *   get:
 *     summary: Get smart links for brand
 *     tags: [Workspace Content Extras V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Smart links list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/smart-links', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.getSmartLink);

// ── Auto Lists V2 ──
/**
 * @openapi
 * /v2/content-extras/auto-lists:
 *   get:
 *     summary: Get auto lists for brand
 *     tags: [Workspace Content Extras V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Auto lists list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/auto-lists', checkPermission(PERMISSION_KEYS.CREATE_POSTS), autoListController.getAutoLists);

// ── Hashtags V2 ──
/**
 * @openapi
 * /v2/content-extras/hashtags:
 *   get:
 *     summary: Get saved hashtag groups for brand
 *     tags: [Workspace Content Extras V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Hashtag groups list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/hashtags', checkBrandAccess, hashtagController.getHashtagData);

// ── Calendar Events V2 ──
/**
 * @openapi
 * /v2/content-extras/calendar-events:
 *   get:
 *     summary: Get calendar events for brand
 *     tags: [Workspace Content Extras V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Calendar events list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/calendar-events', calendarEventController.getEvents);

// ── Stock Assets V2 ──
/**
 * @openapi
 * /v2/content-extras/stock/search:
 *   get:
 *     summary: Search royalty-free stock media assets
 *     tags: [Workspace Content Extras V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Stock search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/stock/search', stockController.searchMedia);

// ── Livestreams V2 ──
/**
 * @openapi
 * /v2/content-extras/livestreams/history:
 *   get:
 *     summary: Get scheduled livestreams history
 *     tags: [Workspace Content Extras V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Livestreams history list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/livestreams/history', livestreamController.getStreamHistory);

module.exports = router;
