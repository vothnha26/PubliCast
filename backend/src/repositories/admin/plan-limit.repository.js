const prisma = require('../../config/prisma');

/**
 * PlanLimit Repository - Data Access Layer
 * Handles all database operations for PlanLimit model
 * Single Responsibility: Database queries only
 */
class PlanLimitRepository {
  /**
   * Get all plan limits
   * @returns {Promise<Array>} all plan limits
   */
  async findAll() {
    return prisma.planLimit.findMany({
      include: {
        plans: {
          select: {
            id: true,
            name: true,
            priceAmount: true,
            billingCycle: true
          }
        }
      }
    });
  }

  /**
   * Get plan limit by ID
   * @param {string} id - limit ID
   * @returns {Promise<Object>} plan limit
   */
  async findById(id) {
    return prisma.planLimit.findUnique({
      where: { id },
      include: {
        plans: {
          select: {
            id: true,
            name: true,
            priceAmount: true
          }
        }
      }
    });
  }

  /**
   * Create new plan limit
   * @param {Object} limitData - limit configuration
   * @returns {Promise<Object>} created limit
   */
  async create(limitData) {
    return prisma.planLimit.create({
      data: limitData,
      include: {
        plans: true
      }
    });
  }

  /**
   * Update plan limit
   * @param {string} id - limit ID
   * @param {Object} updateData - fields to update
   * @returns {Promise<Object>} updated limit
   */
  async update(id, updateData) {
    return prisma.planLimit.update({
      where: { id },
      data: updateData,
      include: {
        plans: true
      }
    });
  }
}

module.exports = new PlanLimitRepository();
