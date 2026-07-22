const BaseSocialService = require('../base-social.service');
const discordGateway = require('./discord.gateway');
const discordPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const prisma = require('../../../config/prisma');
const { PLATFORMS } = require('../../../utils/constants');

class DiscordService extends BaseSocialService {
  /**
   * Kết nối Discord channel qua Webhook URL
   */
  async connectChannel(brandId, webhookUrl) {
    if (!brandId || !webhookUrl) {
      throw new Error('brandId and webhookUrl are required');
    }

    console.log(`[Discord Service] Connecting Discord channel via Webhook...`);
    const webhookInfo = await discordGateway.validateWebhook(webhookUrl);

    // Mock analytics initial data
    const analytics = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      summary: { followers: 0, views: 0 },
      balance: [
        { date: new Date().toISOString().split('T')[0], acquired: 0, lost: 0 }
      ],
      interactions: {
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0
      }
    };

    let guildName = 'Discord Server';
    if (webhookInfo.guild_id) {
      try {
        const guildInfo = await discordGateway.getGuildInfo(webhookInfo.guild_id);
        guildName = guildInfo.name || 'Discord Server';
      } catch (err) {
        console.warn(`[Discord Service] Failed to get guild name for ${webhookInfo.guild_id}:`, err.message);
        guildName = `Server ID: ${webhookInfo.guild_id}`;
      }
    }

    const channelData = {
      pageId: webhookInfo.id,
      username: webhookInfo.name,
      displayName: webhookInfo.name,
      profilePictureUrl: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&auto=format&fit=crop&q=60',
      guildName,
      channelName: webhookInfo.name,
      analytics
    };

    const tokens = {
      access_token: webhookUrl,
      refresh_token: '',
      expiry_date: null,
      scope: 'webhook'
    };

