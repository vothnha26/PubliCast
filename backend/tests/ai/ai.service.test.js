const aiService = require('../../src/services/workspace/ai/ai.service');
const prisma = require('../../src/config/prisma');
const subscriptionGate = require('../../src/services/subscription/subscription-gate.facade');
const postService = require('../../src/services/workspace/post.service');
const AiProviderFactory = require('../../src/services/workspace/ai/providers/provider.factory');

jest.mock('../../src/config/prisma', () => ({
  aIAssistant: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
}));

jest.mock('../../src/services/subscription/subscription-gate.facade', () => ({
  checkFeatureAccess: jest.fn()
}));

jest.mock('../../src/services/workspace/post.service', () => ({
  createPost: jest.fn()
}));

jest.mock('../../src/services/workspace/ai/providers/provider.factory', () => ({
  getProvider: jest.fn()
}));

describe('AIService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSettings = {
    id: 'ai-settings-123',
    brandId: 'brand-123',
    defaultTone: 'PROFESSIONAL',
    defaultLanguage: 'vi',
    creditsLimit: 10,
    creditsUsed: 5,
    usageCountThisMonth: 5
  };

  describe('getConfig', () => {
    it('should return supported tones, languages, formats, and default platforms', async () => {
      const config = await aiService.getConfig();
      expect(config).toHaveProperty('supportedTones');
      expect(config).toHaveProperty('supportedLanguages');
      expect(config).toHaveProperty('supportedFormats');
      expect(config).toHaveProperty('defaultPlatforms');
      expect(config.supportedTones.length).toBeGreaterThan(0);
      expect(config.supportedFormats.length).toBeGreaterThan(0);
    });
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      prisma.aIAssistant.findUnique.mockResolvedValue(mockSettings);

      const result = await aiService.getSettings('brand-123');

      expect(result).toEqual(mockSettings);
      expect(prisma.aIAssistant.findUnique).toHaveBeenCalledWith({
        where: { brandId: 'brand-123' }
      });
      expect(prisma.aIAssistant.create).not.toHaveBeenCalled();
    });

    it('should create and return default settings if not exists', async () => {
      prisma.aIAssistant.findUnique.mockResolvedValue(null);
      prisma.aIAssistant.create.mockResolvedValue(mockSettings);

      const result = await aiService.getSettings('brand-123');

      expect(result).toEqual(mockSettings);
      expect(prisma.aIAssistant.create).toHaveBeenCalledWith({
        data: {
          brandId: 'brand-123',
          defaultTone: 'PROFESSIONAL',
          defaultLanguage: 'vi',
          creditsLimit: 10,
          creditsUsed: 0,
          usageCountThisMonth: 0
        }
      });
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      prisma.aIAssistant.findUnique.mockResolvedValue(mockSettings);
      prisma.aIAssistant.update.mockResolvedValue({
        ...mockSettings,
        defaultTone: 'CASUAL'
      });

      const updateData = { defaultTone: 'CASUAL', defaultLanguage: 'en' };
      const result = await aiService.updateSettings('brand-123', updateData);

      expect(result.defaultTone).toBe('CASUAL');
      expect(prisma.aIAssistant.update).toHaveBeenCalledWith({
        where: { brandId: 'brand-123' },
        data: expect.objectContaining({
          defaultTone: 'CASUAL'
        })
      });
    });
  });

  describe('generateContent', () => {
    const mockProviderInstance = {
      generate: jest.fn()
    };

    beforeEach(() => {
      AiProviderFactory.getProvider.mockReturnValue(mockProviderInstance);
    });

    it('should throw 403 error if user lacks access to AI Content Engine', async () => {
      subscriptionGate.checkFeatureAccess.mockResolvedValue(false);

      await expect(
        aiService.generateContent('user-123', 'brand-123', { prompt: 'Test topic' })
      ).rejects.toThrow('Bạn không có quyền truy cập vào AI Content Engine');

      expect(mockProviderInstance.generate).not.toHaveBeenCalled();
    });

    it('should throw 403 error if monthly credit limit is reached', async () => {
      subscriptionGate.checkFeatureAccess.mockResolvedValue(true);
      prisma.aIAssistant.findUnique.mockResolvedValue({
        ...mockSettings,
        creditsUsed: 10,
        creditsLimit: 10
      });

      await expect(
        aiService.generateContent('user-123', 'brand-123', { prompt: 'Test topic' })
      ).rejects.toThrow('Hạn mức sử dụng AI hàng tháng của bạn đã hết');

      expect(mockProviderInstance.generate).not.toHaveBeenCalled();
    });

    it('should generate content, increment credit, and audit log on success', async () => {
      subscriptionGate.checkFeatureAccess.mockResolvedValue(true);
      prisma.aIAssistant.findUnique.mockResolvedValue(mockSettings);
      mockProviderInstance.generate.mockResolvedValue({
        caption: 'Generated text',
        suggestedHashtags: ['#cool'],
        platformSpecificAdjustments: {}
      });
      prisma.aIAssistant.update.mockResolvedValue({
        ...mockSettings,
        creditsUsed: 6
      });

      const result = await aiService.generateContent('user-123', 'brand-123', {
        prompt: 'Test topic',
        tone: 'INSPIRATIONAL'
      });

      expect(result.caption).toBe('Generated text');
      expect(result.creditsUsed).toBe(6);
      expect(mockProviderInstance.generate).toHaveBeenCalled();
      expect(prisma.aIAssistant.update).toHaveBeenCalledWith({
        where: { brandId: 'brand-123' },
        data: {
          creditsUsed: { increment: 1 },
          usageCountThisMonth: { increment: 1 }
        }
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('quickPost', () => {
    it('should delegate post creation to postService.createPost', async () => {
      const mockPost = { id: 'post-999', title: 'AI Post' };
      postService.createPost.mockResolvedValue(mockPost);

      const input = { caption: 'Cool text', targetPlatforms: ['FACEBOOK'] };
      const result = await aiService.quickPost('user-123', 'brand-123', input);

      expect(result).toEqual(mockPost);
      expect(postService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          caption: 'Cool text',
          status: 'DRAFT'
        }),
        'user-123',
        'brand-123'
      );
    });
  });
});
