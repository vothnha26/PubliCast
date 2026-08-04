const PaymentGatewayFactory  = require('./payment-gateway/payment-gateway.factory');
const prisma                  = require('../../config/prisma');
const planActivationService   = require('./plan-activation.service');
const paymentRepository       = require('../../repositories/billing/payment.repository');
const subscriptionRepository  = require('../../repositories/billing/subscription.repository');
const addonRepository         = require('../../repositories/billing/addon.repository');
const logger                  = require('../../utils/logger');
const notificationService     = require('../core/notification.service');
const { NOTIFICATION_TYPES, PERMISSION_KEYS } = require('../../utils/constants');
const authorizationFacade     = require('../auth/authorization.facade');

const MAX_ADDON_QUANTITY = 100;

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
    // Reject non-positive-integer / fractional quantities (e.g. -1, 0, 0.5)
    // before any charge is computed (#103).
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ADDON_QUANTITY) {
      throw Object.assign(
        new Error(`quantity phải là số nguyên từ 1 đến ${MAX_ADDON_QUANTITY}`),
        { status: 400 }
      );
    }

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
      // Snapshot the quantity paid for at initiate time, so confirm reads
      // this instead of recomputing amount/livePrice (which drifts if an
      // admin changes addon.priceAmount between initiate and confirm — #102).
      addonQuantity: quantity,
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

    // Check if QR has expired but status is still PENDING. The frontend polls
    // this endpoint every ~3s, so without a compare-and-swap guard every poll
    // after expiry would re-run updatePendingStatus and re-send the "expired"
    // notification (#103) — expireIfPending only returns true for the single
    // poll that actually performs the PENDING -> EXPIRED transition.
    if (pending.status === 'PENDING' && new Date() > pending.expiredAt) {
      const didTransition = await paymentRepository.expireIfPending(transactionCode);

      if (didTransition) {
        try {
          await notificationService.notifyBrandMembers(pending.brandId, {
            type: NOTIFICATION_TYPES.SYSTEM,
            title: 'Giao dịch đã hết hạn',
            message: 'Mã QR thanh toán đã hết hạn. Vui lòng thực hiện lại giao dịch.',
            actionUrl: '/settings/billing'
          }, 'notifyBilling');
        } catch (notifErr) {
          logger.warn('[SubscriptionService] Failed to create expired QR notification', { error: notifErr.message });
        }
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

    // Guard: currency mismatch — the SePay/VietQR webhook only ever reports
    // VND bank transfers (see VietQRGateway#extractWebhookData, no currency
    // field at all), so receivedAmount is only a valid comparison against
    // pending.amount when the pending payment was itself quoted in VND.
    // Without this, a non-VND pending payment (if one ever existed) would
    // have its numeric amount compared directly against a VND transfer (#102).
    if (pending.currency !== 'VND') {
      logger.warn('[SubscriptionService] Pending payment currency is not VND, cannot confirm via VND bank webhook', {
        transactionCode,
        currency: pending.currency
      });
      return { success: false, reason: 'CURRENCY_MISMATCH' };
    }

    // === ALL CHECKS PASSED ===

    // Atomically claim this payment (PENDING -> PROCESSING). SePay retries
    // webhooks, so two deliveries can both pass the `status !== 'PENDING'`
    // guard above before either finishes. The claim is a compare-and-swap in
    // the DB: only the winner (claimed === true) proceeds; a concurrent retry
    // loses the claim and returns as an idempotent duplicate. Closes #101.
    const claimed = await paymentRepository.claimPendingForProcessing(pending.transactionCode);
    if (!claimed) {
      logger.info('[SubscriptionService] Concurrent webhook lost the claim, treating as duplicate', { transactionCode });
      return { success: true, reason: 'ALREADY_PROCESSED' };
    }

    try {
      // Get brand's current subscription
      const subscription = await subscriptionRepository.findActivePlanByBrandId(pending.brandId);
      if (!subscription) {
        logger.error('[SubscriptionService] No subscription found for brand', { brandId: pending.brandId });
        // Release the claim so this can be retried once the subscription exists.
        await paymentRepository.releasePendingClaim(pending.transactionCode);
        return { success: false, reason: 'SUBSCRIPTION_NOT_FOUND' };
      }

      // Activate plan/addon, create the invoice, and mark PAID inside a single
      // DB transaction. Previously these were separate awaits: a crash between
      // e.g. plan activation and invoice creation left the brand upgraded with
      // no invoice and the payment stuck in PROCESSING. Wrapping them in
      // prisma.$transaction makes the whole group all-or-nothing — Prisma
      // rolls back everything if any step throws or the connection drops
      // mid-transaction. Closes #52.
      await prisma.$transaction(async (tx) => {
        if (pending.planId) {
          // Re-check the plan is still active — an admin could have retired
          // it between initiate and confirm; activating a retired plan would
          // put the brand on a plan that's no longer meant to be sellable (#103).
          const currentPlan = await tx.plan.findUnique({ where: { id: pending.planId } });
          if (!currentPlan || !currentPlan.isActive) {
            throw Object.assign(new Error('Gói đã ngừng bán, không thể kích hoạt'), { code: 'PLAN_NO_LONGER_ACTIVE' });
          }

          // Activate the new plan
          await planActivationService.activate(
            subscription.id,
            pending.planId,
            pending.plan?.billingCycle || 'MONTHLY',
            tx
          );
          logger.info('[SubscriptionService] Plan activated', { brandId: pending.brandId, planId: pending.planId });
        } else if (pending.addonId) {
          // Use the quantity snapshotted at initiate time, not a recompute
          // from the addon's current live price — an admin changing
          // addon.priceAmount between initiate and confirm must not change
          // how many units this already-paid amount buys (#102).
          const quantity = pending.addonQuantity || 1;

          await addonRepository.addSubscriptionAddon(
            subscription.id,
            pending.addonId,
            quantity,
            pending.brandId,
            tx
          );
          logger.info('[SubscriptionService] Addon activated', { brandId: pending.brandId, addonId: pending.addonId });
        }

        // Create invoice record
        await paymentRepository.createInvoice({
          subscriptionId: subscription.id,
          amount:         parseFloat(pending.amount),
          currency:       pending.currency,
          transactionCode: pending.transactionCode
        }, tx);

        // Mark PendingPayment as PAID
        await paymentRepository.updatePendingStatus(pending.transactionCode, 'PAID', tx);
      });
    } catch (activationError) {
      // Activation failed after we claimed the payment. Release the claim back
      // to PENDING so a later webhook retry can reprocess it instead of leaving
      // it stuck in PROCESSING forever.
      logger.error('[SubscriptionService] Activation failed after claim, releasing for retry', {
        transactionCode,
        error: activationError.message
      });
      await paymentRepository.releasePendingClaim(pending.transactionCode).catch(() => {});
      throw activationError;
    }

    // Notification: thanh toán thành công
    try {
      const isPlan = Boolean(pending.planId);
      await notificationService.notifyBrandMembers(pending.brandId, {
        type: NOTIFICATION_TYPES.SYSTEM,
        title: isPlan ? 'Nâng cấp gói thành công' : 'Mua add-on thành công',
        message: isPlan
          ? `Gói ${pending.plan?.name || ''} đã được kích hoạt. Cảm ơn bạn đã sử dụng PubliCast!`
          : `Add-on ${pending.addon?.name || ''} đã được kích hoạt thành công.`,
        actionUrl: '/settings/billing'
      }, 'notifyBilling');
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
