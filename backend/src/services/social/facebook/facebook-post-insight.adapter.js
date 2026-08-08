const BasePostInsightAdapter = require('../../../core/insights/base-post-insight.adapter');
const facebookGateway = require('./facebook.gateway');
const prisma = require('../../../config/prisma');
const { PLATFORMS, POST_TYPES, DEFAULT_CONFIG, SOCIAL_TECHNICAL } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

const FACEBOOK_POST_METRICS_TTL_MS = 24 * 60 * 60 * 1000;

const INSIGHTS_STRATEGIES = {
  STANDARD: (postId, token) => facebookGateway.getPostInsights(postId, token),
  REEL: (postId, token) => facebookGateway.getReelVideoInsights(postId, token)
};

class FacebookPostInsightAdapter extends BasePostInsightAdapter {
  get platform() {
    return PLATFORMS.FACEBOOK;
  }

  get prismaModel() {
    return prisma.facebookPostMetric;
  }

  get isUniqueKeyed() {
    return true;
  }

  get staleMs() {
    return FACEBOOK_POST_METRICS_TTL_MS;
  }

  /**
   * Fetch live metrics from Facebook Graph API
   * @param {string} pageAccessToken - Access token for Facebook page
   * @param {string} postId - platformPostId
   * @param {object} context - { brandId, socialAccountId, platformPostId }
   */
  async fetchFromAPI(pageAccessToken, postId, context) {
    if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
      return this._buildMockPostDetails(postId);
    }

