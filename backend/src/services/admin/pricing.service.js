const planRepository = require('../../repositories/admin/plan.repository');
const planLimitRepository = require('../../repositories/admin/plan-limit.repository');
const notificationService = require('../core/notification.service');
const { ERROR_MESSAGES, BILLING_CYCLES, NOTIFICATION_TYPES } = require('../../utils/constants');

/**
 * PricingService - Business Logic Layer
 */
class PricingService {
  /**
   * Get all pricing plans for admin dashboard
   */
  async getAllPricingPlans() {
    const plans = await planRepository.findAll();
    
    if (!plans || plans.length === 0) {
      return this._emptySummary();
    }

    const formattedPlans = plans.map(plan => this._formatPlanResponse(plan, true));
    const summary = this._calculatePlansSummary(formattedPlans);

    return { plans: formattedPlans, summary };
  }

  /**
   * Get single plan details
   */
  async getPlanDetails(planId) {
    const plan = await planRepository.findById(planId);
    if (!plan) throw this._error('Plan not found', 404);

    const stats = await planRepository.getSubscriptionStats(planId);
    return {
      ...this._formatPlanResponse(plan),
      subscriptionStats: stats
    };
  }

  /**
   * Create new pricing plan
   */
  async createPlan(planData) {
    this._validatePlanData(planData);

    const existingPlan = await planRepository.findByNameAndCycle(planData.name, planData.billingCycle);
    if (existingPlan) throw this._error(`Plan "${planData.name}" already exists`, 409);

    const planLimit = await planLimitRepository.findById(planData.planLimitId);
    if (!planLimit) throw this._error('Plan limit not found', 400);

    const createdPlan = await planRepository.create({
      ...planData,
      priceAmount: parseFloat(planData.priceAmount),
      isActive: true
    });

    await this._notifyPricingChange(
      'Pricing plan created',
      `Plan "${createdPlan.name}" (${createdPlan.billingCycle}) was created.`
    );

    return this._formatPlanResponse(createdPlan);
  }

  /**
   * Update pricing plan
   */
  async updatePlan(planId, updateData) {
    const plan = await planRepository.findById(planId);
    if (!plan) throw this._error('Plan not found', 404);

    if (updateData.priceAmount !== undefined) {
      if (updateData.priceAmount < 0) throw this._error('Price invalid', 400);
      updateData.priceAmount = parseFloat(updateData.priceAmount);
    }

    if (updateData.planLimitId) {
      const planLimit = await planLimitRepository.findById(updateData.planLimitId);
      if (!planLimit) throw this._error('Plan limit not found', 400);
    }

    const updatedPlan = await planRepository.update(planId, updateData);
    await this._notifyPricingChange(
      'Pricing plan updated',
      `Plan "${updatedPlan.name}" (${updatedPlan.billingCycle}) was updated.`
    );
    return this._formatPlanResponse(updatedPlan);
  }

  /**
   * Deactivate plan
   */
  async deactivatePlan(planId) {
    const plan = await planRepository.findById(planId);
    if (!plan) throw this._error('Plan not found', 404);
    if (!plan.isActive) throw this._error('Plan already inactive', 400);

    const deactivatedPlan = await planRepository.delete(planId);
    await this._notifyPricingChange(
      'Pricing plan deactivated',
      `Plan "${deactivatedPlan.name}" (${deactivatedPlan.billingCycle}) was deactivated.`
    );
    return deactivatedPlan;
  }

  /**
   * Get pricing analytics and revenue stats
   */
  async getPricingAnalytics() {
    const plans = await planRepository.findAll();
    
    const analytics = {
      monthlyRevenue: 0,
      annualRevenue: 0,
      subscriptionsByPlan: {},
      revenueByPlan: {}
    };

    for (const plan of plans) {
      if (!plan.isActive) continue;
      this._updatePlanAnalytics(analytics, plan);
    }

    return analytics;
  }

  async getAllPlanLimits() {
    return await planLimitRepository.findAll();
  }

  async getAllProducts() {
    const prisma = require('../../config/prisma');
    return await prisma.product.findMany({
      orderBy: { id: 'asc' }
    });
  }

  // ============= Private Helper Methods =============

  _formatPlanLimit(limit) {
    if (!limit) return {};
    return {
      maxBrands: limit.maxBrands,
      maxSocialProfiles: limit.maxSocialProfiles,
      maxPostsPerMonth: limit.maxPostsPerMonth,
      maxLivePlatforms: limit.maxLivePlatforms,
      maxStreamQuality: limit.maxStreamQuality,
      maxTeamSeats: limit.maxTeamSeats,
      allowCustomRoles: limit.allowCustomRoles,
      allowApprovalWorkflow: limit.allowApprovalWorkflow
    };
  }

  _formatPlanResponse(plan, includeStats = false) {
    const res = {
      id: plan.id,
      name: plan.name,
      price: { amount: parseFloat(plan.priceAmount), currency: plan.currency },
      billingCycle: plan.billingCycle,
      description: plan.description,
      planLimitId: plan.planLimitId,
      isActive: plan.isActive,
      limits: this._formatPlanLimit(plan.planLimit),
      includedProducts: plan.products ? plan.products.map(p => p.id) : [],
      createdAt: plan.createdAt
    };
    if (includeStats) res.subscriptionCount = plan.subscriptions?.length || 0;
    return res;
  }

  _calculatePlansSummary(formattedPlans) {
    return {
      totalPlans: formattedPlans.length,
      activePlans: formattedPlans.filter(p => p.isActive).length,
      inactivePlans: formattedPlans.filter(p => !p.isActive).length,
      totalSubscriptions: formattedPlans.reduce((sum, p) => sum + (p.subscriptionCount || 0), 0)
    };
  }

  _updatePlanAnalytics(analytics, plan) {
    const count = plan.subscriptions?.length || 0;
    const price = parseFloat(plan.priceAmount);
    
    analytics.subscriptionsByPlan[plan.name] = count;

    if (plan.billingCycle === BILLING_CYCLES.MONTHLY) {
      const revenue = price * count;
      analytics.monthlyRevenue += revenue;
      analytics.revenueByPlan[plan.name] = { monthly: revenue, annual: revenue * 12 };
    } else {
      const revenue = price * count;
      analytics.annualRevenue += revenue;
      analytics.revenueByPlan[plan.name] = { monthly: revenue / 12, annual: revenue };
    }
  }

  _emptySummary() {
    return { plans: [], summary: { totalPlans: 0, activePlans: 0, inactivePlans: 0, totalSubscriptions: 0 } };
  }

  _error(msg, status) {
    const err = new Error(msg);
    err.status = status;
    return err;
  }

  _validatePlanData(data) {
    if (!data.name?.trim()) throw this._error('Name required', 400);
    if (data.priceAmount === undefined || isNaN(parseFloat(data.priceAmount))) throw this._error('Price numeric required', 400);
    if (!Object.values(BILLING_CYCLES).includes(data.billingCycle?.toUpperCase())) throw this._error('Invalid cycle', 400);
    if (!data.planLimitId) throw this._error('Limit ID required', 400);
  }

  async _notifyPricingChange(title, message) {
    try {
      await notificationService.create({
        type: NOTIFICATION_TYPES.SYSTEM,
        title,
        message,
        isGlobal: true,
        actionUrl: '/admin/pricing'
      });
    } catch (err) {
      console.error('[PricingService] Failed to create pricing notification:', err.message);
    }
  }
}

module.exports = new PricingService();
