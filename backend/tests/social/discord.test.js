const discordGateway = require('../../src/services/social/discord/discord.gateway');
const discordService = require('../../src/services/social/discord/discord.service');
const discordPublishStrategyFactory = require('../../src/services/social/discord/publish-strategies/publish-strategy.factory');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

jest.mock('../../src/services/social/discord/discord.gateway');
jest.mock('../../src/repositories/social/social-account.repository');

describe('Discord Integration Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Discord Gateway', () => {
    it('should validate webhook successfully', async () => {
      const mockWebhookInfo = { name: 'Test Webhook', channel_id: '123456', guild_id: '789012' };

      discordGateway.validateWebhook.mockResolvedValue(mockWebhookInfo);

      const info = await discordGateway.validateWebhook('https://discord.com/api/webhooks/mock-url');

      expect(discordGateway.validateWebhook).toHaveBeenCalledWith('https://discord.com/api/webhooks/mock-url');
      expect(info.name).toBe('Test Webhook');
      expect(info.channel_id).toBe('123456');
    });

    it('should throw an error when webhook URL is invalid', async () => {
      discordGateway.validateWebhook.mockRejectedValue(new Error('Invalid Webhook'));
      await expect(discordGateway.validateWebhook('https://discord.com/api/webhooks/invalid-url')).rejects.toThrow('Invalid Webhook');
    });

    it('should fetch guild info successfully', async () => {
      const mockGuildInfo = { id: '789012', name: 'Test Server' };
      discordGateway.getGuildInfo.mockResolvedValue(mockGuildInfo);

      const info = await discordGateway.getGuildInfo('789012');
      expect(info.name).toBe('Test Server');
    });

    it('should fetch guild channels successfully', async () => {
      const mockChannels = [
        { id: '123', name: 'general', type: 0 }
      ];
      discordGateway.getGuildChannels.mockResolvedValue(mockChannels);

      const channels = await discordGateway.getGuildChannels('789012');
      expect(channels[0].name).toBe('general');
    });

    it('should create webhook successfully', async () => {
      const mockWebhook = { id: 'wh_123', name: 'PubliCast Webhook', url: 'https://discord.com/api/webhooks/wh_123' };
      discordGateway.createWebhook.mockResolvedValue(mockWebhook);

      const webhook = await discordGateway.createWebhook('123', 'PubliCast Webhook');
      expect(webhook.id).toBe('wh_123');
    });
  });

  describe('Discord Publish Strategies', () => {
    it('should select DiscordTextPublishStrategy for text-only content', () => {
      const strategy = discordPublishStrategyFactory.getStrategy(null);
      expect(strategy.constructor.name).toBe('DiscordTextPublishStrategy');
    });

    it('should select DiscordImagePublishStrategy for image content', () => {
      const strategy = discordPublishStrategyFactory.getStrategy('http://example.com/image.png');
      expect(strategy.constructor.name).toBe('DiscordImagePublishStrategy');
    });

    it('should select DiscordVideoPublishStrategy for video content', () => {
      const strategy = discordPublishStrategyFactory.getStrategy('http://example.com/video.mp4');
      expect(strategy.constructor.name).toBe('DiscordVideoPublishStrategy');
    });
  });

  describe('Discord Service Facade', () => {
    it('should connect a Discord webhook and save to repository', async () => {
      const mockWebhookInfo = { name: 'Test Webhook', channel_id: '123456', guild_id: '789012' };

      discordGateway.validateWebhook.mockResolvedValue(mockWebhookInfo);

      socialAccountRepository.upsertDiscordAccount.mockResolvedValue({
        id: 'sa_discord_1',
        platform: 'DISCORD',
        displayName: 'Test Webhook',
        username: 'Test Webhook'
      });

      const account = await discordService.connectChannel('brand_1', 'https://discord.com/api/webhooks/mock-url');

      expect(discordGateway.validateWebhook).toHaveBeenCalledWith('https://discord.com/api/webhooks/mock-url');
      expect(socialAccountRepository.upsertDiscordAccount).toHaveBeenCalled();
      expect(account.displayName).toBe('Test Webhook');
    });

    it('should connect guild channel using Bot Token / Webhook creation', async () => {
      const mockGuildInfo = { id: '789012', name: 'Test Server' };
      const mockChannels = [
        { id: '123', name: 'general', type: 0 }
      ];
      const mockWebhook = { id: 'wh_123', name: 'PubliCast - general', url: 'https://discord.com/api/webhooks/wh_123' };

      discordGateway.getGuildInfo.mockResolvedValue(mockGuildInfo);
      discordGateway.getGuildChannels.mockResolvedValue(mockChannels);
      discordGateway.createWebhook.mockResolvedValue(mockWebhook);
      socialAccountRepository.upsertDiscordAccount.mockResolvedValue({
        id: 'sa_discord_1',
        platform: 'DISCORD',
        displayName: 'general'
      });

      const account = await discordService.connectGuildChannel('brand_1', '789012', '123');

      expect(discordGateway.getGuildInfo).toHaveBeenCalledWith('789012');
      expect(discordGateway.getGuildChannels).toHaveBeenCalledWith('789012');
      expect(discordGateway.createWebhook).toHaveBeenCalledWith('123', 'PubliCast - general');
      expect(account.displayName).toBe('general');
    });

    it('should publish a post successfully through service facade to all connected channels', async () => {
      const mockAccounts = [
        {
          id: 'sa_discord_1',
          isConnected: true,
          accessToken: 'https://discord.com/api/webhooks/mock-url-1',
          platformAccountId: '123456'
        },
        {
          id: 'sa_discord_2',
          isConnected: true,
          accessToken: 'https://discord.com/api/webhooks/mock-url-2',
          platformAccountId: '789012'
        }
      ];

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockAccounts);
      discordGateway.sendMessage.mockResolvedValue({ id: '999111' });

      const result = await discordService.publishPost('brand_1', {
        caption: 'Hello Discord!',
        mediaUrl: null
      });

      expect(result.id).toBe('999111');
      expect(discordGateway.sendMessage).toHaveBeenCalledTimes(2);
      expect(discordGateway.sendMessage).toHaveBeenNthCalledWith(
        1,
        'https://discord.com/api/webhooks/mock-url-1',
        'Hello Discord!'
      );
      expect(discordGateway.sendMessage).toHaveBeenNthCalledWith(
        2,
        'https://discord.com/api/webhooks/mock-url-2',
        'Hello Discord!'
      );
    });

    it('should publish only to selectively chosen channels', async () => {
      const mockAccounts = [
        {
          id: 'sa_discord_1',
          isConnected: true,
          accessToken: 'https://discord.com/api/webhooks/mock-url-1',
          platformAccountId: '123456'
        },
        {
          id: 'sa_discord_2',
          isConnected: true,
          accessToken: 'https://discord.com/api/webhooks/mock-url-2',
          platformAccountId: '789012'
        }
      ];

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockAccounts);
      discordGateway.sendMessage.mockResolvedValue({ id: '999111' });

      const result = await discordService.publishPost('brand_1', {
        caption: 'Hello Selective Discord!',
        mediaUrl: null,
        options: {
          selectedDiscordChannels: ['sa_discord_2']
        }
      });

      expect(result.id).toBe('999111');
      expect(discordGateway.sendMessage).toHaveBeenCalledTimes(1);
      expect(discordGateway.sendMessage).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/mock-url-2',
        'Hello Selective Discord!'
      );
    });

    it('should throw error when all channels fail to publish', async () => {
      const mockAccounts = [
        {
          id: 'sa_discord_1',
          isConnected: true,
          accessToken: 'https://discord.com/api/webhooks/mock-url-1',
          platformAccountId: '123456'
        }
      ];

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockAccounts);
      discordGateway.sendMessage.mockRejectedValue(new Error('Discord API Error'));

      await expect(
        discordService.publishPost('brand_1', {
          caption: 'Hello Error!',
          mediaUrl: null
        })
      ).rejects.toThrow('Failed to publish to all connected Discord channels');
    });

    it('should partially succeed when one channel succeeds and another fails', async () => {
      const mockAccounts = [
        {
          id: 'sa_discord_1',
          isConnected: true,
          accessToken: 'https://discord.com/api/webhooks/mock-url-1',
          platformAccountId: '123456'
        },
        {
          id: 'sa_discord_2',
          isConnected: true,
          accessToken: 'https://discord.com/api/webhooks/mock-url-2',
          platformAccountId: '789012'
        }
      ];

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockAccounts);
      discordGateway.sendMessage
        .mockResolvedValueOnce({ id: 'success_id' })
        .mockRejectedValueOnce(new Error('Second channel failed'));

      const result = await discordService.publishPost('brand_1', {
        caption: 'Hello Partial Success!',
        mediaUrl: null
      });

      expect(result.id).toBe('success_id');
      expect(discordGateway.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  // Regression tests for #66: deletePost/updatePublishedPost previously
  // always returned { success: true } even when every connected account
  // failed — callers had no way to tell the operation actually happened.
  describe('deletePost', () => {
    it('throws when every connected channel fails to delete', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'sa_discord_1', isConnected: true, accessToken: 'token-1', displayName: 'Channel 1' }
      ]);
      discordGateway.deleteWebhookMessage.mockRejectedValue(new Error('Message not found'));

      await expect(discordService.deletePost('brand_1', 'msg_123'))
        .rejects.toThrow('Failed to delete post from any connected Discord channel');
    });

    it('succeeds and reports counts when at least one channel deletes successfully', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'sa_discord_1', isConnected: true, accessToken: 'token-1', displayName: 'Channel 1' },
        { id: 'sa_discord_2', isConnected: true, accessToken: 'token-2', displayName: 'Channel 2' }
      ]);
      discordGateway.deleteWebhookMessage
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Channel 2 failed'));

      const result = await discordService.deletePost('brand_1', 'msg_123');

      expect(result).toEqual({ success: true, deletedCount: 1, totalCount: 2 });
    });
  });

  describe('updatePublishedPost', () => {
    it('throws when every connected channel fails to update', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'sa_discord_1', isConnected: true, accessToken: 'token-1', displayName: 'Channel 1' }
      ]);
      discordGateway.updateWebhookMessage.mockRejectedValue(new Error('Message not found'));

      await expect(discordService.updatePublishedPost('brand_1', 'msg_123', { caption: 'Updated' }))
        .rejects.toThrow('Failed to update post in any connected Discord channel');
    });

    it('succeeds and reports counts when at least one channel updates successfully', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'sa_discord_1', isConnected: true, accessToken: 'token-1', displayName: 'Channel 1' }
      ]);
      discordGateway.updateWebhookMessage.mockResolvedValue(undefined);

      const result = await discordService.updatePublishedPost('brand_1', 'msg_123', { caption: 'Updated' });

      expect(result).toEqual({ success: true, updatedCount: 1, totalCount: 1 });
    });
  });
});
