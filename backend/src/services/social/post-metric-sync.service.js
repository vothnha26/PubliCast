const prisma = require('../../config/prisma');
const tiktokGateway = require('./tiktok/tiktok.gateway');
const tiktokAnalytics = require('./tiktok/tiktok-analytics.service');
const facebookPostService = require('./facebook/facebook-post.service');
const youtubeAnalyticsService = require('./youtube/youtube-analytics.service');
const logger = require('../../utils/logger');
const { PLATFORMS } = require('../../utils/constants');
const { upsertDailySnapshot } = require('./post-analytics-snapshot-writer');

class PostMetricSyncService {
  /**
   * Re-exported for backward compatibility with existing call sites; the
   * canonical implementation lives in post-analytics-snapshot-writer.js
   * (kept dependency-free so cold-start code doesn't have to pull in this
   * whole service, including the heavy YouTube/TikTok gateway chain).
   */
  async upsertDailySnapshot(params) {
    return upsertDailySnapshot(params);
  }

  /**
   * Đồng bộ số liệu tương tác cho các bài viết đã xuất bản
   */
  async syncPostMetrics() {
    logger.info('[PostMetricSync] Starting background sync for post metrics...');

    try {
      // Lấy tất cả bài viết đã đăng thành công có platformPostId
      const posts = await prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          isDeleted: false,
          platformPostId: { not: null },
          // Chỉ sync các bài viết đăng trong vòng 14 ngày qua để tối ưu hiệu năng
          createdAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          }
        }
      });

      if (posts.length === 0) {
        logger.info('[PostMetricSync] No posts found to sync.');
        return;
      }

      logger.info(`[PostMetricSync] Found ${posts.length} posts to process.`);

      for (const post of posts) {
        await this._syncSinglePost(post).catch(err => {
          logger.error(`[PostMetricSync] Error syncing post ${post.id}:`, err.message);
        });
      }

      logger.info('[PostMetricSync] Post metrics sync completed.');
    } catch (error) {
      logger.error('[PostMetricSync] Global sync failed:', error.message);
    }
  }

  async _syncSinglePost(post) {
    let platformIdMap = {};
    try {
      platformIdMap = JSON.parse(post.platformPostId);
    } catch (e) {
      // Tương thích ngược nếu platformPostId là plain string (coi là YouTube video ID)
      platformIdMap = { YOUTUBE: post.platformPostId };
    }

    if (!platformIdMap || typeof platformIdMap !== 'object') {
      return;
    }

    const tiktokVideoId = platformIdMap.TIKTOK || platformIdMap.tiktok;
    if (tiktokVideoId) {
      await this._syncTikTokVideo(post, tiktokVideoId);
    }

    const facebookPostId = platformIdMap.FACEBOOK || platformIdMap.facebook;
    if (facebookPostId) {
      await this._syncFacebookPost(post, facebookPostId);
    }

    const youtubeVideoId = platformIdMap.YOUTUBE || platformIdMap.youtube;
    if (youtubeVideoId) {
      await this._syncYouTubeVideo(post, youtubeVideoId);
    }
  }

  async _syncFacebookPost(post, platformPostId) {
    try {
      const details = await facebookPostService.getPostDetails(post.brandId, platformPostId);
      await this.upsertDailySnapshot({
        postId: post.id,
        platformPostId,
        brandId: post.brandId,
        platform: PLATFORMS.FACEBOOK,
        date: new Date(),
        metrics: {
          views: details.views,
          reach: details.reach,
          clicks: details.clicks,
          reactions: details.reactions?.total || 0
        },
        isEstimated: true
      });
      logger.info(`[PostMetricSync] Recorded snapshot for Facebook post ${platformPostId}`);
    } catch (err) {
      logger.error(`[PostMetricSync] Failed to sync Facebook post ${platformPostId}:`, err.message);
    }
  }

  async _syncYouTubeVideo(post, videoId) {
    try {
      const rows = await youtubeAnalyticsService.getVideoAnalytics(post.brandId, videoId);
      const totals = rows.reduce((acc, row) => ({
        views: acc.views + (row.views || 0)
      }), { views: 0 });

      await this.upsertDailySnapshot({
        postId: post.id,
        platformPostId: videoId,
        brandId: post.brandId,
        platform: PLATFORMS.YOUTUBE,
        date: new Date(),
        metrics: { views: totals.views, reach: 0, clicks: 0, reactions: 0 },
        isEstimated: false
      });
      logger.info(`[PostMetricSync] Recorded snapshot for YouTube video ${videoId}`);
    } catch (err) {
      logger.error(`[PostMetricSync] Failed to sync YouTube video ${videoId}:`, err.message);
    }
  }

  async _syncTikTokVideo(post, tiktokVideoId) {
    // Tìm SocialAccount của brand kết nối TikTok
    const accounts = await prisma.socialAccount.findMany({
      where: {
        brandId: post.brandId,
        platform: PLATFORMS.TIKTOK,
        isConnected: true
      }
    });

    if (accounts.length === 0) {
      logger.warn(`[PostMetricSync] TikTok account not connected for brand ${post.brandId}, skipping.`);
      return;
    }

    let account = accounts[0];

    // Bỏ qua tài khoản mock theo yêu cầu của người dùng
    if (account.accessToken && account.accessToken.startsWith('mock-')) {
      logger.info(`[PostMetricSync] TikTok account is a mock account, skipping sync for video ${tiktokVideoId}.`);
      return;
    }

    // Refresh token nếu hết hạn
    account = await tiktokAnalytics.getOrRefreshAccount(account);

    logger.info(`[PostMetricSync] Fetching stats for TikTok video ${tiktokVideoId} using real API...`);

    // Gọi API lấy danh sách video để lọc ra video cần sync
    let cursor = 0;
    let hasMore = true;
    let targetVideo = null;

    while (hasMore && !targetVideo) {
      const res = await tiktokGateway.getVideoList(account.accessToken, cursor, 20);
      if (res && res.videos && res.videos.length > 0) {
        targetVideo = res.videos.find(v => v.id === tiktokVideoId);
        hasMore = res.has_more;
        cursor = res.cursor;
      } else {
        hasMore = false;
      }
    }

    if (!targetVideo) {
      logger.warn(`[PostMetricSync] Video ${tiktokVideoId} not found in user's published videos list.`);
      return;
    }

    const views = targetVideo.view_count || 0;
    const likes = targetVideo.like_count || 0;
    const comments = targetVideo.comment_count || 0;
    const shares = targetVideo.share_count || 0;

    await this.upsertDailySnapshot({
      postId: post.id,
      platformPostId: tiktokVideoId,
      brandId: post.brandId,
      platform: PLATFORMS.TIKTOK,
      date: new Date(),
      metrics: {
        views,
        reach: 0,
        clicks: 0,
        reactions: likes + comments + shares
      },
      isEstimated: true
    });

    logger.info(`[PostMetricSync] Successfully recorded snapshot for TikTok video ${tiktokVideoId} (Views: ${views}, Likes: ${likes})`);
  }
}

module.exports = new PostMetricSyncService();
