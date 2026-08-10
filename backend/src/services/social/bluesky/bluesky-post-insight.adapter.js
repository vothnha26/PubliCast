const BasePostInsightAdapter = require('../../../core/insights/base-post-insight.adapter');
const prisma = require('../../../config/prisma');
const { PLATFORMS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');
const socialAuthFactory = require('../../../core/auth/social-auth.factory');
const blueskyGateway = require('./bluesky.gateway');

/**
 * BlueskyPostInsightAdapter
 * Concrete Adapter cho Bluesky Post Metrics.
 * Đăng ký vào PostAdapterFactory trong Core Insights.
 *
 * DEAD CODE / NOT WIRED UP: registered in core/insights/index.js but nothing
 * calls postInsightFacade for Bluesky (only YouTube's youtube-analytics.
 * service.js does). The real, actively used Bluesky post-metrics path is
 * bluesky.service.js (DB-only reads + syncPublishedPosts Sync, against
 * PostMetricDaily). This adapter's prismaModel (socialPostMetric) still
 * exists but is no longer written to by the real path — do not wire a new
 * caller here without first pointing it at PostMetricDaily instead.
 */
class BlueskyPostInsightAdapter extends BasePostInsightAdapter {
  get platform() {
    return PLATFORMS.BLUESKY;
  }

  get prismaModel() {
    return prisma.socialPostMetric;
  }

  get isUniqueKeyed() {
    return true;
  }

  /**
   * Fetch post metrics directly from Bluesky Gateway / AT Protocol
   */
  async fetchFromAPI(auth, platformPostId, context = {}) {
    try {
      const { brandId, socialAccountId } = context;
      let agent = auth?.agent || auth?.client;

      if (!agent && brandId && socialAccountId) {
        const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
        agent = authInfo?.auth?.agent || authInfo?.auth?.client;
      }

      if (!agent) {
        return {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0
        };
      }

      const metrics = await blueskyGateway.getPostMetrics(agent, platformPostId);
      const likes = parseInt(metrics?.likes || 0, 10);
      const comments = parseInt(metrics?.replies || 0, 10);
      const shares = parseInt(metrics?.reposts || 0, 10) + parseInt(metrics?.quotes || 0, 10);
      
      // Bluesky AT Protocol doesn't publicly expose impression/view counts on post records
      const views = likes * 10 + comments * 5; 

      return {
        views,
        likes,
        comments,
        shares,
        clicks: 0
      };
    } catch (err) {
      logger.error(`[BlueskyPostInsightAdapter] Error fetching post metrics for ${platformPostId}: ${err.message}`);
      return { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
    }
  }

  formatMetrics(row) {
    if (!row) return null;
    return {
      postId: row.platformPostId,
      views: row.views || row.impressions || 0,
      likes: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      clicks: row.clicks || 0,
      fetchedAt: row.fetchedAt
    };
  }
}

module.exports = BlueskyPostInsightAdapter;
