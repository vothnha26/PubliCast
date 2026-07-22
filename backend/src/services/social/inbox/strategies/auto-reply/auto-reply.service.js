const prisma = require('../../../../../config/prisma'); // Đường dẫn đến prisma client instance
const KeywordAutoReplyStrategy = require('./keyword-reply.strategy');
const AIAutoReplyStrategy = require('./ai-reply.strategy');
const facebookComment = require('../../../facebook/facebook-comment.service');
const instagramComment = require('../../../instagram/instagram-comment.service');
const socketManager = require('../../../../workspace/socket/socket.manager');
const redisClient = require('../../../../../config/redis');
const { REDIS_NAMESPACES, REDIS_TTL, AUTO_REPLY_RATE_LIMIT_PER_WINDOW } = require('../../../../../utils/constants');
const logger = require('../../../../../utils/logger');

class AutoReplyService {
  constructor() {
    this.strategies = {
      KEYWORD: new KeywordAutoReplyStrategy(),
      AI: new AIAutoReplyStrategy()
    };
  }

  /**
   * Lấy cấu hình tự động trả lời theo socialAccountId
   */
  async getSettings(socialAccountId) {
    let settings = await prisma.autoReplySetting.findUnique({
      where: { socialAccountId }
    });

    // Nếu chưa có, tạo cấu hình mặc định
    if (!settings) {
      settings = await prisma.autoReplySetting.create({
        data: {
          socialAccountId,
          isActive: false,
          mode: 'KEYWORD',
          keywordsConfig: [],
          aiPrompt: 'Hãy trả lời câu hỏi của khách hàng một cách lịch sự và chuyên nghiệp.'
        }
      });
    }

    return settings;
  }

  /**
   * Cập nhật cấu hình tự động trả lời
   */
  async saveSettings(socialAccountId, data) {
    const { isActive, mode, keywordsConfig, aiPrompt } = data;
    
    return await prisma.autoReplySetting.upsert({
      where: { socialAccountId },
      update: {
        isActive: isActive !== undefined ? isActive : undefined,
        mode: mode || undefined,
        keywordsConfig: keywordsConfig !== undefined ? keywordsConfig : undefined,
        aiPrompt: aiPrompt !== undefined ? aiPrompt : undefined
      },
      create: {
        socialAccountId,
        isActive: isActive || false,
        mode: mode || 'KEYWORD',
        keywordsConfig: keywordsConfig || [],
        aiPrompt: aiPrompt || 'Hãy trả lời câu hỏi của khách hàng một cách lịch sự và chuyên nghiệp.'
      }
    });
  }

  /**
   * Fixed-window rate limit per social account: a comment flood with no cap
   * meant unbounded LLM cost and risked Meta's anti-spam block on the page
   * (#100). Returns true if the caller is still within budget.
   */
  async _checkRateLimit(socialAccountId) {
    const key = `${REDIS_NAMESPACES.RATE_LIMIT}:auto-reply:${socialAccountId}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, REDIS_TTL.AUTO_REPLY_RATE_LIMIT_WINDOW_SEC);
    }
    return count <= AUTO_REPLY_RATE_LIMIT_PER_WINDOW;
  }

  /**
   * Thực hiện quy trình tự động phản hồi bình luận
   * @param {string} socialAccountId - ID tài khoản MXH (Facebook Page ID)
   * @param {string} commentText - Nội dung bình luận của người dùng
   * @param {string} commentPlatformId - ID bình luận trên nền tảng (Facebook comment id)
   * @param {string} brandId - ID Brand quản lý
   */
  async executeAutoReply(socialAccountId, commentText, commentPlatformId, brandId) {
    try {
      const settings = await this.getSettings(socialAccountId);
      
      if (!settings || !settings.isActive) {
        logger.info(`[AutoReplyService] Auto-reply is disabled or not configured for account: ${socialAccountId}`);
        return null;
      }

      const withinBudget = await this._checkRateLimit(socialAccountId);
      if (!withinBudget) {
        logger.warn(`[AutoReplyService] Rate limit exceeded for account ${socialAccountId}, skipping auto-reply for comment: "${commentText}"`);
        return null;
      }

      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId }
      });
      if (!socialAccount) {
        logger.warn(`[AutoReplyService] Social account not found: ${socialAccountId}`);
        return null;
      }
      const platform = socialAccount.platform.toUpperCase();

      const strategy = this.strategies[settings.mode];
      if (!strategy) {
        logger.warn(`[AutoReplyService] Unsupported auto-reply mode: ${settings.mode}`);
        return null;
      }

      // Xác định bối cảnh/cấu hình cần truyền vào Strategy
      const config = settings.mode === 'KEYWORD' ? settings.keywordsConfig : settings.aiPrompt;
      
      logger.info(`[AutoReplyService] Executing auto-reply in mode: ${settings.mode} for comment: "${commentText}"`);
      const replyText = await strategy.reply(commentText, config);

      if (!replyText) {
        logger.info(`[AutoReplyService] No match or reply generated for comment: "${commentText}"`);
        return null;
      }

      logger.info(`[AutoReplyService] Generated auto-reply: "${replyText}". Sending to platform ${platform} API...`);
      
      let savedReply;
      if (platform === 'FACEBOOK') {
        savedReply = await facebookComment.replyToComment(brandId, commentPlatformId, replyText);
      } else if (platform === 'INSTAGRAM') {
        savedReply = await instagramComment.replyToComment(brandId, commentPlatformId, replyText);
      } else {
        logger.warn(`[AutoReplyService] Platform ${platform} does not support comment auto-reply yet`);
        return null;
      }

      // Gửi Socket.io báo cho frontend cập nhật UI ngay lập tức
      const room = `brand_room_${brandId}`;
      socketManager.emitToRoom(room, 'new_inbox_item', savedReply);
      logger.info(`[AutoReplyService] Broadcasted auto-reply message to room ${room}`);

      return savedReply;
    } catch (error) {
      logger.error('[AutoReplyService] Failed to execute auto-reply:', error);
      return null;
    }
  }
}

module.exports = new AutoReplyService();
