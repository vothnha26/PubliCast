const socialService = require('./social.service');
const socialPlatformFactory = require('./social-platform.factory');
const postingUsageService = require('../workspace/posting-usage.service');
const channelGroupService = require('./channel-group.service');
const postService = require('../workspace/post.service');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../utils/constants');

/**
 * ChannelInsightsSummaryService
 *
 * The channel detail page (/channels/:socialAccountId/insights) previously
 * fired 5+ independent REST calls on mount (metrics, posting-usage,
 * published-videos, channel-groups, platform-limits — each its own
 * component/hook fetching on its own), each paying a full DB round-trip
 * against a remote instance. On a cloud DB with real network latency this
 * meant several seconds of requests all racing for the same small
 * connection pool, several times over just to render one page.
 *
 * getSummary batches everything this page actually needs into one request,
 * with the 5 underlying reads run concurrently via Promise.all (same
 * service methods the individual endpoints still use — this is purely an
 * aggregation layer, not a behavior change to any of them).
 */
class ChannelInsightsSummaryService {
  async getSummary(brandId, socialAccountId, userId, { pageToken = null, limit = 10, startDate = null, endDate = null } = {}) {
    const account = socialAccountId
      ? await socialAccountRepository.findByIdLite(socialAccountId)
      : null;
    if (socialAccountId && (!account || account.brandId !== brandId)) {
      const error = new Error('Social account not found for this brand');
      error.statusCode = 404;
      throw error;
    }

    const [metrics, postingUsage, publishedVideos, channelGroups, platformLimits] = await Promise.all([
      socialService.getAggregatedMetrics(brandId),
      postingUsageService.getDailyUsageForBrand(brandId),
      account ? this._fetchPublishedVideos(account, brandId, socialAccountId, { pageToken, limit, startDate, endDate }) : Promise.resolve(null),
      channelGroupService.listByBrand(brandId, userId),
      postService.getPlatformLimits()
    ]);

    return { metrics, postingUsage, publishedVideos, channelGroups, platformLimits };
  }

  // getPublishedVideos' signature differs by platform — every platform
  // except YouTube is (brandId, pageToken, limit, socialAccountId,
  // startDate, endDate); YouTube alone has an extra forceSync boolean
  // inserted before startDate/endDate (see youtube/index.js). Calling every
  // platform positionally with YouTube's shape would silently pass `false`
  // as startDate for the other 4 platforms — this keeps that platform
  // difference in exactly one place instead of leaking it into getSummary.
  async _fetchPublishedVideos(account, brandId, socialAccountId, { pageToken, limit, startDate, endDate }) {
    const service = socialPlatformFactory.getService(account.platform);
    const args = account.platform === PLATFORMS.YOUTUBE
      ? [brandId, pageToken, limit, socialAccountId, false, startDate, endDate]
      : [brandId, pageToken, limit, socialAccountId, startDate, endDate];

    return service.getPublishedVideos(...args).catch((err) => ({ error: err.message, data: [] }));
  }
}

module.exports = new ChannelInsightsSummaryService();
