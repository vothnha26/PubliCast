const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

class ConnectionConflictError extends Error {
  constructor(type, channelName, platformAccountId, platform, existingBrandName) {
    super(`Conflict: Social account is already connected`);
    this.name = 'ConnectionConflictError';
    this.type = type; // 'DIFFERENT_OWNER' | 'SAME_OWNER'
    this.channelName = channelName;
    this.platformAccountId = platformAccountId;
    this.platform = platform;
    this.existingBrandName = existingBrandName;
  }
}

class ConnectionConflictGuard {
  /**
   * Check if a social account connection conflicts with an existing one.
   *
   * Multi-brand connections are allowed by design (same as Metricool): the same
   * channel/page can be connected to any number of brands/workspaces, including
   * brands owned by different accounts. Each brand keeps its own socialAccount row
   * (own tokens, own @@unique([brandId, platform, platformAccountId]) — see
   * schema.prisma), so publishing/syncing per brand is already isolated (each brand
   * reads its own token via socialAccountRepository.findByBrandAndPlatform(brandId, ...),
   * not by platformAccountId — see youtube-analytics.service.js _getAuthContext).
   *
   * Known accepted trade-off: Google (and other platforms) cap the number of live
   * refresh tokens per (OAuth client, end-user) pair. If a channel is connected to
   * many brands, the platform may silently revoke the oldest token once that cap is
   * hit, which would surface as a token-refresh failure for the affected brand later
   * — not something this guard can prevent.
   *
   * @param {string} targetBrandId - The brand ID the user wants to connect the channel to.
   * @param {string} platform - The platform name (e.g., 'YOUTUBE', 'FACEBOOK', 'TIKTOK').
   * @param {string} platformAccountId - The unique ID of the channel/page from the platform.
   * @returns {Promise<{conflict: boolean, type?: 'DIFFERENT_OWNER'|'SAME_OWNER', existingAccount?: object}>}
   */
  async validateConflict(targetBrandId, platform, platformAccountId) {
    logger.debug('[ConflictGuard] Multi-brand connections allowed — skipping conflict check', {
      targetBrandId,
      platform,
      platformAccountId
    });
    return { conflict: false };
  }

  /**
   * Reassign a social account to a new brand.
   * Assumes verification of ownership was already done.
   */
  async reassignAccount(platform, platformAccountId, targetBrandId) {
    logger.info('[ConflictGuard] Reassigning social account', { platform, platformAccountId, targetBrandId });

    // Get the target brand's owner to verify authorization
    const targetBrand = await prisma.brand.findFirst({
      where: { id: targetBrandId, deletedAt: null }
    });

    if (!targetBrand) {
      throw new Error('Target brand not found');
    }

    // Find the existing active account
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        platform,
        platformAccountId,
        isConnected: true
      },
      include: {
        brand: true
      }
    });

    if (!existingAccount) {
      throw new Error('Social account not found or not connected');
    }

    // Security check: Must have the same owner to allow reassignment
    if (existingAccount.brand.ownerId !== targetBrand.ownerId) {
      throw new Error('Unauthorized reassignment: Brands belong to different owners');
    }

    // Execute reassignment
    // Note: We update the brandId and also the associated model records if needed (Prisma cascading or updates)
    // Actually, in prisma, socialAccount has brandId. Moving it just updates the brandId.
    // Also, we should move the associated analytics records for this social account, but analytics references socialAccountId,
    // which remains the same! So moving the brandId on socialAccount is enough.
    // Let's also check if analytics have brandId. Yes, analytics table has brandId. Let's update analytics brandId too.
    
    await prisma.$transaction(async (tx) => {
      // 1. Update SocialAccount's brandId
      await tx.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          brandId: targetBrandId,
          updatedAt: new Date()
        }
      });

      // 2. Update all associated Analytics brandId
      await tx.analytics.updateMany({
        where: { socialAccountId: existingAccount.id },
        data: {
          brandId: targetBrandId
        }
      });
    });

    logger.info('[ConflictGuard] Reassignment successful', { accountId: existingAccount.id, oldBrandId: existingAccount.brandId, newBrandId: targetBrandId });
    return existingAccount;
  }
}

module.exports = {
  ConnectionConflictGuard: new ConnectionConflictGuard(),
  ConnectionConflictError
};
