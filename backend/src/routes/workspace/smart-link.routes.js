const express = require('express');
const smartLinkController = require('../../controllers/workspace/smart-link.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');
const smartLinkPublicRateLimiter = require('../../middlewares/smart-link-rate-limit.middleware');

const router = express.Router();

// Private Endpoints
router.get('/', verifyAuth, checkBrandAccess, smartLinkController.getSmartLink);
router.post('/', verifyAuth, checkBrandAccess, smartLinkController.createSmartLink);
router.get('/:id/analytics', verifyAuth, checkBrandAccess, smartLinkController.getAnalytics);
router.put('/:id', verifyAuth, checkBrandAccess, smartLinkController.updateSmartLink);

// Public Endpoints
router.get('/public/:slug', smartLinkPublicRateLimiter, smartLinkController.getPublicSmartLink);
router.post('/click/:linkItemId', smartLinkPublicRateLimiter, smartLinkController.trackLinkClick);

module.exports = router;
