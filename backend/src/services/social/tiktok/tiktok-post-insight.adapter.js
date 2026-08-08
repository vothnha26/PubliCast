const BasePostInsightAdapter = require('../../../core/insights/base-post-insight.adapter');
const tiktokGateway = require('./tiktok.gateway');
const prisma = require('../../../config/prisma');
const { PLATFORMS, POST_TYPES, DEFAULT_CONFIG } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

const TIKTOK_POST_METRICS_TTL_MS = 24 * 60 * 60 * 1000;

class TikTokPostInsightAdapter extends BasePostInsightAdapter {
  get platform() {
    return PLATFORMS.TIKTOK;
  }

  get prismaModel() {
    return prisma.socialPostMetric;
  }

  get isUniqueKeyed() {
    return true;
  }

  get staleMs() {
    return TIKTOK_POST_METRICS_TTL_MS;
  }

  /**
   * Fetch live metrics from TikTok Display API for a specific video
   * @param {string} accessToken - Access token for TikTok account
   * @param {string} postId - platformPostId / videoId
   * @param {object} context - { brandId, socialAccountId, platformPostId }
   */
  async fetchFromAPI(accessToken, postId, context) {
    if (accessToken && accessToken.startsWith('mock-')) {
      return this._buildMockPostDetails(postId);
    }

    try {
      const dbPost = await prisma.post.findFirst({
        where: { platformPostId: postId }
      }).catch(() => null);

      // TikTok video list endpoint returns video statistics
      const res = await tiktokGateway.getVideoList(accessToken, 0, 50).catch(() => ({ videos: [] }));
      const foundVideo = (res?.videos || []).find(v => String(v.id) === String(postId));

      if (foundVideo) {
        const views = foundVideo.view_count || 0;
        const likes = foundVideo.like_count || 0;
        const comments = foundVideo.comment_count || 0;
        const shares = foundVideo.share_count || 0;
        const reach = views; // TikTok basic display API does not supply organic reach; fallback to views
        const totalEngagements = likes + comments + shares;
        const engagementRate = views > 0 ? parseFloat(((totalEngagements / views) * 100).toFixed(2)) : 0;

        return {
          postDetails: {
            id: foundVideo.id,
            message: foundVideo.title || foundVideo.video_description || dbPost?.caption || DEFAULT_CONFIG.NO_CONTENT,
            type: POST_TYPES.VIDEO,
            mediaUrl: foundVideo.cover_image_url || dbPost?.mediaUrls?.[0] || '',
            permalinkUrl: foundVideo.share_url || `https://www.tiktok.com/video/${foundVideo.id}`,
            date: foundVideo.create_time ? new Date(foundVideo.create_time * 1000) : new Date(),
            platform: 'tiktok'
          },
          views,
          reach,
          likes,
          comments,
          shares,
          reactions: {
            total: likes,
            breakdown: {}
          },
          engagementRate
        };
      }

      return {
        postDetails: {
          id: postId,
          message: dbPost?.caption || DEFAULT_CONFIG.NO_CONTENT,
          type: POST_TYPES.VIDEO,
          mediaUrl: dbPost?.mediaUrls?.[0] || '',
          permalinkUrl: `https://www.tiktok.com/video/${postId}`,
          date: dbPost?.createdAt || new Date(),
          platform: 'tiktok'
        },
        views: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        reactions: { total: 0, breakdown: {} },
        engagementRate: 0
      };
    } catch (err) {
      logger.warn(`[TikTokPostInsightAdapter] fetchFromAPI failed for post ${postId} (brand ${context.brandId}): ${err.message}`);
      throw err;
    }
  }

  /**
   * Convert metrics to SocialPostMetric model format
   */
  toDbData(metrics, context) {
    const { brandId, socialAccountId, platformPostId } = context;
    const details = metrics.postDetails || {};
    const views = metrics.views || 0;
    const reach = metrics.reach || views;
    const likes = metrics.likes || metrics.reactions?.total || 0;
    const comments = metrics.comments || 0;
    const shares = metrics.shares || 0;
    const engagementRate = metrics.engagementRate ?? (views > 0 ? parseFloat((((likes + comments + shares) / views) * 100).toFixed(2)) : 0);

    return {
      brandId,
      socialAccountId,
      platformPostId,
      postType: details.type || POST_TYPES.VIDEO,
      caption: details.message || null,
      thumbnailUrl: details.mediaUrl || null,
      permalinkUrl: details.permalinkUrl || `https://www.tiktok.com/video/${platformPostId}`,
      reach,
      views,
      likes,
      comments,
      shares,
      engagementRate,
      fetchedAt: new Date()
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

    // Format DB row (SocialPostMetric) into UI metrics shape
    const views = rawOrRow.views || 0;
    const reach = rawOrRow.reach || views;
    const likes = rawOrRow.likes || 0;
    const comments = rawOrRow.comments || 0;
    const shares = rawOrRow.shares || 0;
    const engagementRate = rawOrRow.engagementRate ?? (views > 0 ? parseFloat((((likes + comments + shares) / views) * 100).toFixed(2)) : 0);

    return {
      postDetails: {
        id: rawOrRow.platformPostId,
        message: rawOrRow.captionSnippet || DEFAULT_CONFIG.NO_CONTENT,
        type: rawOrRow.postType || POST_TYPES.VIDEO,
        mediaUrl: rawOrRow.thumbnailUrl || '',
        permalinkUrl: rawOrRow.permalinkUrl || `https://www.tiktok.com/video/${rawOrRow.platformPostId}`,
        date: rawOrRow.publishedAt || rawOrRow.createdAt,
        platform: 'tiktok'
      },
      views,
      reach,
      likes,
      comments,
      shares,
      reactions: {
        total: likes,
        breakdown: {}
      },
      engagementRate
    };
  }

  _buildMockPostDetails(postId) {
    const views = 2952;
    const likes = 456;
    const comments = 1;
    const shares = 9;
    const reach = 2550;
    const engagementRate = parseFloat((((likes + comments + shares) / views) * 100).toFixed(2)); // ~15.79% -> ~16%

    return {
      postDetails: {
        id: postId,
        message: 'Mock TikTok Video Caption',
        type: POST_TYPES.VIDEO,
        mediaUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60',
        permalinkUrl: `https://www.tiktok.com/video/${postId}`,
        date: new Date(),
        platform: 'tiktok'
      },
      views,
      reach,
      likes,
      comments,
      shares,
      reactions: {
        total: likes,
        breakdown: {}
      },
      engagementRate
    };
  }
}

module.exports = TikTokPostInsightAdapter;
