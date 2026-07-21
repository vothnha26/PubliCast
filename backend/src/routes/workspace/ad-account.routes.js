const express = require('express');
const adAccountController = require('../../controllers/workspace/ad-account.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAuth);

/**
 * GET /api/ad-accounts/performance
 * Get all connected ad accounts and aggregated analytics
 * requireBrandMember: brandId is a plain query param with no ownership
 * check otherwise — any authenticated user could read another brand's ad
 * performance data (see issue #48).
 */
router.get('/performance', requireBrandMember, adAccountController.getAdPerformanceData);

/**
 * POST /api/ad-accounts/campaigns/toggle
 * Toggle campaign state (Active/Paused)
 */
router.post('/campaigns/toggle', adAccountController.toggleCampaignStatus);

/**
 * POST /api/ad-accounts/connect
 * Connect/Link a new simulated ad account
 * requireBrandMember: brandId comes from the request body with no check —
 * without it, any authenticated user could create an AdAccount (with a
 * fabricated access token) under a brand they don't belong to.
 */
router.post('/connect', requireBrandMember, adAccountController.connectAdAccount);

module.exports = router;
