const facebookWebhookService = require('../../services/social/facebook/facebook-webhook.service');
const logger = require('../../utils/logger');

class FacebookWebhookController {
  verifyWebhook = (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;

      if (mode === 'subscribe' && token === verifyToken) {
        logger.info('[Facebook Webhook] Verification successful.');
        return res.status(200).send(challenge);
      } else {
        logger.warn('[Facebook Webhook] Verification failed. Token mismatch.');
        return res.sendStatus(403);
      }
    } catch (error) {
      logger.error('[Facebook Webhook] Error in verification:', error);
      return res.sendStatus(500);
    }
  };

  handleWebhookEvent = (req, res) => {
    try {
      // Verify Meta Webhook Signature
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) {
        logger.warn('[Facebook Webhook] Signature verification failed. Missing x-hub-signature-256 header.');
        return res.sendStatus(401);
      }

      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!appSecret) {
        logger.warn('[Facebook Webhook] Signature verification failed. Missing FACEBOOK_APP_SECRET.');
        return res.sendStatus(500);
      }

      const crypto = require('crypto');
      const parts = signature.split('=');
      const signatureHash = parts[1];
      const expectedHash = crypto
        .createHmac('sha256', appSecret)
        .update(req.rawBody || '')
        .digest('hex');

      const providedBuf = Buffer.from(signatureHash || '', 'hex');
      const expectedBuf = Buffer.from(expectedHash, 'hex');

      if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        logger.warn('[Facebook Webhook] Signature verification failed. Hash mismatch.');
        return res.sendStatus(403);
      }

      const payload = req.body;
      logger.info('[Facebook Webhook] Event received:', JSON.stringify(payload));

      // Respond immediately to Meta to avoid timeouts (Meta expects 200 OK within 3s)
      res.status(200).send('EVENT_RECEIVED');

      // Process the event asynchronously
      facebookWebhookService.processEvent(payload).catch(err => {
        logger.error('[Facebook Webhook Service] Error processing event asynchronously:', err);
      });
    } catch (error) {
      logger.error('[Facebook Webhook] Error handling event:', error);
      if (!res.headersSent) {
        res.status(200).send('EVENT_RECEIVED');
      }
    }
  };
}

module.exports = new FacebookWebhookController();
