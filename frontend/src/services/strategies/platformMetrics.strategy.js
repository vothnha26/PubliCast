import socialService from "../social.service";

/**
 * Platform Metrics Strategy Pattern for PubliCast
 * Enforces SOLID (OCP, SRP) for platform-specific metric fetching.
 */

export const SUPPORTED_METRIC_PLATFORMS = Object.freeze({
  YOUTUBE: "YOUTUBE",
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
});

/**
 * Base Abstract Strategy for fetching post/video metrics
 */
export class BasePlatformMetricsStrategy {
  /**
   * Fetch metrics for a specific platform post/video.
   * @param {string} brandId 
   * @param {string} postId 
   * @param {string|null} socialAccountId 
   * @returns {Promise<{reactions: number, comments: number, views: number, engagement: string|number, impressions?: number, shares?: number}>}
   */
  async fetchMetrics(brandId, postId, socialAccountId = null) {
    throw new Error("Method fetchMetrics() must be implemented.");
  }
}

/**
 * Strategy for YouTube video metrics
 */
export class YoutubeMetricsStrategy extends BasePlatformMetricsStrategy {
  async fetchMetrics(brandId, postId, socialAccountId = null) {
    if (!brandId || !postId) return null;
    try {
      const res = await socialService.getPublishedVideos(brandId, null, 50, socialAccountId);
      const videos = res?.videos || (Array.isArray(res) ? res : []);
      const matched = videos.find(v => v.id === postId || v.videoId === postId);

      if (matched) {
        const views = parseInt(matched.views || 0, 10);
        const likes = parseInt(matched.likes || 0, 10);
        const comments = parseInt(matched.comments || 0, 10);
        const engagementRate = views > 0 ? (((likes + comments) / views) * 100).toFixed(1) : "0";

        return {
          reactions: likes,
          comments: comments,
          views: views,
          impressions: views,
          shares: 0,
          engagement: `${engagementRate}%`,
        };
      }

      // Fallback: If not in published videos, check tracked videos
      const trackedRes = await socialService.getTrackedVideos(brandId);
      const trackedList = trackedRes?.data || (Array.isArray(trackedRes) ? trackedRes : []);
      const matchedTracked = trackedList.find(v => v.videoId === postId || v.id === postId);

      if (matchedTracked) {
        const views = parseInt(matchedTracked.lastViews || 0, 10);
        const likes = parseInt(matchedTracked.lastLikes || 0, 10);
        const comments = parseInt(matchedTracked.lastComments || 0, 10);
        const engagementRate = views > 0 ? (((likes + comments) / views) * 100).toFixed(1) : "0";

        return {
          reactions: likes,
          comments: comments,
          views: views,
          impressions: views,
          shares: 0,
          engagement: `${engagementRate}%`,
        };
      }
    } catch (err) {
      console.warn("[YoutubeMetricsStrategy] Failed to fetch metrics:", err.message);
    }
    return null;
  }
}

/**
 * Strategy for Facebook post metrics
 */
export class FacebookMetricsStrategy extends BasePlatformMetricsStrategy {
  async fetchMetrics(brandId, postId, socialAccountId = null) {
    if (!brandId || !postId) return null;
    try {
      return await socialService.getFacebookPostDetails(brandId, postId, socialAccountId);
    } catch (err) {
      console.warn("[FacebookMetricsStrategy] Failed to fetch metrics:", err.message);
    }
    return null;
  }
}

/**
 * Strategy for Instagram post metrics
 */
export class InstagramMetricsStrategy extends BasePlatformMetricsStrategy {
  async fetchMetrics(brandId, postId, socialAccountId = null) {
    if (!brandId || !postId) return null;
    try {
      const res = await socialService.getInstagramPublishedPosts(brandId, null, 50, socialAccountId);
      const posts = res?.data || res?.posts || (Array.isArray(res) ? res : []);
      const matched = posts.find(p => p.id === postId || p.postId === postId);

      if (matched) {
        const likes = parseInt(matched.like_count || matched.likes || 0, 10);
        const comments = parseInt(matched.comments_count || matched.comments || 0, 10);
        const impressions = parseInt(matched.impressions || matched.reach || 0, 10);

        return {
          reactions: likes,
          comments: comments,
          views: impressions,
          impressions: impressions,
          shares: 0,
          engagement: impressions > 0 ? (((likes + comments) / impressions) * 100).toFixed(1) + "%" : "0%",
        };
      }
    } catch (err) {
      console.warn("[InstagramMetricsStrategy] Failed to fetch metrics:", err.message);
    }
    return null;
  }
}

/**
 * Strategy for TikTok video metrics
 */
export class TiktokMetricsStrategy extends BasePlatformMetricsStrategy {
  async fetchMetrics(brandId, postId, socialAccountId = null) {
    if (!brandId || !postId) return null;
    try {
      const res = await socialService.getTikTokPublishedVideos(brandId, null, 50);
      const videos = res?.videos || (Array.isArray(res) ? res : []);
      const matched = videos.find(v => v.id === postId);

      if (matched) {
        const views = parseInt(matched.view_count || matched.views || 0, 10);
        const likes = parseInt(matched.like_count || matched.likes || 0, 10);
        const comments = parseInt(matched.comment_count || matched.comments || 0, 10);
        const shares = parseInt(matched.share_count || matched.shares || 0, 10);

        return {
          reactions: likes,
          comments: comments,
          views: views,
          impressions: views,
          shares: shares,
          engagement: views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(1) + "%" : "0%",
        };
      }
    } catch (err) {
      console.warn("[TiktokMetricsStrategy] Failed to fetch metrics:", err.message);
    }
    return null;
  }
}

/**
 * Factory for creating PlatformMetricsStrategy instances (Factory Pattern)
 */
export class PlatformMetricsStrategyFactory {
  static #strategies = {
    [SUPPORTED_METRIC_PLATFORMS.YOUTUBE]: new YoutubeMetricsStrategy(),
    [SUPPORTED_METRIC_PLATFORMS.FACEBOOK]: new FacebookMetricsStrategy(),
    [SUPPORTED_METRIC_PLATFORMS.INSTAGRAM]: new InstagramMetricsStrategy(),
    [SUPPORTED_METRIC_PLATFORMS.TIKTOK]: new TiktokMetricsStrategy(),
  };

  /**
   * Get strategy for a platform
   * @param {string} platform 
   * @returns {BasePlatformMetricsStrategy|null}
   */
  static getStrategy(platform) {
    if (!platform) return null;
    const normalized = String(platform).trim().toUpperCase();
    return this.#strategies[normalized] || null;
  }
}
