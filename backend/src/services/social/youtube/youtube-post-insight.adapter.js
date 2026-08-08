const BasePostInsightAdapter = require('../../../core/insights/base-post-insight.adapter');
const youtubeGateway = require('./youtube.gateway');
const prisma = require('../../../config/prisma');
const { PLATFORMS, ANALYTICS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

class YouTubePostInsightAdapter extends BasePostInsightAdapter {
  get platform() {
    return PLATFORMS.YOUTUBE;
  }

  get prismaModel() {
    return prisma.youTubeVideoMetric;
  }

  get isUniqueKeyed() {
    return false;
  }

  /**
   * Truy vấn 6 chỉ số cơ bản của video từ YouTube Analytics API
   * @param {object} auth
   * @param {string} videoId
   * @param {object} context - { brandId, socialAccountId, platformPostId }
   */
  async fetchFromAPI(auth, videoId, context) {
    try {
      const res = await youtubeGateway.getAnalyticsReportQuery(auth, {
        ids: 'channel==MINE',
        startDate: ANALYTICS.LIFETIME_START_DATE,
        endDate: new Date().toISOString().split('T')[0],
        metrics: 'views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
        filters: `${ANALYTICS.DIMENSIONS.YOUTUBE.VIDEO}==${videoId}`
      });

      const row = res.data?.rows?.[0];
      if (!row) {
        return this.emptyMetrics();
      }

      const views = parseInt(row[0] || 0, 10);
      const likes = parseInt(row[1] || 0, 10);
      const comments = parseInt(row[2] || 0, 10);
      const shares = parseInt(row[3] || 0, 10);
      const watchMinutes = parseFloat(row[4] || 0);
      const avgViewDuration = Math.round(parseFloat(row[5] || 0));
      const totalWatchHrs = Math.round((watchMinutes / 60) * 10) / 10;

      return {
        views,
        watchTime: totalWatchHrs,
        totalWatchHrs,
        avgViewDuration,
        likes,
        comments,
        shares
      };
    } catch (err) {
      logger.warn(`[YouTubePostInsightAdapter] Failed to fetch metrics for ${videoId}: ${err.message}`);
      return this.emptyMetrics();
    }
  }

  /**
   * Chuyển đổi metrics thành dữ liệu chuẩn lưu DB
   * Stateless: nhận context = { brandId, socialAccountId, platformPostId }
   */
  toDbData(metrics, context) {
    return {
      brandId: context.brandId,
      views: metrics?.views || 0,
      likes: metrics?.likes || 0,
      comments: metrics?.comments || 0,
      avgWatchTime: metrics?.totalWatchHrs || metrics?.watchTime || 0,
      rawInsightsJson: JSON.stringify(metrics)
    };
  }

  emptyMetrics() {
    return {
      views: 0,
      watchTime: 0,
      totalWatchHrs: 0,
      avgViewDuration: 0,
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
}

module.exports = YouTubePostInsightAdapter;
