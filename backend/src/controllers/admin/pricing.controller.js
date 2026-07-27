const pricingService = require('../../services/admin/pricing.service');
const asyncHandler = require('../../utils/async-handler');

/**
 * PricingController - HTTP Request Handler Layer
 * Single Responsibility: Handle HTTP requests/responses
 * Dependency Injection: Receives service as dependency
 */
class PricingController {
  /**
   * GET /admin/pricing
   * Get all pricing plans
   */
  getPricingPlans = asyncHandler(async (req, res) => {
    const data = await pricingService.getAllPricingPlans();
    
    res.status(200).json({
      message: 'Pricing plans retrieved successfully',
      data
    });
  });

  /**
   * GET /admin/pricing/:planId
   * Get single plan details
   */
  getPlanDetails = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    if (!planId || !planId.trim()) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    const plan = await pricingService.getPlanDetails(planId);
    
    res.status(200).json({
      message: 'Plan details retrieved successfully',
      data: plan
    });
  });

  /**
   * POST /admin/pricing
   * Create new plan
   */
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

    res.status(201).json({
      message: 'Plan created successfully',
      data: plan
    });
  });

  /**
   * PATCH /admin/pricing/:planId
   * Update plan
   */
  updatePlan = asyncHandler(async (req, res) => {
    const { planId } = req.params;
    const updateData = req.body;

    if (!planId || !planId.trim()) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }

    const plan = await pricingService.updatePlan(planId, updateData);

    res.status(200).json({
      message: 'Plan updated successfully',
      data: plan
    });
  });

  /**
   * DELETE /admin/pricing/:planId
   * Deactivate plan
   */
  deactivatePlan = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    if (!planId || !planId.trim()) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    const plan = await pricingService.deactivatePlan(planId);

    res.status(200).json({
      message: 'Plan deactivated successfully',
      data: plan
    });
  });

  /**
   * GET /admin/pricing/analytics/revenue
   * Get pricing analytics and revenue stats
   */
  getPricingAnalytics = asyncHandler(async (req, res) => {
    const analytics = await pricingService.getPricingAnalytics();

    res.status(200).json({
      message: 'Pricing analytics retrieved successfully',
      data: analytics
    });
  });

  /**
   * GET /admin/pricing/limits
   * Get all plan limits for selection
   */
  getPlanLimits = asyncHandler(async (req, res) => {
    const data = await pricingService.getAllPlanLimits();
    res.status(200).json({
      message: 'Plan limits retrieved successfully',
      data
    });
  });

  /**
   * GET /admin/pricing/products
   * Get all products for selection
   */
  getProducts = asyncHandler(async (req, res) => {
    const data = await pricingService.getAllProducts();
    res.status(200).json({
      message: 'Products retrieved successfully',
      data
    });
  });
}

module.exports = new PricingController();
