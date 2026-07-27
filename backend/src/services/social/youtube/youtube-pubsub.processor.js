const youtubePubSubService = require('./youtube-pubsub.service');
const { XMLParser } = require('fast-xml-parser');
const prisma = require('../../../config/prisma');
const logger = require('../../../utils/logger');
const youtubeAnalyticsService = require('./youtube-analytics.service');
const postMetricSyncService = require('../post-metric-sync.service');

/**
 * YouTube PubSub Event Processor (Facade Pattern)
 * 
 * Nhiệm vụ:
 * Parse Atom Feed XML -> Lấy videoId/channelId -> Đồng bộ video & metrics ngay lập tức.
 */
class YoutubePubSubProcessor {
  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  /**
   * Xử lý payload XML từ Webhook POST
   * @param {string} xmlPayload Raw XML string từ Google Hub
   * @param {string} signatureHeader Header X-Hub-Signature
   */
  async processEventPayload(xmlPayload, signatureHeader = null) {
    try {
      const parsed = this.xmlParser.parse(xmlPayload);
      const feed = parsed.feed;

      if (!feed || !feed.entry) {
        logger.info('[YouTube PubSub Processor] Event payload received but contains no video entry (Ping/Test event).');
        return { processed: false, reason: 'NO_ENTRY' };
      }

      const entry = Array.isArray(feed.entry) ? feed.entry[0] : feed.entry;
      const videoId = entry['yt:videoId'];
      const channelId = entry['yt:channelId'];
      const title = entry.title;
      const published = entry.published;
      const updated = entry.updated;

      if (!videoId || !channelId) {
        logger.warn('[YouTube PubSub Processor] Entry missing videoId or channelId:', entry);
        return { processed: false, reason: 'INVALID_ENTRY' };
      }

      logger.info(`[YouTube PubSub Event] Received event for Video ID: ${videoId} (Channel: ${channelId}, Title: "${title}")`);

      // Tìm SocialAccount gắn với channelId này
      const youtubeChannel = await prisma.youTubeChannel.findFirst({
        where: { channelId },
        include: {
          socialAccount: true,
          youtubeSubscription: true
        }
      });

      if (!youtubeChannel) {
        logger.warn(`[YouTube PubSub Processor] Received event for unlinked channel ${channelId}.`);
        return { processed: false, reason: 'UNLINKED_CHANNEL' };
      }

      // Xác thực Signature nếu có secret
      if (youtubeChannel.youtubeSubscription && youtubeChannel.youtubeSubscription.hubSecret && signatureHeader) {
        const isValidSignature = youtubePubSubService.verifySignature(
          xmlPayload,
          signatureHeader,
          youtubeChannel.youtubeSubscription.hubSecret
        );

        if (!isValidSignature) {
          logger.error(`[YouTube PubSub Processor] Invalid HMAC signature for channel ${channelId}. Event rejected.`);
          return { processed: false, reason: 'INVALID_SIGNATURE' };
        }
      }

      // Cập nhật lastEventAt
      if (youtubeChannel.youtubeSubscription) {
        await prisma.youTubeSubscription.update({
          where: { id: youtubeChannel.youtubeSubscription.id },
          data: { lastEventAt: new Date() }
        });
      }

      // Đồng bộ thông tin video & snapshot metric tức thì
      const brandId = youtubeChannel.socialAccount.brandId;
      await this._handleVideoSync(brandId, videoId, title);

      return { processed: true, videoId, channelId };
    } catch (error) {
      logger.error('[YouTube PubSub Processor] Error parsing/processing XML payload:', error.message);
      throw error;
    }
  }

  /**
   * Đồng bộ Video & Record Snapshot
   */
  async _handleVideoSync(brandId, videoId, videoTitle) {
    try {
      // 1. Kiểm tra bài post có sẵn trong hệ thống chưa
      const existingPost = await prisma.post.findFirst({
        where: {
          brandId,
          platformPostId: { contains: videoId }
        }
      });

      if (existingPost) {
        logger.info(`[YouTube PubSub Processor] Syncing metrics for existing post ${existingPost.id} (Video ${videoId})...`);
        await postMetricSyncService._syncYouTubeVideo(existingPost, videoId);
      } else {
        logger.info(`[YouTube PubSub Processor] New video detected (${videoId} - "${videoTitle}"). Triggering channel metrics sync...`);
        // Sync channel metrics mới nhất
        const socialAccount = await prisma.socialAccount.findFirst({
          where: { brandId, platform: 'YOUTUBE' }
        });
        if (socialAccount) {
          await youtubeAnalyticsService.syncChannelMetrics(socialAccount.id);
        }
      }
    } catch (err) {
      logger.error(`[YouTube PubSub Processor] Failed to sync video ${videoId}:`, err.message);
    }
  }
}

module.exports = new YoutubePubSubProcessor();
