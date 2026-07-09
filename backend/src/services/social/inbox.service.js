const inboxRepository = require('../../repositories/social/inbox.repository');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, SOCIAL_TECHNICAL } = require('../../utils/constants');
const inboxFormatter = require('./inbox/inbox-formatter');
const socialPlatformFactory = require('./social-platform.factory');

const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const InboxSearchFilter = require('./inbox/filters/search.filter');
const InboxPlatformFilter = require('./inbox/filters/platform.filter');
const InboxTabFilter = require('./inbox/filters/tab.filter');
const InboxStatusFilter = require('./inbox/filters/status.filter');
const InboxTypeFilter = require('./inbox/filters/type.filter');
const InboxSocialAccountFilter = require('./inbox/filters/social-account.filter');

const YoutubeCommentSyncStrategy = require('./inbox/strategies/youtube-comment.strategy');
const FacebookCommentSyncStrategy = require('./inbox/strategies/facebook-comment.strategy');
const FacebookDMSyncStrategy = require('./inbox/strategies/facebook-dm.strategy');
const InstagramDMSyncStrategy = require('./inbox/strategies/instagram-dm.strategy');
const DiscordChannelMessageStrategy = require('./inbox/strategies/discord-channel.strategy');
const DiscordDirectMessageStrategy = require('./inbox/strategies/discord-dm.strategy');
const autoReplyService = require('./inbox/strategies/auto-reply/auto-reply.service');

