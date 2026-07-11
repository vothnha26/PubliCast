const express = require('express');
const hashtagController = require('../../controllers/workspace/hashtag.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');

const router = express.Router();

// Universal auth
router.use(verifyAuth);

/**
 * GET /api/hashtags
 * Retrieve all sets and tracked hashtags for a brand
 */
router.get('/', checkBrandAccess, hashtagController.getHashtagData);

/**
 * GET /api/hashtags/trending
 * Get trending hashtags by platform
 */
router.get('/trending', hashtagController.getTrendingHashtags);

/**
 * POST /api/hashtags/sets
 * Create a new hashtag set
 */
router.post('/sets', checkBrandAccess, hashtagController.createHashtagSet);

/**
 * PUT /api/hashtags/sets/:id
 * Update an existing hashtag set
 */
router.put('/sets/:id', hashtagController.updateHashtagSet);

/**
 * DELETE /api/hashtags/sets/:id
 * Delete a hashtag set
 */
router.delete('/sets/:id', hashtagController.deleteHashtagSet);

/**
 * POST /api/hashtags/track
 * Track a new hashtag
 */
router.post('/track', checkBrandAccess, hashtagController.trackHashtag);

/**
 * DELETE /api/hashtags/track/:id
 * Untrack a hashtag
 */
router.delete('/track/:id', hashtagController.untrackHashtag);

module.exports = router;
