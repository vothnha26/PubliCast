const express = require('express');
const livestreamController = require('../../controllers/workspace/livestream.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Apply auth middleware to all livestream routes
router.use(verifyAuth);

/**
 * GET /api/livestreams/history
 * Fetch stream history records
 */
router.get('/history', livestreamController.getStreamHistory);
router.get('/:id', livestreamController.getStreamById);

module.exports = router;
