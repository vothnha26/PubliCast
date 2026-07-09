const prisma = require('../../config/prisma');
const tiktokGateway = require('./tiktok/tiktok.gateway');
const tiktokAnalytics = require('./tiktok/tiktok-analytics.service');
const logger = require('../../utils/logger');
const { PLATFORMS } = require('../../utils/constants');

class PostMetricSyncService {
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

    // Xử lý TikTok
    const tiktokVideoId = platformIdMap.TIKTOK || platformIdMap.tiktok;
    if (tiktokVideoId) {
      await this._syncTikTokVideo(post, tiktokVideoId);
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

    // Lưu snapshot tương tác vào database
    await prisma.postMetricHistory.create({
      data: {
        brandId: post.brandId,
        postId: post.id,
        platform: 'TIKTOK',
        platformPostId: tiktokVideoId,
        views,
        likes,
        comments,
        shares,
        saves: 0 // API TikTok Display không trả về lượt lưu
      }
    });

    logger.info(`[PostMetricSync] Successfully recorded snapshot for TikTok video ${tiktokVideoId} (Views: ${views}, Likes: ${likes})`);
  }
}

module.exports = new PostMetricSyncService();
