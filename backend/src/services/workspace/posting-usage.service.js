const socialAccountRepository = require('../../repositories/social/social-account.repository');
const socialPlatformFactory = require('../social/social-platform.factory');
const platformDailyLimitRepository = require('../../repositories/admin/platform-daily-limit.repository');
const postTargetRepository = require('../../repositories/workspace/post-target.repository');

/**
 * Read-only Fair Use daily posting usage per connected account, for the
 * channel settings UI. Mirrors the same enforcement query used at publish
 * time (post.service.js#_checkDailyPostingLimits, social-publish.step.js)
 * so what the user sees here always matches what would actually block them.
 */
class PostingUsageService {
  async getDailyUsageForBrand(brandId) {
    const allAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, null);
    const accounts = allAccounts.filter((account) => socialPlatformFactory.isSupported(account.platform));

    const limits = await platformDailyLimitRepository.findAll();
    const limitByPlatform = new Map(limits.map((limit) => [limit.platform, limit]));

    return Promise.all(accounts.map(async (account) => {
      const limit = limitByPlatform.get(account.platform);
      if (!limit) {
        return {
          socialAccountId: account.id,
          platform: account.platform,
          displayName: account.displayName,
          username: account.username,
          configured: false,
          publishedCount: 0,
          maxPostsPerDay: null,
          remaining: null
        };
      }

      const publishedCount = await postTargetRepository.countPublishedInLast24h(account.id, account.platform);
      return {
        socialAccountId: account.id,
        platform: account.platform,
        displayName: account.displayName,
        username: account.username,
        configured: true,
        publishedCount,
        maxPostsPerDay: limit.maxPostsPerDay,
        remaining: Math.max(limit.maxPostsPerDay - publishedCount, 0)
      };
    }));
  }
}

module.exports = new PostingUsageService();
