const KeywordAutoReplyStrategy = require('../../src/services/social/inbox/strategies/auto-reply/keyword-reply.strategy');
const AIAutoReplyStrategy = require('../../src/services/social/inbox/strategies/auto-reply/ai-reply.strategy');
const autoReplyService = require('../../src/services/social/inbox/strategies/auto-reply/auto-reply.service');
const prisma = require('../../src/config/prisma');
const facebookComment = require('../../src/services/social/facebook/facebook-comment.service');
const AiProviderFactory = require('../../src/services/workspace/ai/providers/provider.factory');

// --- Mocking ---
jest.mock('../../src/config/prisma', () => ({
  autoReplySetting: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn()
  }
}));

jest.mock('../../src/services/social/facebook/facebook-comment.service', () => ({
  replyToComment: jest.fn()
}));

jest.mock('../../src/services/workspace/ai/providers/provider.factory', () => ({
  getProvider: jest.fn()
}));

describe('Meta Comment Auto-Reply Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('KeywordAutoReplyStrategy', () => {
    const strategy = new KeywordAutoReplyStrategy();
    const config = [
      { keywords: ['giá', 'bao nhiêu'], reply: 'Sản phẩm có giá 150k ạ!' },
      { keywords: ['inbox', 'tư vấn'], reply: 'Vui lòng kiểm tra inbox nhé!' }
    ];

    it('should reply with correct text when a keyword matches', async () => {
      const reply1 = await strategy.reply('Sản phẩm này giá bao nhiêu thế?', config);
      expect(reply1).toBe('Sản phẩm có giá 150k ạ!');

      const reply2 = await strategy.reply('inbox tư vấn giúp mình', config);
      expect(reply2).toBe('Vui lòng kiểm tra inbox nhé!');
    });

    it('should perform case-insensitive matching', async () => {
      const reply = await strategy.reply('GIÁ CẢ THẾ NÀO?', config);
      expect(reply).toBe('Sản phẩm có giá 150k ạ!');
    });

    it('should return null when no keywords match', async () => {
      const reply = await strategy.reply('Bài viết hay quá', config);
      expect(reply).toBeNull();
    });
  });

  describe('AIAutoReplyStrategy', () => {
    const strategy = new AIAutoReplyStrategy();
    const mockProvider = {
      generate: jest.fn()
    };

    beforeEach(() => {
      AiProviderFactory.getProvider.mockReturnValue(mockProvider);
    });

    it('should return generated reply from AI provider', async () => {
      mockProvider.generate.mockResolvedValue({ reply: 'Chào bạn, cảm ơn bạn đã quan tâm!' });

      const reply = await strategy.reply('Shop ơi', 'Hãy trả lời thân thiện');
      expect(reply).toBe('Chào bạn, cảm ơn bạn đã quan tâm!');
      expect(mockProvider.generate).toHaveBeenCalledWith(
        expect.stringContaining('Shop ơi'),
        expect.objectContaining({
          systemInstruction: expect.stringContaining('Hãy trả lời thân thiện')
        })
      );
    });

    it('should return null if AI generation fails or returns invalid response', async () => {
      mockProvider.generate.mockRejectedValue(new Error('API Error'));

      const reply = await strategy.reply('Shop ơi', 'Hãy trả lời thân thiện');
      expect(reply).toBeNull();
    });
  });

  describe('AutoReplyService', () => {
    const socialAccountId = 'page_123';
    const brandId = 'brand_456';
    const commentPlatformId = 'comment_789';

    it('should not reply if auto-reply settings are disabled', async () => {
      prisma.autoReplySetting.findUnique.mockResolvedValue({
        socialAccountId,
        isActive: false,
        mode: 'KEYWORD',
        keywordsConfig: []
      });

      const result = await autoReplyService.executeAutoReply(
        socialAccountId,
        'giá bao nhiêu',
        commentPlatformId,
        brandId
      );

      expect(result).toBeNull();
      expect(facebookComment.replyToComment).not.toHaveBeenCalled();
    });

    it('should execute KeywordStrategy and call facebookComment.replyToComment when keyword matches', async () => {
      prisma.autoReplySetting.findUnique.mockResolvedValue({
        socialAccountId,
        isActive: true,
        mode: 'KEYWORD',
        keywordsConfig: [{ keywords: ['giá'], reply: 'Sản phẩm 150k' }]
      });

      facebookComment.replyToComment.mockResolvedValue({ id: 'reply_abc', content: 'Sản phẩm 150k' });

      const result = await autoReplyService.executeAutoReply(
        socialAccountId,
        'giá bao nhiêu',
        commentPlatformId,
        brandId
      );

      expect(result).toEqual({ id: 'reply_abc', content: 'Sản phẩm 150k' });
      expect(facebookComment.replyToComment).toHaveBeenCalledWith(
        brandId,
        commentPlatformId,
        'Sản phẩm 150k'
      );
    });
  });
});
