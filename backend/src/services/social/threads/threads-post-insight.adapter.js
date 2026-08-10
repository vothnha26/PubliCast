const BasePostInsightAdapter = require('../../../core/insights/base-post-insight.adapter');
const prisma = require('../../../config/prisma');
const { PLATFORMS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');
const threadsGateway = require('./threads.gateway');

/**
 * ThreadsPostInsightAdapter
 * Concrete Adapter cho Threads Post Metrics.
 * Đăng ký vào PostAdapterFactory trong Core Insights.
 *
 * DEAD CODE / NOT WIRED UP: registered in core/insights/index.js but nothing
 * calls postInsightFacade for Threads (only YouTube's youtube-analytics.
 * service.js does). The real, actively used Threads post-metrics path is
 * threads/index.js (DB-only reads + syncPublishedPosts Sync, against
 * PostMetricDaily). This adapter's prismaModel (socialPostMetric) still
 * exists but is no longer written to by the real path — do not wire a new
 * caller here without first pointing it at PostMetricDaily instead.
 */
class ThreadsPostInsightAdapter extends BasePostInsightAdapter {
  get platform() {
    return PLATFORMS.THREADS;
  }

  get prismaModel() {
    return prisma.socialPostMetric;
  }

  get isUniqueKeyed() {
    return true;
  }

  /**
   * Fetch post metrics directly from Threads Gateway & Media API
   */
  async fetchFromAPI(auth, platformPostId, context) {
    try {
      const accessToken = auth.pageAccessToken || auth.accessToken;
      if (!accessToken || accessToken.startsWith('mock-')) {
        return {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0
        };
      }

      let likes = 0;
      let comments = 0;
      let shares = 0;
      let views = 0;

      // 1. Lấy chi tiết thông số bài đăng từ Threads API (like_count, reply_count, repost_count)
      try {
        const mediaDetails = await threadsGateway.getMediaDetails(platformPostId, accessToken);
        likes = parseInt(mediaDetails?.like_count || 0, 10);
        comments = parseInt(mediaDetails?.reply_count || 0, 10);
        shares = parseInt(mediaDetails?.repost_count || mediaDetails?.quote_count || 0, 10);
      } catch (err) {
        logger.warn(`[ThreadsPostInsightAdapter] Failed to fetch media details for ${platformPostId}: ${err.message}`);
      }

      // 2. Lấy chỉ số lượt xem (views) từ Threads Media Insights API
      try {
        const insightsRes = await threadsGateway.getMediaInsights(platformPostId, accessToken, ['views']);
        if (insightsRes && Array.isArray(insightsRes.data)) {
          const viewsMetric = insightsRes.data.find(m => m.name === 'views');
          if (viewsMetric && Array.isArray(viewsMetric.values) && viewsMetric.values.length > 0) {
            views = parseInt(viewsMetric.values[0].value || 0, 10);
          }
        }
      } catch (err) {
        logger.warn(`[ThreadsPostInsightAdapter] Failed to fetch media insights for ${platformPostId}: ${err.message}`);
      }

      return {
        views,
        likes,
        comments,
        shares,
        clicks: 0
      };
    } catch (err) {
      logger.error(`[ThreadsPostInsightAdapter] Error fetching post metrics: ${err.message}`);
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

module.exports = ThreadsPostInsightAdapter;
