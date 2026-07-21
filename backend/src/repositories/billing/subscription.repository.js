const prisma = require('../../config/prisma');

/**
 * SubscriptionRepository
 * SRP: Only responsible for DB operations on Subscription table
 */
class SubscriptionRepository {
  /**
   * Find active subscription for a brand (via Brand.subscriptionId)
   */
  async findActivePlanByBrandId(brandId) {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        subscription: {
          include: {
            plan: { include: { planLimit: true } }
          }
        }
      }
    });
    return brand?.subscription || null;
  }

  /**
   * Find plan by ID
   */
  async findPlanById(planId) {
    return prisma.plan.findUnique({
      where: { id: planId },
      include: { planLimit: true }
    });
  }

  /**
   * Find all active plans
   */
  async findAllActivePlans() {
    return prisma.plan.findMany({
      where: { isActive: true },
      include: { planLimit: true, products: true }
    });
  }

  /**
   * Find plan by Name
   */
  async findPlanByName(name) {
    return prisma.plan.findFirst({
      where: { name: name.toUpperCase(), isActive: true },
      include: { planLimit: true }
    });
  }

  /**
   * Find the default FREE plan
   */
  async findFreePlan() {
    return prisma.plan.findFirst({
      where: { name: 'FREE', isActive: true },
      include: { planLimit: true }
    });
  }

  /**
   * Create a new subscription record
   */
  async create({ planId, periodStart, periodEnd }) {
    return prisma.subscription.create({
      data: {
        planId,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd
      }
    });
  }

  /**
   * Upgrade brand's subscription to a new plan
   * Reuses existing subscription record (update in place)
   */
  /**
   * @param {import('@prisma/client').Prisma.TransactionClient} [client] - pass
   *   a transaction client (`tx`) to run this write as part of a larger
   *   atomic operation; defaults to the global prisma client otherwise.
   */
  async upgradePlan(subscriptionId, { planId, periodStart, periodEnd }, client = prisma) {
    return client.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelledAt: null
      },
      include: { plan: { include: { planLimit: true } } }
    });
  }

  /**
   * Downgrade to FREE plan (e.g., on cancellation)
   */
  async downgradeToFree(subscriptionId, freePlanId) {
    const now = new Date();
    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: freePlanId,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        cancelledAt: now
      }
    });
  }

  /**
   * Count current usage for plan-limit checks
   */
  async countBrands(ownerId) {
    return prisma.brand.count({ where: { ownerId, deletedAt: null } });
  }

  async countSocialProfiles(brandId) {
    return prisma.socialAccount.count({ where: { brandId, isConnected: true } });
  }

  async countPostsThisMonth(brandId) {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { postsUsedThisMonth: true }
    });
    return brand?.postsUsedThisMonth || 0;
  }

  async countTeamSeats(brandId) {
    return prisma.team.count({ where: { brandId, status: 'ACCEPTED' } });
  }
}

module.exports = new SubscriptionRepository();
