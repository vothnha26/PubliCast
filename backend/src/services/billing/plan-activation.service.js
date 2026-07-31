const subscriptionRepository = require('../../repositories/billing/subscription.repository');
const logger = require('../../utils/logger');

class ProrationStrategy {
  /**
   * Calculate prorated periodEnd date when upgrading a subscription mid-cycle.
   * Preserves remaining unused days of the previous plan by extending periodEnd.
   * @param {Date} now Current timestamp
   * @param {Date|null} currentPeriodEnd End date of existing subscription (if any)
   * @param {string} billingCycle 'MONTHLY' | 'ANNUAL'
   * @returns {{ periodStart: Date, periodEnd: Date, proratedDaysAdded: number }}
   */
  calculatePeriod(now, currentPeriodEnd, billingCycle = 'MONTHLY') {
    const baseDurationDays = billingCycle === 'ANNUAL' ? 365 : 30;
    let proratedDaysAdded = 0;

    if (currentPeriodEnd && currentPeriodEnd > now) {
      const msRemaining = currentPeriodEnd.getTime() - now.getTime();
      proratedDaysAdded = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));
    }

    const totalDays = baseDurationDays + proratedDaysAdded;
    const periodEnd = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

    return {
      periodStart: now,
      periodEnd,
      proratedDaysAdded
    };
  }
}

/**
 * PlanActivationService
 * SRP: Only responsible for activating / downgrading plans in the database.
 * Called by SubscriptionService after payment is confirmed - no payment logic here.
 */
class PlanActivationService {
  constructor() {
    this.prorationStrategy = new ProrationStrategy();
  }

  /**
   * Activate a new plan for a brand's subscription with proration for mid-cycle upgrades.
   * @param {string} subscriptionId - Brand's current subscription ID
   * @param {string} planId - The plan to activate
   * @param {string} billingCycle - 'MONTHLY' | 'ANNUAL'
   * @param {import('@prisma/client').Prisma.TransactionClient} [client] - pass
   *   a transaction client (`tx`) to run this write as part of a larger
   *   atomic operation; defaults to the global prisma client otherwise.
   */
  async activate(subscriptionId, planId, billingCycle = 'MONTHLY', client) {
    const now = new Date();
    
    // Fetch current subscription to calculate mid-cycle proration if applicable
    let currentSubscription = null;
    try {
      currentSubscription = await subscriptionRepository.findById(subscriptionId);
    } catch (_) { /* ignore if absent */ }

    const { periodStart, periodEnd, proratedDaysAdded } = this.prorationStrategy.calculatePeriod(
      now,
      currentSubscription?.periodEnd ? new Date(currentSubscription.periodEnd) : null,
      billingCycle
    );

    const updated = await subscriptionRepository.upgradePlan(subscriptionId, {
      planId,
      periodStart,
      periodEnd
    }, client);

    logger.info('[PlanActivationService] Plan activated with proration', {
      subscriptionId,
      planId,
      proratedDaysAdded,
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
