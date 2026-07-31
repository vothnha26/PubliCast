const request = require('supertest');

let mockUser = { id: 'user-123', email: 'user@publicast.com' };

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = mockUser;
    next();
  }
}));

// Mock Permission Middleware
jest.mock('../../src/middlewares/permission.middleware', () => {
  const middleware = () => (req, res, next) => next();
  middleware.requireBrandMember = (req, res, next) => next();
  return middleware;
});

// Mock Brand Repository for Subscription checks
jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findBrandWithSubscription: jest.fn().mockResolvedValue({
    id: 'brand-123',
    subscription: {
      status: 'ACTIVE',
      plan: {
        name: 'PRO',
        products: [
          { id: 'ai_content_engine' }
        ]
      }
    }
  })
}));

// Mock Prisma configuration
jest.mock('../../src/config/prisma', () => {
  const mockAiAssistant = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  const mockAuditLog = {
    create: jest.fn()
  };
  return {
    aIAssistant: mockAiAssistant,
    auditLog: mockAuditLog
  };
});

// Mock AI LLM Providers
const mockProviderInstance = {
  generate: jest.fn().mockResolvedValue({
    caption: 'Mocked AI Content caption text',
    suggestedHashtags: ['#mocked', '#ai'],
    platformSpecificAdjustments: {
      facebook: 'Mocked facebook text',
      instagram: 'Mocked instagram text'
    }
  })
};

jest.mock('../../src/services/workspace/ai/providers/provider.factory', () => ({
  getProvider: () => mockProviderInstance
}));

// Mock Post Service for quick post creation
jest.mock('../../src/services/workspace/post.service', () => ({
  createPost: jest.fn().mockResolvedValue({
    id: 'post-999',
    caption: 'Mocked AI Content caption text',
    status: 'DRAFT'
  })
}));

const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const postService = require('../../src/services/workspace/post.service');

describe('AI Content Engine Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/ai/settings', () => {
    it('should return 400 if brandId is missing', async () => {
      const res = await request(app)
        .get('/api/ai/settings')
        .expect(400);

      expect(res.body.error).toBe('Missing brandId parameter');
    });

    it('should return brand settings successfully', async () => {
      prisma.aIAssistant.findUnique.mockResolvedValue({
        id: 'ai-1',
        brandId: 'brand-123',
        creditsUsed: 5,
        creditsLimit: 10
      });

      const res = await request(app)
        .get('/api/ai/settings?brandId=brand-123')
        .expect(200);

      expect(res.body.brandId).toBe('brand-123');
      expect(res.body.creditsLimit).toBe(10);
      expect(prisma.aIAssistant.findUnique).toHaveBeenCalledWith({
        where: { brandId: 'brand-123' }
      });
    });
  });

  describe('PUT /api/ai/settings', () => {
    it('should update brand settings successfully', async () => {
      prisma.aIAssistant.findUnique.mockResolvedValue({ brandId: 'brand-123' });
      prisma.aIAssistant.update.mockResolvedValue({
        brandId: 'brand-123',
        defaultTone: 'CASUAL'
      });

      const res = await request(app)
        .put('/api/ai/settings?brandId=brand-123')
        .send({ defaultTone: 'CASUAL' })
        .expect(200);

      expect(res.body.defaultTone).toBe('CASUAL');
      expect(prisma.aIAssistant.update).toHaveBeenCalled();
    });
  });

  describe('POST /api/ai/generate', () => {
    it('should generate content using LLM strategy provider', async () => {
      prisma.aIAssistant.findUnique.mockResolvedValue({
        brandId: 'brand-123',
        creditsUsed: 10,
        creditsLimit: 1000
      });

      prisma.aIAssistant.update.mockResolvedValue({
        brandId: 'brand-123',
        creditsUsed: 11,
        creditsLimit: 1000
      });

      const res = await request(app)
        .post('/api/ai/generate?brandId=brand-123')
        .send({
          prompt: 'Write about artificial intelligence',
          tone: 'PROFESSIONAL',
          platform: 'instagram'
        })
        .expect(200);

      expect(res.body.caption).toBe('Mocked AI Content caption text');
      expect(res.body.suggestedHashtags).toContain('#mocked');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('POST /api/ai/quick-post', () => {
    it('should call postService.createPost with mapped attributes', async () => {
      const res = await request(app)
        .post('/api/ai/quick-post?brandId=brand-123')
        .send({
          caption: 'Create new post',
          targetPlatforms: ['FACEBOOK'],
          status: 'DRAFT'
        })
        .expect(201);

      expect(res.body.id).toBe('post-999');
      expect(postService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          caption: 'Create new post',
          status: 'DRAFT',
          targetPlatforms: ['FACEBOOK']
        }),
        'user-123',
        'brand-123'
      );
    });
  });
});
