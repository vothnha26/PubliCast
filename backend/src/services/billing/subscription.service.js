const PaymentGatewayFactory  = require('./payment-gateway/payment-gateway.factory');
const planActivationService   = require('./plan-activation.service');
const paymentRepository       = require('../../repositories/billing/payment.repository');
const subscriptionRepository  = require('../../repositories/billing/subscription.repository');
const addonRepository         = require('../../repositories/billing/addon.repository');
const logger                  = require('../../utils/logger');
const notificationService     = require('../core/notification.service');
const { NOTIFICATION_TYPES, PERMISSION_KEYS } = require('../../utils/constants');
const authorizationFacade     = require('../auth/authorization.facade');

/**
 * SubscriptionService (Orchestrator)
 * SRP: Orchestrates the payment flow - does NOT handle QR generation or DB writes itself.
 * DIP: Depends on abstractions (gateway via factory, repos, planActivationService).
 *      The concrete gateway (VietQR) is injected, never imported directly.
 */
class SubscriptionService {
  constructor(paymentGateway) {
    // DIP: gateway is injected, not created here
    this.gateway = paymentGateway;
  }

  /**
   * Step 1: User clicks "Upgrade"
   * Creates a PendingPayment and returns QR data for display
   */
  async initiatePayment(brandId, planId, billingCycle = 'MONTHLY') {
    // 1. Get plan details from DB (price, name, billing cycle)
    let plan = await subscriptionRepository.findPlanById(planId).catch(() => null);
    if (!plan) {
      // If planId is not a valid UUID, try finding by name
      plan = await subscriptionRepository.findPlanByName(planId.replace('placeholder-id-for-', ''));
    }
    if (!plan) throw Object.assign(new Error('Gói không tồn tại'), { status: 404 });
    if (!plan.isActive) throw Object.assign(new Error('Gói này hiện không khả dụng'), { status: 400 });

    // Ensure we use the real plan.id from DB for the rest of the flow
    planId = plan.id;

    // 2. Calculate amount based on billing cycle
    //    MONTHLY: pay plan.priceAmount once
    //    ANNUAL:  pay plan.priceAmount * 12 upfront (one year)
    const unitPrice = parseFloat(plan.priceAmount);
    const isAnnual  = billingCycle === 'ANNUAL';
    const amount    = isAnnual ? unitPrice * 12 : unitPrice;

    // 3. Build a unique transaction code the user MUST put in transfer content
    const shortBrand = brandId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const transactionCode = `PUBLICAST-${plan.name}-${shortBrand}-${Date.now()}`;

    // 4. Calculate expiry (15 minutes from now)
    const expiryMinutes = parseInt(process.env.PAYMENT_QR_EXPIRY_MINUTES || '15', 10);
    const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 5. Save PendingPayment to DB BEFORE calling VietQR
    await paymentRepository.createPending({
      transactionCode,
      planId,
      brandId,
      amount,
      currency:  plan.currency,
      expiredAt
    });

    // 6. Ask the gateway (VietQR) to generate a QR image
    const qrResult = await this.gateway.generatePayment({
      amount,
      transactionCode,
      description: `Nang cap goi ${plan.name} (${billingCycle}) - PubliCast`
    });

    logger.info('[SubscriptionService] Payment initiated', { brandId, planId, transactionCode, billingCycle, amount });

    // 7. Return everything the frontend needs to display the payment screen
    return {
      transactionCode,
      expiredAt,
      billingCycle,
      plan: {
        name:         plan.name,
        amount,
        unitPrice,
        currency:     plan.currency,
        billingCycle
      },
      bankInfo:  qrResult.bankInfo,
      qrDataUrl: qrResult.qrDataUrl,
      deeplink:  qrResult.deeplink
    };
  }

