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

module.exports = router;
