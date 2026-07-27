const express = require('express');
const smartLinkController = require('../../controllers/workspace/smart-link.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');
const smartLinkPublicRateLimiter = require('../../middlewares/smart-link-rate-limit.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const { PRODUCT_IDS } = require('../../utils/constants');

const router = express.Router();

// Private Endpoints
// SmartLinks (custom_links product) is a PRO/AGENCY-only feature — FREE and
// STARTER plans have no products.some(id === 'custom_links') match in the
// seed data, so requireFeature denies them here. Creation/editing was
// previously gated only by brand membership, so any brand on any plan could
// silently auto-create a SmartLink just by visiting the page (frontend's
// fetchSmartLink -> createInitialSmartLink fallback had no plan check either).
router.get('/', verifyAuth, checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.getSmartLink);
router.post('/', verifyAuth, checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.createSmartLink);
router.get('/:id/analytics', verifyAuth, checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.getAnalytics);
router.put('/:id', verifyAuth, checkBrandAccess, requireFeature(PRODUCT_IDS.CUSTOM_LINKS), smartLinkController.updateSmartLink);

// Public Endpoints
router.get('/public/:slug', smartLinkPublicRateLimiter, smartLinkController.getPublicSmartLink);
router.post('/click/:linkItemId', smartLinkPublicRateLimiter, smartLinkController.trackLinkClick);
router.get('/r/:linkItemId', smartLinkPublicRateLimiter, smartLinkController.redirectLinkClick);

module.exports = router;
