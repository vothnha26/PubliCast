const telegramGateway = require('../../src/services/social/telegram/telegram.gateway');
const telegramService = require('../../src/services/social/telegram/telegram.service');
const publishStrategyFactory = require('../../src/services/social/telegram/publish-strategies/publish-strategy.factory');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

jest.mock('../../src/services/social/telegram/telegram.gateway');
jest.mock('../../src/repositories/social/social-account.repository');

describe('Telegram Integration Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Telegram Gateway', () => {
    it('should retrieve chat info successfully', async () => {
      const mockChatInfo = { id: '-1001234', title: 'Test Channel', type: 'channel', memberCount: 1500 };

      telegramGateway.getChatInfo.mockResolvedValue(mockChatInfo);

      const chat = await telegramGateway.getChatInfo('mock-token', '-1001234');

      expect(telegramGateway.getChatInfo).toHaveBeenCalledWith('mock-token', '-1001234');
      expect(chat.title).toBe('Test Channel');
      expect(chat.memberCount).toBe(1500);
    });

    it('should throw an error when bot token is invalid', async () => {
      telegramGateway.getChatInfo.mockRejectedValue(new Error('Unauthorized'));
      await expect(telegramGateway.getChatInfo('invalid-token', '-1001234')).rejects.toThrow('Unauthorized');
    });
  });

  describe('Telegram Publish Strategies', () => {
    it('should select TextPublishStrategy for text-only content', () => {
      const strategy = publishStrategyFactory.getStrategy(null);
      expect(strategy.constructor.name).toBe('TextPublishStrategy');
    });

    it('should select ImagePublishStrategy for image content', () => {
      const strategy = publishStrategyFactory.getStrategy('http://example.com/image.png');
      expect(strategy.constructor.name).toBe('ImagePublishStrategy');
    });

    it('should select VideoPublishStrategy for video content', () => {
      const strategy = publishStrategyFactory.getStrategy('http://example.com/video.mp4');
      expect(strategy.constructor.name).toBe('VideoPublishStrategy');
    });
  });

  describe('Telegram Service Facade', () => {
    it('should connect a telegram channel and save to repository', async () => {
      const mockChatInfo = { id: '-1001234', title: 'Test Channel', type: 'channel', memberCount: 1500 };

      telegramGateway.getChatInfo.mockResolvedValue(mockChatInfo);

      socialAccountRepository.upsertTelegramAccount.mockResolvedValue({
        id: 'sa_tele_1',
        platform: 'TELEGRAM',
        displayName: 'Test Channel',
        username: 'test_bot'
      });

      const account = await telegramService.connectChannel('brand_1', 'mock-token', '-1001234');

      expect(telegramGateway.getChatInfo).toHaveBeenCalledWith('mock-token', '-1001234');
      expect(socialAccountRepository.upsertTelegramAccount).toHaveBeenCalled();
      expect(account.displayName).toBe('Test Channel');
    });

    it('should publish a post successfully through service facade', async () => {
      const mockAccount = {
        id: 'sa_tele_1',
        isConnected: true,
        accessToken: 'mock-token',
        platformAccountId: '-1001234'
      };

      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);
      telegramGateway.sendMessage.mockResolvedValue({ message_id: 999 });

      const result = await telegramService.publishPost('brand_1', {
        caption: 'Hello Telegram!',
        mediaUrl: null
      });

      expect(result.id).toBe('999');
      expect(telegramGateway.sendMessage).toHaveBeenCalledWith(
        'mock-token',
        '-1001234',
        'Hello Telegram!',
        expect.any(Object)
      );
    });

    // Regression test for #93: a response missing message_id previously
    // fell back to a synthesized `tg-msg-${Date.now()}` id, marking the
    // post PUBLISHED even though it never actually reached Telegram.
    it('throws instead of fabricating an id when message_id is missing (#93)', async () => {
      const mockAccount = {
        id: 'sa_tele_1',
        isConnected: true,
        accessToken: 'mock-token',
        platformAccountId: '-1001234'
      };

      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);
      telegramGateway.sendMessage.mockResolvedValue({}); // no message_id

      await expect(telegramService.publishPost('brand_1', {
        caption: 'Hello Telegram!',
        mediaUrl: null
      })).rejects.toThrow('Telegram publish response missing message_id');
    });
  });
});
