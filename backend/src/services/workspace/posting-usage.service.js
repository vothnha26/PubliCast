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
    // channelMetricsDaily skipped — this summary only needs identity/token/
    // platformAccountId fields, not the last-30-days history (see
    // findByBrandAndPlatform's doc comment).
    const allAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, null, { includeChannelMetricsDaily: false });
    const accounts = allAccounts.filter((account) => socialPlatformFactory.isSupported(account.platform));

    const limits = await platformDailyLimitRepository.findAll();
    const limitByPlatform = new Map(limits.map((limit) => [limit.platform, limit]));

    // Batched instead of one countPublishedInLast24h call per account (each
    // of which is itself 2 sequential round-trips) — was previously up to
    // 2N sequential-per-account round-trips for a brand with N connected
    // channels, real network latency on a remote DB.
    const configuredAccounts = accounts.filter((account) => limitByPlatform.has(account.platform));
    const countsByAccountId = await postTargetRepository.countPublishedInLast24hBatch(
      configuredAccounts.map((account) => ({
        socialAccountId: account.id,
        platform: account.platform,
        platformAccountId: account.platformAccountId
      }))
    );

    return accounts.map((account) => {
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

      const publishedCount = countsByAccountId.get(account.id) || 0;
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
    });
  }
}

module.exports = new PostingUsageService();
