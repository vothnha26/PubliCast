/**
 * BasePaymentGateway
 * OCP + LSP: Abstract base class defining the interface for all payment gateways.
 * Any new gateway (MoMo, ZaloPay...) must extend this and implement all methods.
 * SubscriptionService only depends on this base - never on concrete implementations.
 */
class BasePaymentGateway {
  /**
   * Generate a payment QR code or payment URL
   * @param {Object} params
   * @param {number} params.amount - Amount in VND
   * @param {string} params.transactionCode - Unique transaction reference
   * @param {string} params.description - Payment description shown to user
   * @returns {Promise<{ qrDataUrl: string, deeplink: string|null }>}
   */
  async generatePayment({ amount, transactionCode, description }) {
    throw new Error(`${this.constructor.name} must implement generatePayment()`);
  }

  /**
   * Verify an incoming webhook request is authentic
   * @param {Object} headers - HTTP request headers
   * @param {Object} body - Raw request body
   * @returns {boolean}
   */
  verifyWebhook(headers, body) {
    throw new Error(`${this.constructor.name} must implement verifyWebhook()`);
  }

  /**
   * Extract transaction code and amount from a verified webhook payload
   * @param {Object} body - Webhook body
   * @returns {{ transactionCode: string, amount: number }}
   */
  extractWebhookData(body) {
    throw new Error(`${this.constructor.name} must implement extractWebhookData()`);
  }
}

module.exports = BasePaymentGateway;
