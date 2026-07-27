const prisma = require('../../config/prisma');
const { SUBSCRIPTION_STATUS } = require('../../utils/constants');

/**
 * Plan Repository - Data Access Layer
 * Handles all database operations for Plan model
 * Single Responsibility: Database queries only
const { SUBSCRIPTION_STATUS } = require('../../utils/constants');

/**
 * Plan Repository - Data Access Layer
 * Handles all database operations for Plan model
 * Single Responsibility: Database queries only
 */
class PlanRepository {
  /**
   * Get all plans with their limits
   * @returns {Promise<Array>} plans with limits
   */
  async findAll() {
    return prisma.plan.findMany({
      include: {
        planLimit: true,
        products: true,
        subscriptions: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get plan by ID
   * @param {string} id - plan ID
   * @returns {Promise<Object>} plan with limits
   */
  async findById(id) {
    return prisma.plan.findUnique({
      where: { id },
      include: {
        planLimit: true,
        products: true,
        subscriptions: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });
  }

  /**
   * Get plan by name and billing cycle
   * @param {string} name - plan name
   * @param {string} billingCycle - MONTHLY or ANNUAL
   * @returns {Promise<Object>} plan
   */
  async findByNameAndCycle(name, billingCycle) {
    return prisma.plan.findUnique({
      where: {
        name_billingCycle: {
          name,
          billingCycle
        }
      },
      include: {
        planLimit: true,
        products: true
      }
    });
  }

  /**
   * Create new plan
   * @param {Object} planData - { name, priceAmount, currency, billingCycle, description, planLimitId, products }
   * @returns {Promise<Object>} created plan
   */
  async create(planData) {
    const { products, ...rest } = planData;
    const data = {
      ...rest,
      products: products && Array.isArray(products) 
        ? { connect: products.map(id => ({ id })) } 
        : undefined
    };
    return prisma.plan.create({
      data,
      include: {
        planLimit: true,
        products: true
      }
    });
  }

  // Only these scalar Plan fields may be set via the admin update endpoint.
  // Without this allow-list, `...rest` spread whatever the request body
  // contained straight into prisma.plan.update — e.g. `id`, `createdAt`, or
  // any other column present on the model — into the write (#104).
  static UPDATABLE_FIELDS = ['name', 'priceAmount', 'currency', 'billingCycle', 'description', 'planLimitId', 'isActive'];

  /**
   * Update plan
   * @param {string} id - plan ID
   * @param {Object} updateData - fields to update
   * @returns {Promise<Object>} updated plan
   */
  async update(id, updateData) {
    const { products } = updateData;
    const data = {};
    for (const field of PlanRepository.UPDATABLE_FIELDS) {
      if (updateData[field] !== undefined) {
        data[field] = updateData[field];
      }
    }
    if (products && Array.isArray(products)) {
      data.products = { set: products.map(id => ({ id })) };
    }

    return prisma.plan.update({
      where: { id },
      data,
      include: {
        planLimit: true,
        products: true
      }
    });
  }

  /**
   * Delete plan (soft delete via isActive)
   * @param {string} id - plan ID
   * @returns {Promise<Object>} updated plan
   */
  async delete(id) {
    return prisma.plan.update({
      where: { id },
      data: { isActive: false },
      include: {
        planLimit: true,
        products: true
      }
    });
  }

  /**
   * Get plans by activity status
   * @param {boolean} isActive - true for active plans
   * @returns {Promise<Array>} filtered plans
   */
  async findByStatus(isActive) {
    return prisma.plan.findMany({
      where: { isActive },
      include: {
        planLimit: true,
        products: true
      },
      orderBy: { priceAmount: 'asc' }
    });
  }

  /**
   * Get subscription statistics for a plan
   * @param {string} planId - plan ID
   * @returns {Promise<Object>} subscription stats
   */
  async getSubscriptionStats(planId) {
    const subscriptions = await prisma.subscription.findMany({
      where: { planId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    return {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.ACTIVE).length,
      expired: subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.EXPIRED).length,
      cancelled: subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.CANCELLED).length,
      subscriptions
    };
  }
}

module.exports = new PlanRepository();
