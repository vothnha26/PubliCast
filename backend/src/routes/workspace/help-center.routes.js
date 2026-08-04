const express = require('express');
const helpCenterController = require('../../controllers/workspace/help-center.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const helpAskRateLimiter = require('../../middlewares/help-ask-rate-limit.middleware');

const router = express.Router();

// Help Center is global (not brand-scoped) — only requires a logged-in user.
router.use(verifyAuth);

/**
 * GET /api/v2/help/articles?category=
 */
router.get('/articles', helpCenterController.listArticles);

/**
 * GET /api/v2/help/articles/:slug
 */
router.get('/articles/:slug', helpCenterController.getArticleBySlug);

/**
 * POST /api/v2/help/ask
 * Body: { question }
 */
router.post('/ask', helpAskRateLimiter, helpCenterController.ask);

module.exports = router;
