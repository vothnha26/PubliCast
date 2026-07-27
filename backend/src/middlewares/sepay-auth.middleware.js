const PaymentGatewayFactory = require('../services/billing/payment-gateway/payment-gateway.factory');
const logger = require('../utils/logger');

// Instantiate the gateway once - used for webhook verification
const gateway = PaymentGatewayFactory.getGateway();

/**
 * sepayAuth middleware
 * SRP: Only verifies that the incoming request genuinely comes from SePay.
 * Uses the gateway's verifyWebhook() so if we switch gateways, no change needed here.
 */
const sepayAuth = (req, res, next) => {
  const isValid = gateway.verifyWebhook(req.headers, req.body);

  if (!isValid) {
    logger.warn('[sepayAuth] Unauthorized webhook attempt', {
      ip: req.ip,
      headers: { authorization: req.headers['authorization'] }
    });
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  next();
};

module.exports = { sepayAuth };
