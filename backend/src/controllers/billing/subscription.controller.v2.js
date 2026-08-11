const subscriptionService = require('../../services/billing/subscription.service');
const addonRepository = require('../../repositories/billing/addon.repository');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v1's endpoints mostly return a bare { data } (no `message`) for GETs and
 * { message, data } for POSTs — v2 standardizes all of them on
 * v2Success/v2Error's {message, data} envelope. checkPaymentStatus,
 * getActiveAddons, getPaymentHistory and getPlans previously omitted
 * `message`; v2Success fills in the default "Success" message for them.
 */
class SubscriptionControllerV2 {
  initiatePayment = asyncHandler(async (req, res) => {
    const { planId, brandId, billingCycle } = req.body;

    if (!planId) return v2Error(res, 'planId là bắt buộc', 400);
    if (!brandId) return v2Error(res, 'brandId là bắt buộc', 400);

    const cycle = (billingCycle || 'MONTHLY').toUpperCase();
    const result = await subscriptionService.initiatePayment(brandId, planId, cycle);

    v2Success(res, result, 'Tạo mã QR thanh toán thành công', 201);
  });

  checkPaymentStatus = asyncHandler(async (req, res) => {
    const { transactionCode } = req.params;

    const result = await subscriptionService.checkPaymentStatus(transactionCode, req.user.id);

    v2Success(res, result);
  });

  getCurrentPlan = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId là bắt buộc', 400);

    const subscriptionRepository = require('../../repositories/billing/subscription.repository');
    const postRepository = require('../../repositories/workspace/post.repository');

    const subscription = await subscriptionRepository.findActivePlanByBrandId(brandId);
    const postsUsedThisMonth = await postRepository.countActivePostsThisMonth(brandId);

    v2Success(res, subscription ? {
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
    });
  });

  getActiveAddons = asyncHandler(async (req, res) => {
    const addons = await addonRepository.findActiveAddons();
    v2Success(res, addons);
  });

  initiateAddonPayment = asyncHandler(async (req, res) => {
    const { addonId, brandId, quantity } = req.body;

    if (!addonId) return v2Error(res, 'addonId là bắt buộc', 400);
    if (!brandId) return v2Error(res, 'brandId là bắt buộc', 400);

    const parsedQuantity = quantity === undefined ? 1 : Number(quantity);
    const result = await subscriptionService.initiateAddonPayment(brandId, addonId, parsedQuantity);

    v2Success(res, result, 'Tạo mã QR thanh toán Add-on thành công', 201);
  });

  getPaymentHistory = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId là bắt buộc', 400);

    const paymentRepository = require('../../repositories/billing/payment.repository');
    const history = await paymentRepository.findHistoryByBrandId(brandId);
    v2Success(res, history);
  });

  cancelPayment = asyncHandler(async (req, res) => {
    const { transactionCode } = req.body;
    if (!transactionCode) return v2Error(res, 'transactionCode là bắt buộc', 400);

    await subscriptionService.cancelPendingPayment(transactionCode, req.user.id);
    v2Success(res, null, 'Hủy yêu cầu thanh toán thành công');
  });

  getPlans = asyncHandler(async (req, res) => {
    const plans = await subscriptionService.getPlans();
    v2Success(res, plans);
  });
}

module.exports = new SubscriptionControllerV2();
