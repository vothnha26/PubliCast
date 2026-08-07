const { SignatureError } = require('@upstash/qstash');
const { qstashReceiver } = require('../config/qstash');
const logger = require('../utils/logger');

/**
 * qstashAuth middleware
 * Verifies the Upstash-Signature header so only genuine QStash deliveries
 * reach the handler — mirrors sepayAuth's role for the SePay webhook.
 * Uses req.rawBody (captured by app.js's express.json() verify callback,
 * same mechanism facebook-webhook.controller.js relies on) rather than a
 * route-level express.raw() — the global express.json() upstream already
 * consumes the request stream, so a second raw parser here would see an
 * empty body and fail verification against QStash's signed hash.
 */
const qstashAuth = async (req, res, next) => {
  try {
    const signature = req.headers['upstash-signature'];
    if (!signature) {
      return res.status(401).json({ success: false, message: 'Missing Upstash-Signature header' });
    }

    const rawBody = (req.rawBody || Buffer.from('')).toString('utf8');
    await qstashReceiver.verify({ signature, body: rawBody });

    next();
  } catch (err) {
    if (err instanceof SignatureError) {
      logger.warn('[qstashAuth] Invalid signature', { ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
    logger.error('[qstashAuth] Verification error', { error: err.message });
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

module.exports = { qstashAuth };
