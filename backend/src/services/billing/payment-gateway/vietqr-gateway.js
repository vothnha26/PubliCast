const axios = require('axios');
const crypto = require('crypto');
const BasePaymentGateway = require('./base-gateway');
const logger = require('../../../utils/logger');

/**
 * VietQRGateway
 * LSP: Fully implements BasePaymentGateway contract.
 * OCP: Adding MoMo later does NOT require touching this file.
 * SRP: Only responsible for VietQR API calls and SePay webhook verification.
 */
class VietQRGateway extends BasePaymentGateway {
  constructor() {
    super();
    // All config read from env - no hardcoding
    this.accountNo   = process.env.VIETQR_ACCOUNT_NO;
    this.accountName = process.env.VIETQR_ACCOUNT_NAME;
    this.acqId       = process.env.VIETQR_ACQ_ID;       // Bank BIN code (e.g. 970422 = MB Bank)
    this.template    = process.env.VIETQR_TEMPLATE || 'compact2';
    this.sepayApiKey = process.env.SEPAY_API_KEY;
    this.apiUrl      = 'https://api.vietqr.io/v2/generate';
  }

  /**
   * Call VietQR API to generate a QR code image (base64)
   * Amount and description are server-controlled - user cannot modify them
   */
  async generatePayment({ amount, transactionCode, description }) {
    try {
      const payload = {
        accountNo:   this.accountNo,
        accountName: this.accountName,
        acqId:       this.acqId,
        amount:      amount,
        addInfo:     transactionCode,   // This is the content user MUST include when transferring
        format:      'text',
        template:    this.template
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.code !== '00') {
        throw new Error(`VietQR API error: ${response.data.desc}`);
      }

      logger.info('[VietQRGateway] QR generated', { transactionCode, amount });

      return {
        qrDataUrl: response.data.data.qrDataURL,   // base64 QR image
        deeplink:  response.data.data.qrCode || null,
        bankInfo: {
          bankName:    'MB Bank',
          accountNo:   this.accountNo,
          accountName: this.accountName
        }
      };
    } catch (error) {
      logger.error('[VietQRGateway] Failed to generate QR', { error: error.message });
      throw new Error('Không thể tạo mã QR. Vui lòng thử lại!');
    }
  }

  /**
   * Verify SePay webhook by checking the Authorization header.
   * SePay sends: Authorization: Apikey <your_api_key>
   *
   * Security notes:
   * - Fail-closed: if SEPAY_API_KEY is unset/empty the webhook is rejected.
   *   (Env validation also requires it at startup, but this guards defence-in-depth
   *   against an empty-string key matching an empty presented token — see #116.)
   * - Constant-time comparison via crypto.timingSafeEqual to avoid leaking the
   *   key through response-timing.
   */
  verifyWebhook(headers) {
    const expected = this.sepayApiKey;

    // No key configured → never accept a webhook (fail-closed).
    if (!expected) {
      logger.error('[VietQRGateway] SEPAY_API_KEY is not configured - rejecting webhook');
      return false;
    }

    const authHeader = headers['authorization'] || headers['Authorization'] || '';
    const token = authHeader.replace('Apikey ', '').trim();

    // Empty presented token can never be valid (also short-circuits before
    // timingSafeEqual, which throws on length mismatch of zero-length buffers).
    if (!token) {
      logger.warn('[VietQRGateway] Webhook verification failed - missing API key');
      return false;
    }

    const tokenBuf = Buffer.from(token, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    // timingSafeEqual requires equal-length buffers; unequal length ⇒ invalid.
    const isValid =
      tokenBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(tokenBuf, expectedBuf);

    if (!isValid) {
      logger.warn('[VietQRGateway] Webhook verification failed - invalid API key');
    }
    return isValid;
  }

  /**
   * Extract transaction code and amount from SePay webhook body
   * SePay sends the transfer content (noi dung CK) in the `content` field
   */
  extractWebhookData(body) {
    return {
      transactionCode: (body.content || '').trim(),
      amount:          Number(body.transferAmount || 0)
    };
  }
}

module.exports = VietQRGateway;
