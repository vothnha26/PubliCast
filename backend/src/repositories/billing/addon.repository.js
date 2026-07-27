const prisma = require('../../config/prisma');

class AddonRepository {
  /**
   * Get all active addons available for purchase
   */
  async findActiveAddons() {
    return prisma.addon.findMany({
      where: { isActive: true },
      orderBy: { priceAmount: 'asc' }
    });
  }

  /**
   * Find addon by ID
   */
  async findById(addonId) {
    return prisma.addon.findUnique({
      where: { id: addonId }
    });
  }

  /**
   * Add addon to a brand's subscription
   * @param {import('@prisma/client').Prisma.TransactionClient} [client] - pass
   *   a transaction client (`tx`) to run these writes as part of a larger
   *   atomic operation; defaults to the global prisma client otherwise.
   */
  async addSubscriptionAddon(subscriptionId, addonId, quantity, brandId, client = prisma) {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Addon lasts for 30 days

    // Check if the addon already exists for this subscription
    const existing = await client.subscriptionAddon.findUnique({
      where: {
        subscriptionId_addonId: {
          subscriptionId,
          addonId
        }
      }
    });

    if (existing) {
      // Increment quantity
      return client.subscriptionAddon.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          currentPeriodEnd: periodEnd,
          status: 'ACTIVE'
        }
      });
    }

    // Create new addon
    return client.subscriptionAddon.create({
      data: {
        subscriptionId,
        addonId,
        brandId,
        quantity,
        currentPeriodEnd: periodEnd,
        status: 'ACTIVE'
      }
    });
  }
}

module.exports = new AddonRepository();
