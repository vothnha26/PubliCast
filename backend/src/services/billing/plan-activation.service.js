const subscriptionRepository = require('../../repositories/billing/subscription.repository');
const logger = require('../../utils/logger');

/**
 * PlanActivationService
 * SRP: Only responsible for activating / downgrading plans in the database.
 * Called by SubscriptionService after payment is confirmed - no payment logic here.
 */
class PlanActivationService {
  /**
   * Activate a new plan for a brand's subscription
   * @param {string} subscriptionId - Brand's current subscription ID
   * @param {string} planId - The plan to activate
   * @param {string} billingCycle - 'MONTHLY' | 'ANNUAL'
   * @param {import('@prisma/client').Prisma.TransactionClient} [client] - pass
   *   a transaction client (`tx`) to run this write as part of a larger
   *   atomic operation; defaults to the global prisma client otherwise.
   */
  async activate(subscriptionId, planId, billingCycle = 'MONTHLY', client) {
    const now = new Date();
    const periodEnd = billingCycle === 'ANNUAL'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30  * 24 * 60 * 60 * 1000);

    const updated = await subscriptionRepository.upgradePlan(subscriptionId, {
      planId,
      periodStart: now,
      periodEnd
    }, client);

    logger.info('[PlanActivationService] Plan activated', {
      subscriptionId,
      planId,
      periodEnd
    });

    return updated;
  }

  /**
   * Downgrade brand back to the FREE plan (e.g. payment lapsed)
   * @param {string} subscriptionId
   */
  async downgradeToFree(subscriptionId) {
    const freePlan = await subscriptionRepository.findFreePlan();
    if (!freePlan) throw new Error('FREE plan not found in database');

    const downgraded = await subscriptionRepository.downgradeToFree(subscriptionId, freePlan.id);

    logger.info('[PlanActivationService] Downgraded to FREE', { subscriptionId });

    return downgraded;
  }
}

module.exports = new PlanActivationService();
