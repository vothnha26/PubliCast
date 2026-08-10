const express = require('express');
const router = express.Router();
const { qstashAuth } = require('../../middlewares/qstash-auth.middleware');
const qstashController = require('../../controllers/webhooks/qstash.controller');

/**
 * QStash Webhook Routes
 * IMPORTANT: These do NOT use verifyAuth (JWT) — QStash is a server-to-server
 * caller authenticated via qstashAuth (Upstash-Signature verification, using
 * req.rawBody captured by app.js's global express.json() middleware).
 */

// POST /api/webhooks/qstash/social-sync
router.post('/social-sync', qstashAuth, qstashController.handleSocialSync);

// POST /api/webhooks/qstash/metrics-sync
router.post('/metrics-sync', qstashAuth, qstashController.handleMetricsSync);

// POST /api/webhooks/qstash/posts-sync
router.post('/posts-sync', qstashAuth, qstashController.handlePostsSync);

// POST /api/webhooks/qstash/publish-post
router.post('/publish-post', qstashAuth, qstashController.handlePublishPost);

// POST /api/webhooks/qstash/publish-post-failed (QStash failureCallback target)
router.post('/publish-post-failed', qstashAuth, qstashController.handlePublishPostFailed);

module.exports = router;
