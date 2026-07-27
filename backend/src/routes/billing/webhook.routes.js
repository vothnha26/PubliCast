const express = require('express');
const router = express.Router();
const { sepayAuth } = require('../../middlewares/sepay-auth.middleware');
const webhookController = require('../../controllers/billing/webhook.controller');

/**
 * Webhook Routes
 * IMPORTANT: These routes do NOT use verifyAuth (JWT) because SePay is an external service.
 * They use sepayAuth instead, which validates SePay's own API key from the Authorization header.
 *
 * SePay webhook payload example:
 * {
 *   "id": 12345,
 *   "gateway": "MB Bank",
 *   "transactionDate": "2026-06-25 21:30:00",
 *   "accountNumber": "0123456789",
 *   "content": "PUBLICAST-PRO-ABC12345-1719350400000",  ← transactionCode
 *   "transferAmount": 490000,
 *   "referenceCode": "FT261761234",
 *   "description": "Chuyen khoan ngan hang"
 * }
 */

// POST /api/webhooks/sepay
// SePay calls this when money arrives in our bank account
router.post('/sepay', sepayAuth, webhookController.handleSepayWebhook);

module.exports = router;
