const express = require('express');
const aiController = require('../../controllers/workspace/ai.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');
const { PRODUCT_IDS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: AI Assistant V2
 *   description: AI content generation & settings endpoints (v2 Envelope API)
 */

router.get('/config', aiController.getConfig);
router.get('/settings', requireBrandMember, aiController.getSettings);
router.put('/settings', requireBrandMember, aiController.updateSettings);
router.get('/history', requireBrandMember, aiController.getHistory);
router.post('/generate', requireBrandMember, requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE), aiController.generateContent);
router.post('/quick-post', requireBrandMember, requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE), aiController.quickPost);

module.exports = router;