  /**
   * Step 1.b: User clicks "Buy Add-on"
   * Creates a PendingPayment for an Addon purchase
   */
  async initiateAddonPayment(brandId, addonId, quantity = 1) {
    const addon = await addonRepository.findById(addonId);
    if (!addon) throw Object.assign(new Error('Addon không tồn tại'), { status: 404 });
    if (!addon.isActive) throw Object.assign(new Error('Addon này hiện không khả dụng'), { status: 400 });

    const totalAmount = parseFloat(addon.priceAmount) * quantity;
    const shortBrand = brandId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const transactionCode = `PUBADDON-${addon.type}-${shortBrand}-${Date.now()}`;

    const expiryMinutes = parseInt(process.env.PAYMENT_QR_EXPIRY_MINUTES || '15', 10);
    const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await paymentRepository.createPending({
      transactionCode,
      planId: null,
      addonId,
      brandId,
      amount:    totalAmount,
      currency:  addon.currency,
      expiredAt
    });

    const qrResult = await this.gateway.generatePayment({
      amount:          totalAmount,
      transactionCode,
      description:     `Mua ${quantity}x ${addon.name} - PubliCast`
    });

    logger.info('[SubscriptionService] Addon Payment initiated', { brandId, addonId, transactionCode });

    return {
      transactionCode,
      expiredAt,
      addon: {
        name:     addon.name,
        amount:   totalAmount,
        currency: addon.currency,
        quantity
      },
      bankInfo:  qrResult.bankInfo,
      qrDataUrl: qrResult.qrDataUrl,
      deeplink:  qrResult.deeplink
    };
  }

  /**
   * Step 2: Frontend polls this to know if payment succeeded
   */
  async checkPaymentStatus(transactionCode, userId) {
    const pending = await paymentRepository.findPendingByCode(transactionCode);
    if (!pending) throw Object.assign(new Error('Giao dịch không tồn tại'), { status: 404 });

    const hasAccess = await authorizationFacade.checkBrandAccess(userId, pending.brandId);
    if (!hasAccess) {
      throw Object.assign(new Error('Bạn không có quyền truy cập giao dịch này'), { status: 403 });
    }

    // Check if QR has expired but status is still PENDING
    if (pending.status === 'PENDING' && new Date() > pending.expiredAt) {
      await paymentRepository.updatePendingStatus(transactionCode, 'EXPIRED');

      // Notification: QR hết hạn
      try {
        await notificationService.create({
          brandId: pending.brandId,
          type: NOTIFICATION_TYPES.SYSTEM,
          title: 'Giao dịch đã hết hạn',
          message: 'Mã QR thanh toán đã hết hạn. Vui lòng thực hiện lại giao dịch.',
          actionUrl: '/settings/billing'
        });
      } catch (notifErr) {
        logger.warn('[SubscriptionService] Failed to create expired QR notification', { error: notifErr.message });
      }

      return { status: 'EXPIRED' };
    }

    return { status: pending.status };
  }

