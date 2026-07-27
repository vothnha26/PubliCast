const subscriptionService = require('../../services/billing/subscription.service');
const PaymentGatewayFactory = require('../../services/billing/payment-gateway/payment-gateway.factory');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');

const gateway = PaymentGatewayFactory.getGateway();

/**
 * WebhookController
 * SRP: Only receives the SePay webhook, extracts data, and hands off to service.
 *      Authentication is already done by sepayAuth middleware before this runs.
 */
class WebhookController {
  /**
   * POST /api/webhooks/sepay
   * Called by SePay when a bank transfer is detected matching our account.
   * sepayAuth middleware runs BEFORE this - if we reach here, the request is authentic.
   */
  handleSepayWebhook = asyncHandler(async (req, res) => {
    logger.info('[WebhookController] SePay webhook received', {
      content:        req.body.content,
      transferAmount: req.body.transferAmount,
      gateway:        req.body.gateway,
      transactionDate: req.body.transactionDate
    });

    // Extract transactionCode and amount using the gateway's parser
    const { transactionCode, amount } = gateway.extractWebhookData(req.body);

    if (!transactionCode) {
      logger.warn('[WebhookController] Webhook has no transaction code in content', { body: req.body });
      // Return 200 to SePay anyway (so it doesn't keep retrying for irrelevant transfers)
      return res.status(200).json({ success: true, message: 'Ignored - no matching transaction code' });
    }

    // Hand off to service for business logic
    const result = await subscriptionService.handlePaymentConfirmed(transactionCode, amount);

    logger.info('[WebhookController] Webhook processed', { transactionCode, result });

    // Always return 200 to SePay - even on business-logic failure.
    // Returning non-200 causes SePay to retry indefinitely.
    res.status(200).json({ success: true, data: result });
  });
}

module.exports = new WebhookController();
