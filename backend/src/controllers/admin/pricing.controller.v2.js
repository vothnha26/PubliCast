const pricingService = require('../../services/admin/pricing.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class PricingControllerV2 {
  getPricingPlans = asyncHandler(async (req, res) => {
    const data = await pricingService.getAllPricingPlans();
    v2Success(res, data, 'Pricing plans retrieved successfully');
  });

  getPlanDetails = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    if (!planId || !planId.trim()) {
      return v2Error(res, 'Plan ID is required', 400);
    }

    const plan = await pricingService.getPlanDetails(planId);
    v2Success(res, plan, 'Plan details retrieved successfully');
  });

  createPlan = asyncHandler(async (req, res) => {
    const { name, priceAmount, currency, billingCycle, description, planLimitId, products } = req.body;

    const plan = await pricingService.createPlan({
      name,
      priceAmount,
      currency,
      billingCycle,
      description,
      planLimitId,
      products
    });

    v2Success(res, plan, 'Plan created successfully', 201);
  });

  updatePlan = asyncHandler(async (req, res) => {
    const { planId } = req.params;
    const updateData = req.body;

    if (!planId || !planId.trim()) {
      return v2Error(res, 'Plan ID is required', 400);
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return v2Error(res, 'No data to update', 400);
    }

    const plan = await pricingService.updatePlan(planId, updateData);
    v2Success(res, plan, 'Plan updated successfully');
  });

  deactivatePlan = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    if (!planId || !planId.trim()) {
      return v2Error(res, 'Plan ID is required', 400);
    }

    const plan = await pricingService.deactivatePlan(planId);
    v2Success(res, plan, 'Plan deactivated successfully');
  });

  getPricingAnalytics = asyncHandler(async (req, res) => {
    const analytics = await pricingService.getPricingAnalytics();
    v2Success(res, analytics, 'Pricing analytics retrieved successfully');
  });

  getPlanLimits = asyncHandler(async (req, res) => {
    const data = await pricingService.getAllPlanLimits();
    v2Success(res, data, 'Plan limits retrieved successfully');
  });

  getProducts = asyncHandler(async (req, res) => {
    const data = await pricingService.getAllProducts();
    v2Success(res, data, 'Products retrieved successfully');
  });
}

module.exports = new PricingControllerV2();
