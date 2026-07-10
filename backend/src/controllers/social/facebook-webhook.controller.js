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
        return res.status(200).send(String(challenge));
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
      // We still return 200 if possible or avoid crashing
      if (!res.headersSent) {
        res.status(200).send('EVENT_RECEIVED');
      }
    }
  };
}

module.exports = new FacebookWebhookController();
