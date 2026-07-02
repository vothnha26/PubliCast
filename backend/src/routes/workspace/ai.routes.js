const express = require('express');
const aiController = require('../../controllers/workspace/ai.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const { PRODUCT_IDS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

router.get('/config', aiController.getConfig);
router.get('/settings', aiController.getSettings);
router.put('/settings', aiController.updateSettings);
router.get('/history', aiController.getHistory);
router.post('/generate', requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE), aiController.generateContent);
router.post('/quick-post', requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE), aiController.quickPost);

module.exports = router;