class InboxService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new InboxSearchFilter(),
      new InboxPlatformFilter(),
      new InboxTabFilter(),
      new InboxStatusFilter(),
      new InboxTypeFilter(),
      new InboxSocialAccountFilter()
    ]);

    this.strategies = [
      new YoutubeCommentSyncStrategy(),
      new FacebookCommentSyncStrategy(),
      new FacebookDMSyncStrategy(),
      new InstagramDMSyncStrategy(),
      new DiscordChannelMessageStrategy(),
      new DiscordDirectMessageStrategy()
    ];
  }

  /**
   * Get filtered inbox items for a brand
   */
  async getInboxItems(queryParams, brandId) {
    const { page = 1, limit = 20 } = queryParams;
    const { skip, take } = this._getPagination(page, limit);

    const initialWhere = { inbox: { brandId }, parentItemId: null };
    const where = this.queryPipeline.apply(initialWhere, queryParams);

    const { items, total } = await inboxRepository.findManyAndCount(where, { skip, take });

    return {
      data: items.map(item => inboxFormatter.formatInboxListItem(item)),
      meta: {
        total,
        page: Math.max(1, parseInt(page) || 1),
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  async getConversationThread(itemId) {
    const item = await inboxRepository.findById(itemId);
    if (!item) throw { status: 404, message: 'Item not found' };

    const myAccountId = await this._getMyPlatformAccountId(item);
    const videoContext = await this._getVideoContext(item);

    const thread = [
      inboxFormatter.formatThreadMessage(item, myAccountId),
      ...(item.replies || []).map(r => inboxFormatter.formatThreadMessage(r, myAccountId))
    ];

    return { item, thread, videoContext };
  }

  async syncPlatformComments(brandId, platform) {
    try {
      const inbox = await inboxRepository.findOrCreateInbox(brandId);
      const activeStrategies = this.strategies.filter(s => s.supports(platform));
      
      if (activeStrategies.length === 0) {
        console.warn(`No sync strategies found for platform: ${platform}`);
        return [];
      }

      let allSyncedItems = [];
      for (const strategy of activeStrategies) {
        try {
          const items = await strategy.sync(brandId, inbox);
          if (items && items.length > 0) {
            allSyncedItems = allSyncedItems.concat(items);
          }
        } catch (err) {
          console.error(`Strategy ${strategy.constructor.name} failed during sync:`, err.message);
        }
      }

      await inboxRepository.updateInboxLastSync(inbox.id);
      return allSyncedItems;
    } catch (e) {
      console.error(`Failed to sync platform comments/messages for ${platform}:`, e.message);
      return [];
    }
  }

  async _seedMockInboxItems(brandId, platform) {
    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const platformUpper = platform.toUpperCase();
    
    const mockUsers = [
      { name: "Nguyễn Văn Nam", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" },
      { name: "Trần Thị Mai", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
      { name: "Lê Minh Tuấn", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" },
      { name: "Phạm Hồng Nhung", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop" }
    ];

    const mockMessages = {
      COMMENT: [
        "Bài viết này hay quá, mình rất thích cách trình bày của bên bạn!",
        "Cho mình hỏi video này quay bằng thiết bị gì mà đẹp thế ạ?",
        "Mong bên bạn ra thêm nhiều nội dung chất lượng như thế này nữa nhé.",
        "Thông tin rất hữu ích, cảm ơn PubliCast nhiều nhé!"
      ],
      DIRECT_MESSAGE: [
        "Chào bạn, mình muốn hỏi về chi phí hợp tác truyền thông bên bạn.",
        "Dịch vụ bên mình có hỗ trợ xuất hóa đơn VAT không ạ?",
        "Mình đã gửi email liên hệ hợp tác, bạn check giúp mình nhé.",
        "Tư vấn giúp mình gói dịch vụ Marketing cho doanh nghiệp nhỏ với ạ."
      ]
    };

    const seededItems = [];

    // Create 3 comments and 2 DMs
    for (let i = 0; i < 5; i++) {
      const type = i < 3 ? INBOX_TYPES.COMMENT : INBOX_TYPES.DIRECT_MESSAGE;
      // Skip DMs for YouTube (YouTube doesn't have DMs)
      if (platformUpper === 'YOUTUBE' && type === INBOX_TYPES.DIRECT_MESSAGE) {
        continue;
      }
      
      const user = mockUsers[i % mockUsers.length];
      const content = mockMessages[type][i % mockMessages[type].length];
      const platformItemId = `mock_${platform.toLowerCase()}_${type.toLowerCase()}_${Date.now()}_${i}`;

      const item = await inboxRepository.createInboxItem({
        inboxId: inbox.id,
        platform: platformUpper,
        type: type,
        platformItemId,
        authorId: `author_${i}`,
        authorName: user.name,
        authorAvatarUrl: user.avatar,
        content,
        platformCreatedAt: new Date(Date.now() - i * 3600000),
        syncedAt: new Date(),
        status: INBOX_STATUS.UNREAD
      });

      // Add a reply to first item to make thread look rich
      if (i === 0) {
        await inboxRepository.createInboxItem({
          inboxId: inbox.id,
          platform: platformUpper,
          type: type,
          platformItemId: `${platformItemId}_reply`,
          parentItemId: item.id,
          authorId: `author_brand`,
          authorName: "PubliCast Agent",
          authorAvatarUrl: "",
          content: "Cảm ơn bạn rất nhiều! Chúng tôi sẽ liên hệ lại ngay nhé.",
          platformCreatedAt: new Date(Date.now() - i * 3600000 + 600000),
          syncedAt: new Date(),
          status: INBOX_STATUS.READ
        });
      }

      seededItems.push(item);
    }

    await inboxRepository.updateInboxLastSync(inbox.id);
    return seededItems;
  }

  async replyToItem(brandId, itemId, text) {
    const item = await inboxRepository.findById(itemId);
    if (!item) throw new Error('Item not found');

    const strategy = this.strategies.find(s => s.supportsReply(item));
    if (!strategy) {
      throw new Error(`No reply strategy found for platform ${item.platform} and type ${item.type}`);
    }

    const reply = await strategy.reply(brandId, item.platformItemId, text);
    
    // Update parent conversation to reflect the reply (update snippet text, sorting time and mark as READ)
    await inboxRepository.updateInboxItem(itemId, {
      content: text,
      platformCreatedAt: new Date(),
      status: INBOX_STATUS.READ
    });

    return reply;
  }

  async updateReply(brandId, replyId, text) {
    const reply = await inboxRepository.findById(replyId);
    if (!reply) throw new Error('Reply not found');

    const strategy = this.strategies.find(s => s.supportsReply(reply));
    if (!strategy) {
      throw new Error(`No strategy found to update reply for platform ${reply.platform}`);
    }

    await strategy.updateReply(brandId, reply.platformItemId, text);
    return await inboxRepository.updateInboxItem(replyId, { content: text });
  }

  async deleteReply(brandId, replyId) {
    const reply = await inboxRepository.findById(replyId);
    if (!reply) throw new Error('Reply not found');

    const strategy = this.strategies.find(s => s.supportsReply(reply));
    if (!strategy) {
      throw new Error(`No strategy found to delete reply for platform ${reply.platform}`);
    }

    await strategy.deleteReply(brandId, reply.platformItemId);
    return await inboxRepository.deleteInboxItem(replyId);
  }

  async updateItemStatus(itemId, status) {
    const item = await inboxRepository.findById(itemId);
    if (!item) throw new Error('Item not found');
    return await inboxRepository.updateStatus(itemId, status.toUpperCase());
  }

  async updateItemMetadata(itemId, { tags, internalNotes }) {
    const item = await inboxRepository.findById(itemId);
    if (!item) throw new Error('Item not found');

    const updateData = {};
    if (tags !== undefined) updateData.tags = tags;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    return await inboxRepository.updateInboxItem(itemId, updateData);
  }

  // ============= Private Helper Methods =============

  _getPagination(page, limit) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    return { skip: (safePage - 1) * safeLimit, take: safeLimit };
  }

  async _getMyPlatformAccountId(item) {
    if (item.socialAccountId) {
      const sa = await socialAccountRepository.findById(item.socialAccountId);
      return sa?.platformAccountId;
    }
    const sa = await socialAccountRepository.findByBrandAndPlatformFirst(item.inbox.brandId, item.platform);
    return sa?.platformAccountId;
  }

  async _getVideoContext(item) {
    if (!item.relatedPostId) return null;
    try {
      const service = socialPlatformFactory.getService(item.platform);
      return await service.getVideoDetails(item.inbox.brandId, item.relatedPostId);
    } catch (e) {
      return null;
    }
  }

  async getAutoReplySettings(socialAccountId) {
    return await autoReplyService.getSettings(socialAccountId);
  }

  async saveAutoReplySettings(socialAccountId, data) {
    return await autoReplyService.saveSettings(socialAccountId, data);
  }
}

module.exports = new InboxService();
