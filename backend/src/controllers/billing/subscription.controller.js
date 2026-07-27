const subscriptionService = require('../../services/billing/subscription.service');
const addonRepository = require('../../repositories/billing/addon.repository');
const asyncHandler = require('../../utils/async-handler');

/**
 * SubscriptionController
 * SRP: Only handles HTTP request parsing and response formatting.
 *      All business logic lives in SubscriptionService.
 */
class SubscriptionController {
  /**
   * POST /api/billing/subscriptions/initiate
   * Body: { planId, brandId }
   * Returns: QR code image + payment details
   */
  initiatePayment = asyncHandler(async (req, res) => {
    const { planId, brandId, billingCycle } = req.body;

    if (!planId) return res.status(400).json({ message: 'planId là bắt buộc' });
    if (!brandId) return res.status(400).json({ message: 'brandId là bắt buộc' });

    const cycle = (billingCycle || 'MONTHLY').toUpperCase();
    const result = await subscriptionService.initiatePayment(brandId, planId, cycle);

    res.status(201).json({
      message: 'Tạo mã QR thanh toán thành công',
      data: result
    });
  });

  /**
   * GET /api/billing/subscriptions/status/:transactionCode
   * Frontend polls this every 3 seconds to know if payment succeeded
   */
  checkPaymentStatus = asyncHandler(async (req, res) => {
    const { transactionCode } = req.params;

    const result = await subscriptionService.checkPaymentStatus(transactionCode, req.user.id);

    res.status(200).json({ data: result });
  });

  /**
   * GET /api/billing/subscriptions/current?brandId=xxx
   * Get current active plan info for a brand
   */
  getCurrentPlan = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId là bắt buộc' });

    const subscriptionRepository = require('../../repositories/billing/subscription.repository');
    const postRepository = require('../../repositories/workspace/post.repository');

    const subscription = await subscriptionRepository.findActivePlanByBrandId(brandId);
    const postsUsedThisMonth = await postRepository.countActivePostsThisMonth(brandId);

    res.status(200).json({
      data: subscription ? {
        planName:     subscription.plan.name,
        billingCycle: subscription.plan.billingCycle,
        periodEnd:    subscription.currentPeriodEnd,
        status:       subscription.status,
        limits:       subscription.plan.planLimit,
        postsUsedThisMonth
      } : {
        planName:     'FREE',
        limits:       { maxPostsPerMonth: 10 },
        postsUsedThisMonth
      }
    });
  });

  /**
   * GET /api/billing/subscriptions/addons
   * Get all active addons available for purchase
   */
  getActiveAddons = asyncHandler(async (req, res) => {
    const addons = await addonRepository.findActiveAddons();
    res.status(200).json({ data: addons });
  });

  /**
   * POST /api/billing/subscriptions/addons/initiate
   * Body: { addonId, brandId, quantity }
   */
  initiateAddonPayment = asyncHandler(async (req, res) => {
    const { addonId, brandId, quantity } = req.body;

    if (!addonId) return res.status(400).json({ message: 'addonId là bắt buộc' });
    if (!brandId) return res.status(400).json({ message: 'brandId là bắt buộc' });

    const parsedQuantity = quantity === undefined ? 1 : Number(quantity);
    const result = await subscriptionService.initiateAddonPayment(brandId, addonId, parsedQuantity);

    res.status(201).json({
      message: 'Tạo mã QR thanh toán Add-on thành công',
      data: result
    });
  });

  /**
   * GET /api/billing/subscriptions/history
   * Query: ?brandId=xxx
   */
  getPaymentHistory = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId là bắt buộc' });

    const paymentRepository = require('../../repositories/billing/payment.repository');
    const history = await paymentRepository.findHistoryByBrandId(brandId);
    res.status(200).json({ data: history });
  });

  /**
   * POST /api/billing/subscriptions/cancel
   * Body: { transactionCode }
   */
  cancelPayment = asyncHandler(async (req, res) => {
    const { transactionCode } = req.body;
    if (!transactionCode) return res.status(400).json({ message: 'transactionCode là bắt buộc' });

    await subscriptionService.cancelPendingPayment(transactionCode, req.user.id);
    res.status(200).json({ message: 'Hủy yêu cầu thanh toán thành công' });
  });

  /**
   * GET /api/billing/subscriptions/plans
   * Get all active subscription plans
   */
  getPlans = asyncHandler(async (req, res) => {
    const plans = await subscriptionService.getPlans();
    res.status(200).json({ data: plans });
  });
}

module.exports = new SubscriptionController();