    try {
      const dbPost = await prisma.post.findFirst({
        where: { platformPostId: postId }
      }).catch(() => null);

      const isReel = dbPost?.type === 'REEL' || dbPost?.options?.facebookType === 'reel';
      const strategy = isReel ? INSIGHTS_STRATEGIES.REEL : INSIGHTS_STRATEGIES.STANDARD;

      const results = await Promise.allSettled([
        facebookGateway.getPostDetails(postId, pageAccessToken),
        strategy(postId, pageAccessToken),
        facebookGateway.getPostReactionsBreakdown(postId, pageAccessToken)
      ]);

      const postResult = results[0].status === 'fulfilled' ? results[0].value : null;
      const insightsResult = results[1].status === 'fulfilled' ? results[1].value : { reach: 0, views: 0, clicks: 0, linkClicks: 0 };
      const reactionsResult = results[2].status === 'fulfilled' ? results[2].value : { total: 0, breakdown: {} };

      const postDetails = postResult ? {
        id: postResult.id,
        message: postResult.message || postResult.story || DEFAULT_CONFIG.NO_CONTENT,
        type: isReel ? POST_TYPES.REEL : this._determinePostType(postResult),
        mediaUrl: postResult.full_picture || '',
        permalinkUrl: postResult.permalink_url || null,
        date: postResult.created_time,
        platform: 'facebook'
      } : {
        id: postId,
        message: dbPost?.caption || DEFAULT_CONFIG.NO_CONTENT,
        type: isReel ? POST_TYPES.REEL : POST_TYPES.IMAGE,
        mediaUrl: dbPost?.mediaUrls?.[0] || '',
        permalinkUrl: `https://www.facebook.com/${postId}`,
        date: dbPost?.createdAt || new Date(),
        platform: 'facebook'
      };

      const counts = postResult ? this._extractPostCounts(postResult) : { comments: 0, reactions: 0, shares: 0 };

      return {
        postDetails,
        reach: insightsResult.reach || 0,
        views: insightsResult.views || 0,
        clicks: insightsResult.clicks || 0,
        linkClicks: insightsResult.linkClicks || 0,
        comments: counts.comments,
        shares: counts.shares,
        reactions: {
          total: counts.reactions || reactionsResult.total || 0,
          breakdown: reactionsResult.breakdown || reactionsResult
        }
      };
    } catch (err) {
      logger.warn(`[FacebookPostInsightAdapter] fetchFromAPI failed for post ${postId} (brand ${context.brandId}): ${err.message}`);
      throw err;
    }
  }

  /**
   * Chuyển đổi metrics thành dữ liệu chuẩn lưu DB (FacebookPostMetric)
   */
  toDbData(metrics, context) {
    const postType = metrics?.postDetails?.type === POST_TYPES.REEL ? POST_TYPES.REEL : POST_TYPES.IMAGE;

    return {
      brandId: context.brandId,
      postType,
      publishedAt: metrics?.postDetails?.date ? new Date(metrics.postDetails.date) : null,
      reach: metrics?.reach || 0,
      videoViews: metrics?.views || 0,
      likes: metrics?.reactions?.total || 0,
      comments: metrics?.comments || 0,
      shares: metrics?.shares || 0,
      reactions: metrics?.reactions?.total || 0,
      linkClicks: metrics?.linkClicks || 0,
      otherClicks: Math.max((metrics?.clicks || 0) - (metrics?.linkClicks || 0), 0),
      captionSnippet: metrics?.postDetails?.message || null,
      thumbnailUrl: metrics?.postDetails?.mediaUrl || null,
      permalinkUrl: metrics?.postDetails?.permalinkUrl || null
    };
  }

  parseRaw(rawOrRow) {
    if (typeof rawOrRow === 'string') {
      try {
        return JSON.parse(rawOrRow);
      } catch (err) {
        return this.emptyMetrics();
      }
    }

    if (rawOrRow && rawOrRow.postDetails) {
      return rawOrRow;
    }

    // Format DB row (FacebookPostMetric) into UI metrics shape
    const reach = rawOrRow.reach || rawOrRow.videoViews || 0;
    const views = rawOrRow.videoViews || rawOrRow.reach || 0;
    return {
      postDetails: {
        id: rawOrRow.platformPostId,
        message: rawOrRow.captionSnippet || DEFAULT_CONFIG.NO_CONTENT,
        type: rawOrRow.postType,
        mediaUrl: rawOrRow.thumbnailUrl || '',
        permalinkUrl: rawOrRow.permalinkUrl || `https://www.facebook.com/${rawOrRow.platformPostId}`,
        date: rawOrRow.publishedAt,
        platform: 'facebook'
      },
      reach,
      views,
      clicks: (rawOrRow.linkClicks || 0) + (rawOrRow.otherClicks || 0),
      linkClicks: rawOrRow.linkClicks || 0,
      comments: rawOrRow.comments || 0,
      shares: rawOrRow.shares || 0,
      reactions: {
        total: rawOrRow.reactions || rawOrRow.likes || 0,
        breakdown: {}
      }
    };
  }

  emptyMetrics() {
    return {
      postDetails: {
        id: '',
        message: DEFAULT_CONFIG.NO_CONTENT,
        type: POST_TYPES.IMAGE,
        mediaUrl: '',
        permalinkUrl: '',
        date: new Date().toISOString(),
        platform: 'facebook'
      },
      reach: 0,
      views: 0,
      clicks: 0,
      linkClicks: 0,
      comments: 0,
      shares: 0,
      reactions: { total: 0, breakdown: {} }
    };
  }

  _buildMockPostDetails(platformPostId) {
    return {
      postDetails: {
        id: platformPostId,
        message: 'Bài viết mẫu Facebook (Mock)',
        type: POST_TYPES.IMAGE,
        mediaUrl: '',
        permalinkUrl: `https://www.facebook.com/${platformPostId}`,
        date: new Date().toISOString(),
        platform: 'facebook'
      },
      reach: 1200,
      views: 1800,
      clicks: 45,
      linkClicks: 20,
      comments: 8,
      shares: 3,
      reactions: {
        total: 56,
        breakdown: { LIKE: 40, LOVE: 10, HAHA: 3, WOW: 2, SAD: 1, ANGRY: 0 }
      }
    };
  }

  _extractPostCounts(post) {
    return {
      comments: post.comments?.summary?.total_count || post.comments?.data?.length || 0,
      reactions: post.reactions?.summary?.total_count || post.reactions?.data?.length || 0,
      shares: post.shares?.count || 0
    };
  }

  _determinePostType(post) {
    const attachments = post.attachments?.data || [];
    if (attachments.length === 0) return POST_TYPES.IMAGE;
    const type = attachments[0].type;
    if (type === SOCIAL_TECHNICAL.FB_ATTACHMENT.ALBUM) return POST_TYPES.CAROUSEL;
    if (type === SOCIAL_TECHNICAL.FB_ATTACHMENT.VIDEO_INLINE || type === SOCIAL_TECHNICAL.FB_ATTACHMENT.VIDEO) return POST_TYPES.VIDEO;
    return POST_TYPES.IMAGE;
  }
}

module.exports = FacebookPostInsightAdapter;
