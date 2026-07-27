const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const socketManager = require('../../../workspace/socket/socket.manager');
const redisClient = require('../../../../config/redis');
const logger = require('../../../../utils/logger');
const { FACEBOOK_API, REDIS_NAMESPACES, REDIS_TTL } = require('../../../../utils/constants');

class BaseWebhookStrategy {
  async isDuplicateEvent(eventId) {
    if (!eventId) return false;
    const key = `${REDIS_NAMESPACES.WEBHOOK_DEDUP}:${eventId}`;
    try {
      // Dùng Redis NX để ghi đè nếu chưa tồn tại
      const result = await redisClient.set(key, '1', {
        NX: true,
        EX: REDIS_TTL.WEBHOOK_DEDUP_SEC
      });
      const isDuplicate = result === null;
      if (isDuplicate) {
        logger.info(`[BaseWebhookStrategy] Webhook duplicate detected for event: ${eventId}. Ignoring.`);
      }
      return isDuplicate;
    } catch (err) {
      logger.error(`[BaseWebhookStrategy] Redis idempotency check failed: ${err.message}. Defaulting to false.`, err);
      return false;
    }
  }

  async getAccount(platformAccountId, platform) {
    const account = await socialAccountRepository.findByPlatformAccountIdAndPlatform(platformAccountId, platform);
    if (!account) {
      throw new Error(`SocialAccount not found for platformAccountId: ${platformAccountId}, platform: ${platform}`);
    }
    return account;
  }

  async getInbox(brandId) {
    return inboxRepository.findOrCreateInbox(brandId);
  }

  async fetchMetaConversationId(pageId, userId, accessToken) {
    try {
      const url = `${FACEBOOK_API.GRAPH_URL}/v25.0/${pageId}/conversations?user_id=${userId}&access_token=${accessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        logger.warn(`[BaseWebhookStrategy] Failed to fetch conversation ID from Meta: ${JSON.stringify(err)}`);
        return null;
      }
      const data = await res.json();
      return data.data?.[0]?.id || null;
    } catch (error) {
      logger.error('[BaseWebhookStrategy] Error fetching conversation ID:', error);
      return null;
    }
  }

  notifyClient(brandId, event, data) {
    const room = `brand_room_${brandId}`;
    socketManager.emitToRoom(room, event, data);
    logger.info(`[BaseWebhookStrategy] Broadcasted event ${event} to room ${room}`);
  }
}

module.exports = BaseWebhookStrategy;