  /**
   * Step 3: Called by WebhookController when SePay confirms money received
   * This is the CORE transaction - must be atomic and idempotent
   */
  async handlePaymentConfirmed(transactionCode, receivedAmount) {
    let pending = await paymentRepository.findPendingByCode(transactionCode);

    if (!pending) {
      pending = await paymentRepository.findPendingByWebhookContent(transactionCode);
    }

    // Guard: not found
    if (!pending) {
      logger.warn('[SubscriptionService] Webhook received for unknown transaction', { transactionCode });
      return { success: false, reason: 'NOT_FOUND' };
    }

    // Guard: already processed (idempotency - SePay may retry webhooks)
    if (pending.status !== 'PENDING') {
      logger.info('[SubscriptionService] Duplicate webhook ignored', { transactionCode, status: pending.status });
      return { success: true, reason: 'ALREADY_PROCESSED' };
    }

    // Guard: expired QR
    if (new Date() > pending.expiredAt) {
      await paymentRepository.updatePendingStatus(transactionCode, 'EXPIRED');
      return { success: false, reason: 'EXPIRED' };
    }

    // Guard: amount mismatch (anti-fraud)
    if (receivedAmount < parseFloat(pending.amount)) {
      logger.warn('[SubscriptionService] Insufficient amount received', {
        transactionCode,
        expected: pending.amount,
        received: receivedAmount
      });
      await paymentRepository.updatePendingStatus(transactionCode, 'UNDERPAID');
      return { success: false, reason: 'INSUFFICIENT_AMOUNT' };
    }

    // === ALL CHECKS PASSED ===

    // Get brand's current subscription
    const subscription = await subscriptionRepository.findActivePlanByBrandId(pending.brandId);
    if (!subscription) {
      logger.error('[SubscriptionService] No subscription found for brand', { brandId: pending.brandId });
      return { success: false, reason: 'SUBSCRIPTION_NOT_FOUND' };
    }

    if (pending.planId) {
      // Activate the new plan
      await planActivationService.activate(
        subscription.id,
        pending.planId,
        pending.plan?.billingCycle || 'MONTHLY'
      );
      logger.info('[SubscriptionService] Plan activated', { brandId: pending.brandId, planId: pending.planId });
    } else if (pending.addonId) {
      // Calculate quantity based on total amount paid vs addon unit price
      const unitPrice = parseFloat(pending.addon.priceAmount);
      const quantity = Math.floor(parseFloat(pending.amount) / unitPrice) || 1;
      
      await addonRepository.addSubscriptionAddon(
        subscription.id,
        pending.addonId,
        quantity,
        pending.brandId
      );
      logger.info('[SubscriptionService] Addon activated', { brandId: pending.brandId, addonId: pending.addonId });
    }

    // Create invoice record
    await paymentRepository.createInvoice({
      subscriptionId: subscription.id,
      amount:         parseFloat(pending.amount),
      currency:       pending.currency,
      transactionCode: pending.transactionCode
    });

    // Mark PendingPayment as PAID
    await paymentRepository.updatePendingStatus(pending.transactionCode, 'PAID');

    // Notification: thanh toán thành công
    try {
      const isPlan = Boolean(pending.planId);
      await notificationService.create({
        brandId: pending.brandId,
        type: NOTIFICATION_TYPES.SYSTEM,
        title: isPlan ? 'Nâng cấp gói thành công' : 'Mua add-on thành công',
        message: isPlan
          ? `Gói ${pending.plan?.name || ''} đã được kích hoạt. Cảm ơn bạn đã sử dụng PubliCast!`
          : `Add-on ${pending.addon?.name || ''} đã được kích hoạt thành công.`,
        actionUrl: '/settings/billing'
      });
    } catch (notifErr) {
      logger.warn('[SubscriptionService] Failed to create payment success notification', { error: notifErr.message });
    }

    return { success: true, reason: 'ACTIVATED' };
  }

  async getPlans() {
    return subscriptionRepository.findAllActivePlans();
  }

  async cancelPendingPayment(transactionCode, userId) {
    const pending = await paymentRepository.findPendingByCode(transactionCode);
    if (!pending) {
      throw Object.assign(new Error('Không tìm thấy giao dịch thanh toán'), { status: 404 });
    }
    if (pending.status !== 'PENDING') {
      throw Object.assign(new Error('Giao dịch không ở trạng thái chờ thanh toán'), { status: 400 });
    }

    const isAuthorized = await authorizationFacade.checkPermission(userId, pending.brandId, PERMISSION_KEYS.MANAGE_BILLING);
    if (!isAuthorized) {
      throw Object.assign(new Error('Bạn không có quyền hủy giao dịch này'), { status: 403 });
    }

    return paymentRepository.updatePendingStatus(transactionCode, 'CANCELLED');
  }
}

// DIP: Factory decides which gateway to use based on env
const gateway = PaymentGatewayFactory.getGateway();
module.exports = new SubscriptionService(gateway);
