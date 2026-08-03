const BaseSocialService = require('../base-social.service');
const telegramGateway = require('./telegram.gateway');
const telegramPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { encrypt, decrypt } = require('../../../utils/encryption');
const prisma = require('../../../config/prisma');
const logger = require('../../../utils/logger');

class TelegramService extends BaseSocialService {
  /**
   * Kết nối Telegram channel/group
   */
  async connectChannel(brandId, botToken, chatId) {
    if (!brandId || !botToken || !chatId) {
      throw new Error('brandId, botToken, and chatId are required');
    }

    logger.debug(`[Telegram Service] Connecting Telegram channel/group...`);
    const chatInfo = await telegramGateway.getChatInfo(botToken, chatId);

    // Mock analytics initial data
    const analytics = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      summary: { followers: chatInfo.memberCount, views: chatInfo.memberCount * 5 },
      balance: [
        { date: new Date().toISOString().split('T')[0], acquired: chatInfo.memberCount, lost: 0 }
      ],
      interactions: {
        likes: Math.round(chatInfo.memberCount * 0.1),
        comments: Math.round(chatInfo.memberCount * 0.05),
        shares: Math.round(chatInfo.memberCount * 0.02),
        clicks: Math.round(chatInfo.memberCount * 0.08)
      }
    };

    const channelData = {
      pageId: chatInfo.id,
      username: chatInfo.username,
      displayName: chatInfo.title,
      profilePictureUrl: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&auto=format&fit=crop&q=60',
      chatType: chatInfo.type,
      memberCount: chatInfo.memberCount,
      analytics
    };

    // Save connection
    const tokens = {
      access_token: botToken,
      refresh_token: '',
      expiry_date: null,
      scope: 'bot'
    };

    return await socialAccountRepository.upsertTelegramAccount(brandId, channelData, tokens);
  }

  /**
   * Đăng bài viết lên Telegram
   */
  async publishPost(brandId, postData) {
    // 1. Tìm tài khoản Telegram của Brand
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, 'TELEGRAM');
    if (!account || !account.isConnected) {
      throw new Error('Telegram account not connected or disconnected');
    }

    const botToken = account.accessToken; // already decrypted by repository
    const chatId = account.platformAccountId;

    // 2. Lấy strategy phù hợp dựa trên mediaUrl
    const strategy = telegramPublishStrategyFactory.getStrategy(postData.mediaUrl);
    
    logger.debug(`[Telegram Service] Publishing post using strategy: ${strategy.constructor.name}`);
    const result = await strategy.publish(chatId, botToken, postData);

    // Telegram's sendMessage/sendPhoto/etc always return message_id on a real
    // 200 response. If it's missing, something is wrong with the response we
    // don't understand — synthesizing a fake `tg-msg-${Date.now()}` id here
    // previously let the post get marked PUBLISHED even though it never
    // actually reached Telegram, breaking retry/delete/metric-sync
    // afterward (#93). Throw instead so the pipeline treats it as a failure.
    if (!result.message_id) {
      throw new Error('Telegram publish response missing message_id');
    }

    return { id: result.message_id.toString() };
  }

  /**
   * Lấy thông tin kênh (dùng cho Base interface)
   */
  async getChannelInfo(auth, startDate, endDate) {
    const token = typeof auth === 'string' ? auth : auth.accessToken;
    const chatId = auth.platformAccountId;
    return await telegramGateway.getChatInfo(token, chatId);
  }

  /**
   * Báo cáo phân tích metrics
   */
  async getAnalyticsReport(auth, startDate, endDate, currentFollowers = 0) {
    // Sinh báo cáo chi tiết cho Telegram
    return {
      summary: {
        followers: currentFollowers,
        views: currentFollowers * 4
      },
      balance: [
        { date: new Date().toISOString().split('T')[0], acquired: 5, lost: 0 }
      ],
      interactions: {
        likes: Math.round(currentFollowers * 0.1),
        comments: Math.round(currentFollowers * 0.02),
        shares: Math.round(currentFollowers * 0.01),
        clicks: Math.round(currentFollowers * 0.05)
      }
    };
  }

  /**
   * Đồng bộ metrics
   */
  async syncChannelMetrics(socialAccountId, startDate, endDate, force = false) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account) throw new Error('Social account not found');

    const botToken = account.accessToken;
    const chatId = account.platformAccountId;

    const chatInfo = await telegramGateway.getChatInfo(botToken, chatId);

    // Cập nhật member count trong DB
    await prisma.telegramAccount.update({
      where: { socialAccountId },
      data: { memberCount: chatInfo.memberCount }
    });

    // Tạo bản ghi analytics mới
    const analytics = {
      startDate,
      endDate,
      summary: { followers: chatInfo.memberCount, views: chatInfo.memberCount * 5 },
      balance: [
        { date: new Date().toISOString().split('T')[0], acquired: 0, lost: 0 }
      ],
      interactions: {
        likes: Math.round(chatInfo.memberCount * 0.1),
        comments: Math.round(chatInfo.memberCount * 0.05),
        shares: Math.round(chatInfo.memberCount * 0.02),
        clicks: Math.round(chatInfo.memberCount * 0.08)
      }
    };

    await socialAccountRepository.saveTelegramAnalytics(account.brandId, socialAccountId, analytics, startDate, endDate);

    return await socialAccountRepository.findById(socialAccountId);
  }

  // --- Các hàm Stub/Bù đắp để tuân thủ LSP (Liskov Substitution Principle) ---
  async getPublishedVideos(brandId, pageToken = null, limit = 10) {
    return { data: [], nextPageToken: null, prevPageToken: null };
  }

  async trackVideo(brandId, videoUrl) {
    return null;
  }

  async getVideoDetails(brandId, videoId) {
    return null;
  }

  async searchChannel(brandId, query) {
    return [];
  }

  async addCompetitor(brandId, channelId) {
    return null;
  }

  async fetchChannelComments(brandId) {
    return [];
  }

  async replyToComment(brandId, parentCommentId, text) {
    return null;
  }
}

module.exports = new TelegramService();
