const prisma = require('../../../config/prisma');
const logger = require('../../../utils/logger');
const youtubePubSubService = require('./youtube-pubsub.service');
const { YOUTUBE_PUBSUB } = require('./youtube.constants');

/**
 * YouTube PubSubHubbub (WebSub) Auto-Renewal Service
 * 
 * Tuân thủ nguyên tắc SOLID (Single Responsibility):
 * - Chịu trách nhiệm duy nhất về việc lập lịch quét và tự động gia hạn (renew) các subscription sắp hết hạn.
 */
class YoutubePubSubRenewalService {
  constructor() {
    this._intervalId = null;
    this._timeoutId = null;
  }

  /**
   * Khởi động bộ lập lịch gia hạn (scheduler)
   */
  startScheduler() {
    if (this._intervalId || this._timeoutId) {
      logger.warn('[YoutubePubSubRenewal] Scheduler is already running.');
      return;
    }

    logger.info(`[YoutubePubSubRenewal] Initializing scheduler... (Startup delay: ${YOUTUBE_PUBSUB.RENEWAL_STARTUP_DELAY_MS / 1000}s)`);

    // Độ trễ khởi động lần đầu để tránh tranh chấp tài nguyên lúc server bắt đầu
    this._timeoutId = setTimeout(() => {
      logger.info('[YoutubePubSubRenewal] Running initial renewal scan...');
      this.renewExpiringSoon().catch(err => {
        logger.error('[YoutubePubSubRenewal] Error in initial renewal scan:', err);
      });
    }, YOUTUBE_PUBSUB.RENEWAL_STARTUP_DELAY_MS);

    // Chạy quét định kỳ
    this._intervalId = setInterval(() => {
      logger.info('[YoutubePubSubRenewal] Running scheduled renewal scan...');
      this.renewExpiringSoon().catch(err => {
        logger.error('[YoutubePubSubRenewal] Error in scheduled renewal scan:', err);
      });
    }, YOUTUBE_PUBSUB.RENEWAL_CHECK_INTERVAL_MS);

    logger.info(`[YoutubePubSubRenewal] Scheduler started with interval: ${YOUTUBE_PUBSUB.RENEWAL_CHECK_INTERVAL_MS / 1000}s`);
  }

  /**
   * Dừng bộ lập lịch gia hạn
   */
  stopScheduler() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    logger.info('[YoutubePubSubRenewal] Scheduler stopped.');
  }

  /**
   * Tìm kiếm các subscriptions sắp hết hạn và thực hiện gửi yêu cầu gia hạn
   */
  async renewExpiringSoon() {
    const callbackUrl = process.env.PUBLIC_WEBHOOK_URL
      ? `${process.env.PUBLIC_WEBHOOK_URL}/api/v1/social/youtube/pubsub/callback`
      : null;

    if (!callbackUrl) {
      logger.warn('[YoutubePubSubRenewal] PUBLIC_WEBHOOK_URL is not configured. Skipping renewal cycle.');
      return;
    }

    const threshold = new Date(Date.now() + YOUTUBE_PUBSUB.RENEWAL_THRESHOLD_MS);

    logger.info(`[YoutubePubSubRenewal] Checking for subscriptions expiring before: ${threshold.toISOString()}`);

    // Query các subscription sắp hết hạn dựa vào status và expiresAt
    // Tận dụng index composite @@index([status, expiresAt]) trên model YouTubeSubscription
    const expiring = await prisma.youTubeSubscription.findMany({
      where: {
        status: YOUTUBE_PUBSUB.STATUS.SUBSCRIBED,
        expiresAt: { lt: threshold }
      }
    });

    if (expiring.length === 0) {
      logger.info('[YoutubePubSubRenewal] No expiring subscriptions found.');
      return;
    }

    logger.info(`[YoutubePubSubRenewal] Found ${expiring.length} subscription(s) expiring soon. Requesting renewals...`);

    // Gia hạn từng subscription độc lập
    for (const sub of expiring) {
      try {
        logger.info(`[YoutubePubSubRenewal] Renewing subscription for channel: ${sub.channelId}`);
        const result = await youtubePubSubService.requestHubSubscription(sub.channelId, callbackUrl, YOUTUBE_PUBSUB.MODE.SUBSCRIBE);
        
        if (result && result.success) {
          logger.info(`[YoutubePubSubRenewal] Renewal request accepted by Google Hub for channel: ${sub.channelId}`);
        } else {
          logger.error(`[YoutubePubSubRenewal] Google Hub rejected renewal for channel ${sub.channelId}: ${result ? result.error : 'Unknown error'}`);
        }
      } catch (err) {
        // Log lỗi ngoại lệ (ví dụ: mất kết nối DB/mạng) và tiếp tục vòng lặp
        logger.error(`[YoutubePubSubRenewal] Failed to renew subscription for channel ${sub.channelId}: ${err.message}`);
      }
    }
  }
}

module.exports = new YoutubePubSubRenewalService();
