const prisma = require('../../config/prisma');
const { SUBSCRIPTION_STATUS } = require('../../utils/constants');

class RevenueRepository {
  /**
   * Get subscription counts by plan
   */
  async getSubscriptionCounts() {
    const activeSubs = await prisma.subscription.groupBy({
      by: ['planId'],
      where: { status: SUBSCRIPTION_STATUS.ACTIVE },
      _count: { _all: true }
    });
    return activeSubs;
  }

  /**
   * Get recent transactions (Invoices)
   */
  async getRecentInvoices(limit = 10) {
    return await prisma.invoice.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            plan: true,
            brand: {
              include: {
                owner: {
                  select: { name: true, email: true }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get revenue aggregation for MRR calculation
   */
  async getActiveSubscriptionRevenue() {
    return await prisma.subscription.findMany({
      where: { status: SUBSCRIPTION_STATUS.ACTIVE },
      include: {
        plan: {
          select: { priceAmount: true, billingCycle: true }
        }
      }
    });
  }

  /**
   * Get all paid invoices with subscription plan details
   */
  async getPaidInvoices() {
    return await prisma.invoice.findMany({
      where: { status: 'PAID' },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      },
      orderBy: {
        paidAt: 'asc'
      }
    });
  }
}

module.exports = new RevenueRepository();
