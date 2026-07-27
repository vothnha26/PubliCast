const prisma = require('../../../config/prisma');
const crypto = require('crypto');
const logger = require('../../../utils/logger');
const { YOUTUBE_PUBSUB } = require('./youtube.constants');

/**
 * YouTube PubSubHubbub (WebSub) Service
 * 
 * Tuân thủ SOLID Principles:
 * - Single Responsibility: Quản lý vòng đời Subscriptions & Gửi/Hủy đăng ký tới Google Hub.
 * - Open/Closed: Dễ dàng mở rộng cho các Hub Provider khác nếu cần.
 */
class YoutubePubSubService {
  /**
   * Tạo secret ngẫu nhiên bảo mật HMAC cho từng subscription
   */
  generateHubSecret() {
    return crypto.randomBytes(24).toString('hex');
  }

  /**
   * Đăng ký (Subscribe) hoặc Hủy đăng ký (Unsubscribe) tới Google Hub
   * 
   * @param {string} channelId ID Kênh YouTube (UCxxxxxx)
   * @param {string} callbackUrl Public Webhook URL của PubliCast
   * @param {string} mode 'subscribe' | 'unsubscribe'
   */
  async requestHubSubscription(channelId, callbackUrl, mode = YOUTUBE_PUBSUB.MODE.SUBSCRIBE) {
    try {
      const youtubeChannel = await prisma.youTubeChannel.findFirst({
        where: { channelId }
      });

      if (!youtubeChannel) {
        throw new Error(`[YouTube PubSub] YouTube channel ${channelId} not found in database.`);
      }

      // Lấy hoặc tạo mới thông tin Subscription
      let subscription = await prisma.youTubeSubscription.findUnique({
        where: { youtubeChannelId: youtubeChannel.id }
      });

      const hubSecret = subscription ? subscription.hubSecret : this.generateHubSecret();
      const topicUrl = YOUTUBE_PUBSUB.topicUrl(channelId);

      if (!subscription) {
        subscription = await prisma.youTubeSubscription.create({
          data: {
            youtubeChannelId: youtubeChannel.id,
            channelId,
            topicUrl,
            hubSecret,
            status: YOUTUBE_PUBSUB.STATUS.PENDING,
            leaseSeconds: YOUTUBE_PUBSUB.DEFAULT_LEASE_SECONDS
          }
        });
      }

      // Chuẩn bị payload gửi POST x-www-form-urlencoded tới Google Hub
      const params = new URLSearchParams();
      params.append('hub.callback', callbackUrl);
      params.append('hub.mode', mode);
      params.append('hub.topic', topicUrl);
      params.append('hub.lease_seconds', YOUTUBE_PUBSUB.DEFAULT_LEASE_SECONDS.toString());
      params.append('hub.secret', hubSecret);

      logger.info(`[YouTube PubSub] Sending ${mode} request to Google Hub for channel ${channelId}...`);

      const response = await fetch(YOUTUBE_PUBSUB.HUB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      // Google Hub trả về HTTP 202 Accepted khi nhận yêu cầu thành công
      if (response.status === 202 || response.status === 200 || response.status === 204) {
        logger.info(`[YouTube PubSub] Google Hub accepted ${mode} request for channel ${channelId} (HTTP ${response.status}). Awaiting challenge verification.`);
        return { success: true, subscriptionId: subscription.id };
      }

      const errorText = await response.text();
      logger.error(`[YouTube PubSub] Google Hub rejected ${mode} request for channel ${channelId}:`, errorText);
      
      await prisma.youTubeSubscription.update({
        where: { id: subscription.id },
        data: { status: YOUTUBE_PUBSUB.STATUS.FAILED }
      });

      return { success: false, error: errorText };
    } catch (error) {
      logger.error(`[YouTube PubSub] Failed to request ${mode} for channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Xử lý xác nhận Intent Verification (Google Hub gọi GET Callback)
   */
  async verifyIntent(query) {
    const mode = query['hub.mode'];
    const topic = query['hub.topic'];
    const challenge = query['hub.challenge'];
    const leaseSecondsStr = query['hub.lease_seconds'];

    if (!mode || !topic || !challenge) {
      logger.warn('[YouTube PubSub Verification] Missing required hub verification parameters.');
      return { isValid: false, statusCode: 400, challenge: null };
    }

    // Trích xuất channelId từ topic URL
    const match = topic.match(/channel_id=([^&]+)/);
    const channelId = match ? match[1] : null;

    if (!channelId) {
      logger.warn(`[YouTube PubSub Verification] Invalid topic URL: ${topic}`);
      return { isValid: false, statusCode: 404, challenge: null };
    }

    const youtubeChannel = await prisma.youTubeChannel.findFirst({
      where: { channelId }
    });

    if (!youtubeChannel) {
      logger.warn(`[YouTube PubSub Verification] Channel ${channelId} not found.`);
      return { isValid: false, statusCode: 404, challenge: null };
    }

    const leaseSeconds = parseInt(leaseSecondsStr || YOUTUBE_PUBSUB.DEFAULT_LEASE_SECONDS.toString(), 10);
    const expiresAt = new Date(Date.now() + leaseSeconds * 1000);

    if (mode === YOUTUBE_PUBSUB.MODE.SUBSCRIBE) {
      await prisma.youTubeSubscription.update({
        where: { youtubeChannelId: youtubeChannel.id },
        data: {
          status: YOUTUBE_PUBSUB.STATUS.SUBSCRIBED,
          leaseSeconds,
          subscribedAt: new Date(),
          expiresAt
        }
      });
      logger.info(`[YouTube PubSub Verification] Successfully verified SUBSCRIBE for channel ${channelId}. Expires at: ${expiresAt.toISOString()}`);
    } else if (mode === YOUTUBE_PUBSUB.MODE.UNSUBSCRIBE) {
      await prisma.youTubeSubscription.update({
        where: { youtubeChannelId: youtubeChannel.id },
        data: {
          status: YOUTUBE_PUBSUB.STATUS.EXPIRED
        }
      });
      logger.info(`[YouTube PubSub Verification] Successfully verified UNSUBSCRIBE for channel ${channelId}.`);
    }

    return { isValid: true, statusCode: 200, challenge };
  }

  /**
   * Xác thực HMAC SHA-1 signature của incoming Atom Feed XML
   */
  verifySignature(rawPayload, signatureHeader, secret) {
    if (!signatureHeader || !secret) return false;

    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha1') return false;

    const expectedSignature = parts[1];
    const computedSignature = crypto
      .createHmac('sha1', secret)
      .update(rawPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(computedSignature));
  }
}

module.exports = new YoutubePubSubService();
