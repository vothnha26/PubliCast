const express = require('express');
const helpCenterController = require('../../controllers/workspace/help-center.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const helpAskRateLimiter = require('../../middlewares/help-ask-rate-limit.middleware');

const router = express.Router();

// Reading published articles is public — anyone can browse the docs
// without an account, same as any other help center. Only /ask requires
// login: each question costs an embedding + LLM call, and the rate
// limiter below is keyed per-user (falls back to IP for anonymous callers).

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
router.post('/ask', verifyAuth, helpAskRateLimiter, helpCenterController.ask);

module.exports = router;
