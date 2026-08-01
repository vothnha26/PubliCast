const express = require('express');
const highlightController = require('../../controllers/workspace/highlight.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Highlights V2
 *   description: AI video highlight extraction (v2 Envelope API)
 */

router.post('/import', highlightController.createHighlight);
router.get('/:id/status', highlightController.getHighlight);
router.post('/:id/publish-youtube', highlightController.publishHighlightToYouTube);

module.exports = router;
