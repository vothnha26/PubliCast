const express = require('express');
const multer = require('multer');
const smartLinkController = require('../../controllers/workspace/smart-link.controller');
const autoListController = require('../../controllers/workspace/auto-list.controller');
const hashtagController = require('../../controllers/workspace/hashtag.controller');
const postingGoalController = require('../../controllers/workspace/posting-goal.controller');
const calendarEventController = require('../../controllers/workspace/calendar-event.controller');
const stockController = require('../../controllers/stock.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const { PRODUCT_IDS, PERMISSION_KEYS } = require('../../utils/constants');

const smartLinkPublicRateLimiter = require('../../middlewares/smart-link-rate-limit.middleware');

const router = express.Router();

// Public SmartLink endpoints (redirect/tracking) — must be registered before
// router.use(verifyAuth) below, same as smart-link.routes.js v1.
router.get('/smart-links/public/:slug', smartLinkPublicRateLimiter, smartLinkController.getPublicSmartLink);
router.post('/smart-links/click/:linkItemId', smartLinkPublicRateLimiter, smartLinkController.trackLinkClick);

router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Workspace Content Extras V2
 *   description: Smart Links, Auto Lists, Hashtags, Calendar & Stock endpoints (v2 Envelope API)
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
router.get('/smart-links/list', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.listSmartLinks);
router.post('/smart-links', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.createSmartLink);
router.post('/smart-links/:id/clone', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.cloneSmartLink);
router.get('/smart-links/:id/analytics', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.getAnalytics);
router.put('/smart-links/:id', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.updateSmartLink);
router.delete('/smart-links/:id', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.deleteSmartLink);
router.get('/smart-links/:id', checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.getSmartLinkById);

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
router.post('/auto-lists', checkPermission(PERMISSION_KEYS.CREATE_POSTS), autoListController.createAutoList);
router.get('/auto-lists/:id', autoListController.getAutoListDetails);
router.put('/auto-lists/:id', autoListController.updateAutoList);
router.delete('/auto-lists/:id', autoListController.deleteAutoList);
router.patch('/auto-lists/:id/toggle', autoListController.toggleStatus);
router.put('/auto-lists/:id/reorder', autoListController.reorderPosts);

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
router.get('/hashtags/trending', hashtagController.getTrendingHashtags);
router.post('/hashtags/sets', checkBrandAccess, hashtagController.createHashtagSet);
router.put('/hashtags/sets/:id', hashtagController.updateHashtagSet);
router.delete('/hashtags/sets/:id', hashtagController.deleteHashtagSet);
router.post('/hashtags/track', checkBrandAccess, hashtagController.trackHashtag);
router.delete('/hashtags/track/:id', hashtagController.untrackHashtag);
router.post('/hashtags/track/:id/refresh', hashtagController.refreshHashtag);

// ── Posting Goals V2 ──
/**
 * @openapi
 * /v2/content-extras/posting-goals:
 *   get:
 *     summary: Get posting goals with current progress for brand
 *     tags: [Workspace Content Extras V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Posting goals list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/posting-goals', checkBrandAccess, postingGoalController.getPostingGoals);
router.put('/posting-goals', checkBrandAccess, postingGoalController.upsertPostingGoal);
router.delete('/posting-goals/:id', postingGoalController.deletePostingGoal);

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
router.post('/calendar-events', checkPermission('CREATE_POSTS'), calendarEventController.createEvent);

const icsUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.post('/calendar-events/import-ics', icsUpload.single('file'), checkPermission('CREATE_POSTS'), calendarEventController.importIcs);
router.get('/calendar-events/export-ics', checkPermission.requireBrandMember, calendarEventController.exportIcs);
router.delete('/calendar-events/:id', checkPermission('DELETE_POSTS'), calendarEventController.deleteEvent);

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
router.post('/stock/import', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), stockController.importMedia);

module.exports = router;