    return await socialAccountRepository.upsertDiscordAccount(brandId, channelData, tokens);
  }

  /**
   * Kết nối Discord channel tự động qua Guild ID và Channel ID (Hybrid Mode)
   */
  async connectGuildChannel(brandId, guildId, channelId) {
    if (!brandId || !guildId || !channelId) {
      throw new Error('brandId, guildId and channelId are required');
    }

    console.log(`[Discord Service] Fetching channel info for channel ${channelId}...`);
    let actualChannelName = 'general';
    try {
      const channels = await discordGateway.getGuildChannels(guildId);
      const targetChannel = channels.find(c => c.id === channelId);
      if (targetChannel) {
        actualChannelName = targetChannel.name;
      }
    } catch (err) {
      console.warn(`[Discord Service] Failed to fetch channel details, defaulting to 'general'`, err.message);
    }

    const webhookName = `PubliCast - ${actualChannelName}`;
    console.log(`[Discord Service] Creating Webhook '${webhookName}' for Discord Channel ${channelId}...`);
    const guildInfo = await discordGateway.getGuildInfo(guildId);
    const webhook = await discordGateway.createWebhook(channelId, webhookName);

    const analytics = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      summary: { followers: 0, views: 0 },
      balance: [
        { date: new Date().toISOString().split('T')[0], acquired: 0, lost: 0 }
      ],
      interactions: {
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0
      }
    };

    // Clear any existing pending social accounts for this guild first to avoid duplicates
    await prisma.socialAccount.deleteMany({
      where: {
        brandId,
        platform: PLATFORMS.DISCORD,
        platformAccountId: guildId
      }
    });

    const channelData = {
      pageId: webhook.id,
      username: webhook.name,
      displayName: actualChannelName,
      profilePictureUrl: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&auto=format&fit=crop&q=60',
      guildId,
      guildName: guildInfo.name || 'Discord Server',
      channelName: actualChannelName,
      analytics
    };

    const tokens = {
      access_token: webhook.url,
      refresh_token: '',
      expiry_date: null,
      scope: 'webhook'
    };

    return await socialAccountRepository.upsertDiscordAccount(brandId, channelData, tokens);
  }

  /**
   * Đăng bài viết lên Discord
   */
  async publishPost(brandId, postData) {
    const selectedChannelIds = postData.options?.selectedDiscordChannels;

    const accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.DISCORD);
    let connectedAccounts = accounts.filter(acc => acc.isConnected);

    // Nếu có danh sách kênh được chọn, thực hiện lọc
    if (selectedChannelIds && Array.isArray(selectedChannelIds)) {
      connectedAccounts = connectedAccounts.filter(acc => selectedChannelIds.includes(acc.id));
    }

    if (connectedAccounts.length === 0) {
      throw new Error('No connected Discord channels found');
    }

    const results = [];
    for (const account of connectedAccounts) {
      const webhookUrl = account.accessToken; // already decrypted by repository
      const strategy = discordPublishStrategyFactory.getStrategy(postData.mediaUrl);
      
      console.log(`[Discord Service] Publishing post to channel ${account.displayName} using strategy: ${strategy.constructor.name}`);
      try {
        const result = await strategy.publish(webhookUrl, postData);
        results.push({
          accountId: account.id,
          id: result.id || `discord-msg-${Date.now()}`
        });
      } catch (err) {
        console.error(`Failed to publish to Discord channel ${account.displayName}:`, err.message);
      }
    }

    if (results.length === 0) {
      throw new Error('Failed to publish to all connected Discord channels');
    }

    return {
      id: results[0].id,
      platformVideoId: results[0].id,
      publishedChannels: results
    };
  }

  /**
   * Lấy thông tin kênh (dùng cho Base interface)
   */
  async getChannelInfo(auth, startDate, endDate) {
    const webhookUrl = typeof auth === 'string' ? auth : auth.accessToken;
    return await discordGateway.validateWebhook(webhookUrl);
  }

  /**
   * Báo cáo phân tích metrics
   */
  async getAnalyticsReport(auth, startDate, endDate, currentFollowers = 0) {
    return {
      summary: {
        followers: currentFollowers,
        views: currentFollowers * 5
      },
      balance: [
        { date: new Date().toISOString().split('T')[0], acquired: 2, lost: 0 }
      ],
      interactions: {
        likes: Math.round(currentFollowers * 0.15),
        comments: Math.round(currentFollowers * 0.05),
        shares: Math.round(currentFollowers * 0.02),
        clicks: Math.round(currentFollowers * 0.08)
      }
    };
  }

  /**
   * Đồng bộ metrics
   */
  async syncChannelMetrics(socialAccountId, startDate, endDate, force = false) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account) throw new Error('Social account not found');

    const webhookUrl = account.accessToken;
    const webhookInfo = await discordGateway.validateWebhook(webhookUrl);

    const existing = await prisma.discordAccount.findUnique({
      where: { socialAccountId }
    });

    const displayChannelName = webhookInfo.name.startsWith('PubliCast - ') 
      ? webhookInfo.name.substring(12) 
      : webhookInfo.name;

    // Webhooks don't have members info, so we update metadata and mock analytics
    await prisma.discordAccount.update({
      where: { socialAccountId },
      data: {
        channelName: displayChannelName,
        guildName: (existing && existing.guildName !== 'Discord Server') 
          ? existing.guildName 
          : (webhookInfo.guild_id ? `Server ID: ${webhookInfo.guild_id}` : 'Discord Server')
      }
    });

    const analytics = {
      startDate,
      endDate,
      summary: { followers: 0, views: 0 },
      balance: [
        { date: new Date().toISOString().split('T')[0], acquired: 0, lost: 0 }
      ],
      interactions: {
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0
      }
    };

    await socialAccountRepository.saveDiscordAnalytics(account.brandId, socialAccountId, analytics, startDate, endDate);

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

  async updatePublishedPost(brandId, platformPostId, postData) {
    const accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.DISCORD);
    const connectedAccounts = accounts.filter(acc => acc.isConnected);
    if (connectedAccounts.length === 0) throw new Error('No connected Discord channels found');

    const { caption } = postData;
    let successCount = 0;
    for (const account of connectedAccounts) {
      try {
        await discordGateway.updateWebhookMessage(account.accessToken, platformPostId, caption || '');
        successCount++;
      } catch (err) {
        console.error(`Failed to update post in Discord channel ${account.displayName}:`, err.message);
      }
    }
    // Previously always returned success:true even when every account
    // failed — callers had no way to tell an update actually happened (#66).
    if (successCount === 0) {
      throw new Error('Failed to update post in any connected Discord channel');
    }
    return { success: true, updatedCount: successCount, totalCount: connectedAccounts.length };
  }

  async deletePost(brandId, platformPostId) {
    const accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.DISCORD);
    const connectedAccounts = accounts.filter(acc => acc.isConnected);
    if (connectedAccounts.length === 0) throw new Error('No connected Discord channels found');

    let successCount = 0;
    for (const account of connectedAccounts) {
      try {
        await discordGateway.deleteWebhookMessage(account.accessToken, platformPostId);
        successCount++;
      } catch (err) {
        console.error(`Failed to delete post from Discord channel ${account.displayName}:`, err.message);
      }
    }
    // Previously always returned success:true even when every account
    // failed — callers had no way to tell a delete actually happened (#66).
    if (successCount === 0) {
      throw new Error('Failed to delete post from any connected Discord channel');
    }
    return { success: true, deletedCount: successCount, totalCount: connectedAccounts.length };
  }
}

module.exports = new DiscordService();
