const BasePostInsightAdapter = require('../../../core/insights/base-post-insight.adapter');
const instagramGraphGateway = require('./instagram-graph.gateway');
const prisma = require('../../../config/prisma');
const { PLATFORMS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

/**
 * InstagramPostInsightAdapter
 * Concrete Adapter cho Instagram Post/Reel Metrics.
 * Tuân thủ Meta Graph API v26.0+ và phân loại chi tiết theo Media Types.
 */
class InstagramPostInsightAdapter extends BasePostInsightAdapter {
  get platform() {
    return PLATFORMS.INSTAGRAM;
  }

  get prismaModel() {
    return prisma.instagramPostMetric;
  }

  get isUniqueKeyed() {
    return true;
  }

  /**
   * Truy vấn metrics từ Meta Graph API v26.0+ dựa trên media_type
   * @param {object} auth
   * @param {string} mediaId - Instagram Media ID
   * @param {object} context - { brandId, socialAccountId, platformPostId }
   */
  async fetchFromAPI(auth, mediaId, context) {
    try {
      // 1. Lấy thông tin cơ bản về media để kiểm tra media_type (IMAGE, VIDEO, CAROUSEL_ALBUM, REELS)
      const mediaInfo = await instagramGraphGateway.getMediaDetails(auth, mediaId);
      const mediaType = (mediaInfo?.media_type || 'IMAGE').toUpperCase();

      // 2. Xây dựng danh sách metrics theo chuẩn Meta Graph API v26.0+ phù hợp với từng media_type
      let metricNames = ['reach', 'total_interactions', 'saved', 'shares'];
      if (mediaType === 'VIDEO' || mediaType === 'REELS') {
        metricNames = ['reach', 'plays', 'clips_replays', 'total_interactions', 'saved', 'shares'];
      }

      // 3. Gọi Meta Insights API
      const insightsRes = await instagramGraphGateway.getMediaInsights(auth, mediaId, metricNames);
      const metricsData = this._parseMetaInsightsResponse(insightsRes);

      const likes = parseInt(mediaInfo?.like_count || 0, 10);
      const comments = parseInt(mediaInfo?.comments_count || 0, 10);

      return {
        mediaType,
        reach: metricsData.reach || 0,
        plays: metricsData.plays || metricsData.clips_replays || 0,
        totalInteractions: metricsData.total_interactions || (likes + comments),
        likes,
        comments,
        shares: metricsData.shares || 0,
        saved: metricsData.saved || 0
      };
    } catch (err) {
      logger.warn(`[InstagramPostInsightAdapter] Failed to fetch metrics for ${mediaId}: ${err.message}`);
      return this.emptyMetrics();
    }
  }

  /**
   * Chuyển đổi sang schema InstagramPostMetric DB
   */
  toDbData(metrics, context) {
    return {
      brandId: context.brandId,
      socialAccountId: context.socialAccountId,
      platformPostId: context.platformPostId,
      likes: metrics?.likes || 0,
      comments: metrics?.comments || 0,
      shares: metrics?.shares || 0,
      saved: metrics?.saved || 0,
      reach: metrics?.reach || 0,
      plays: metrics?.plays || 0,
      rawInsightsJson: JSON.stringify(metrics)
    };
  }

  emptyMetrics() {
    return {
      mediaType: 'UNKNOWN',
      reach: 0,
      plays: 0,
      totalInteractions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saved: 0
    };
  }

  _parseMetaInsightsResponse(insightsRes) {
    const result = {};
    const dataList = insightsRes?.data || [];
    dataList.forEach((item) => {
      if (item.name && item.values && item.values[0]) {
        result[item.name] = item.values[0].value || 0;
      }
    });
    return result;
  }
}

module.exports = InstagramPostInsightAdapter;
