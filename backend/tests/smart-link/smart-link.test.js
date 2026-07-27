const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');
const redisClient = require('../../src/config/redis');

// Import Strategy Factories to test Strategy Pattern
const backgroundValidatorFactory = require('../../src/services/workspace/smart-link/background-validators/background-validator.factory');
const linkProcessorFactory = require('../../src/services/workspace/smart-link/link-processors/link-processor.factory');

describe('SmartLink & Strategy Patterns Tests', () => {
  // Test Data
  const testUser = {
    email: 'smartlink-test@example.com',
    password: 'password123',
    name: 'SmartLink Owner'
  };

  let userId;
  let brandId;
  let cookie;
  let createdSmartLinkId;
  let createdLinkItemId;
  let testSlug = 'brand-custom-slug-' + Date.now();

  const cleanup = async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email }
      });
      if (user) {
        const brands = await prisma.brand.findMany({
          where: { ownerId: user.id }
        });
        const brandIds = brands.map(b => b.id);
        const subIds = brands.map(b => b.subscriptionId).filter(Boolean);

        if (brandIds.length > 0) {
          // Delete link items and smart links
          const smartLinks = await prisma.smartLink.findMany({
            where: { brandId: { in: brandIds } }
          });
          const smartLinkIds = smartLinks.map(s => s.id);
          
          if (smartLinkIds.length > 0) {
            await prisma.linkItem.deleteMany({
              where: { smartLinkId: { in: smartLinkIds } }
            });
            await prisma.smartLink.deleteMany({
              where: { id: { in: smartLinkIds } }
            });
          }

          await prisma.team.deleteMany({ where: { brandId: { in: brandIds } } });
          await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
          await prisma.subscription.deleteMany({ where: { id: { in: subIds } } });
        }

        await prisma.userAccount.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      }
    } catch (err) {
      console.error('Test cleanup error:', err.message);
    }
  };

  beforeAll(async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await cleanup();

    // 1. Create User
    const passwordHash = await bcrypt.hash(testUser.password, 10);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        name: testUser.name,
        isActive: true,
        isEmailVerified: true,
        accounts: {
          create: {
            provider: 'LOCAL',
            passwordHash
          }
        }
      }
    });
    userId = user.id;

    // 2. Create default Brand
    const freePlan = await prisma.plan.findFirst({
      where: { name: 'FREE' }
    });
    const sub = await prisma.subscription.create({
      data: {
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    const brand = await prisma.brand.create({
      data: {
        name: 'SmartLink Test Brand',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultLanguage: 'vi',
        ownerId: userId,
        subscriptionId: sub.id
      }
    });
    brandId = brand.id;

    // 3. Login User to get Auth Cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    cookie = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await cleanup();
    try {
      if (redisClient.isOpen) {
        await redisClient.disconnect();
      }
    } catch (error) {
      console.error('Error cleaning up Redis:', error);
    }
    await prisma.$disconnect();
  });

  // ============================================
  // UNIT TESTS: STRATEGY PATTERNS
  // ============================================
  describe('SOLID Strategy Patterns Unit Tests', () => {
    
    describe('Background Validator Strategy', () => {
      it('should validate hex colors correctly', () => {
        const validator = backgroundValidatorFactory.getValidator('COLOR');
        expect(validator.validate('#FFFFFF')).toBe(true);
        expect(validator.validate('#FFF')).toBe(true);
        expect(validator.validate('#FF00AA88')).toBe(true);
        expect(validator.validate('red')).toBe(false);
        expect(validator.validate('#GGGGGG')).toBe(false);
      });

      it('should validate gradient classes and css gradients correctly', () => {
        const validator = backgroundValidatorFactory.getValidator('GRADIENT');
        expect(validator.validate('bg-gradient-to-r from-cyan-500 to-blue-500')).toBe(true);
        expect(validator.validate('linear-gradient(to right, red, yellow)')).toBe(true);
        expect(validator.validate('color-white')).toBe(false);
      });

      it('should validate image urls correctly', () => {
        const validator = backgroundValidatorFactory.getValidator('IMAGE');
        expect(validator.validate('https://example.com/bg.png')).toBe(true);
        expect(validator.validate('/uploads/bg.png')).toBe(true);
        expect(validator.validate('not-a-url')).toBe(false);
      });

      it('should validate predefined themes correctly', () => {
        const validator = backgroundValidatorFactory.getValidator('THEME');
        expect(validator.validate('midnight')).toBe(true);
        expect(validator.validate('sunset')).toBe(true);
        expect(validator.validate('mint')).toBe(true);
        expect(validator.validate('cyberpunk')).toBe(true);
        expect(validator.validate('unknown-theme')).toBe(false);
      });

      it('should throw error for unsupported validator type', () => {
        expect(() => backgroundValidatorFactory.getValidator('VIDEO')).toThrow();
      });
    });

    describe('Link Processor Strategy', () => {
      it('should process YouTube link and assign default emoji and iconUrl', () => {
        const processor = linkProcessorFactory.getProcessor('youtube.com/watch?v=123');
        const processed = processor.process({ title: 'My Channel', url: 'youtube.com/watch?v=123' });
        
        expect(processed.url).toBe('https://youtube.com/watch?v=123');
        expect(processed.emoji).toBe('📺');
        expect(processed.iconUrl).toBe('youtube');
      });

      it('should process Facebook link and assign default emoji and iconUrl', () => {
        const processor = linkProcessorFactory.getProcessor('facebook.com/brand');
        const processed = processor.process({ title: 'My Page', url: 'facebook.com/brand' });
        
        expect(processed.url).toBe('https://facebook.com/brand');
        expect(processed.emoji).toBe('📘');
        expect(processed.iconUrl).toBe('facebook');
      });

      it('should process TikTok link and assign default emoji and iconUrl', () => {
        const processor = linkProcessorFactory.getProcessor('tiktok.com/@brand');
        const processed = processor.process({ title: 'My TikTok', url: 'tiktok.com/@brand' });
        
        expect(processed.url).toBe('https://tiktok.com/@brand');
        expect(processed.emoji).toBe('🎵');
        expect(processed.iconUrl).toBe('tiktok');
      });

      it('should use default processor for generic link', () => {
        const processor = linkProcessorFactory.getProcessor('google.com');
        const processed = processor.process({ title: 'Google', url: 'google.com' });
        
        expect(processed.url).toBe('https://google.com');
        expect(processed.emoji).toBe('🔗');
        expect(processed.iconUrl).toBe('link');
      });
    });
  });

  // ============================================
  // INTEGRATION TESTS: API ENDPOINTS
  // ============================================
  describe('SmartLink API Integration Tests', () => {
    
    it('should return null or 200 with data null when no SmartLink configured for brand', async () => {
      const res = await request(app)
        .get(`/api/smart-links?brandId=${brandId}`)
        .set('Cookie', cookie);
        
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('should fail to create SmartLink with invalid background color hex', async () => {
      const res = await request(app)
        .post('/api/smart-links')
        .set('Cookie', cookie)
        .send({
          brandId,
          slug: testSlug,
          pageTitle: 'Test Page Title',
          backgroundType: 'COLOR',
          backgroundValue: 'invalid-hex-color', // invalid
          buttonStyle: 'rounded'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid background value');
    });

    it('should create SmartLink successfully with valid color', async () => {
      const res = await request(app)
        .post('/api/smart-links')
        .set('Cookie', cookie)
        .send({
          brandId,
          slug: testSlug,
          pageTitle: 'Test Bio Page',
          backgroundType: 'COLOR',
          backgroundValue: '#000000',
          buttonStyle: 'rounded-xl',
          isPublished: true,
          links: [
            { title: 'My Youtube', url: 'youtube.com/channel/xyz' },
            { title: 'Personal Website', url: 'https://example.com' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.slug).toBe(testSlug);
      expect(res.body.data.links).toHaveLength(2);
      
      // Verify processed fields
      const ytLink = res.body.data.links.find(l => l.title === 'My Youtube');
      expect(ytLink.emoji).toBe('📺');
      expect(ytLink.iconUrl).toBe('youtube');
      
      createdSmartLinkId = res.body.data.id;
      createdLinkItemId = ytLink.id;
    });

    it('should retrieve SmartLink configurations by brandId', async () => {
      const res = await request(app)
        .get(`/api/smart-links?brandId=${brandId}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdSmartLinkId);
      expect(res.body.data.pageTitle).toBe('Test Bio Page');
    });

    it('should update SmartLink and sync link items correctly', async () => {
      const res = await request(app)
        .put(`/api/smart-links/${createdSmartLinkId}`)
        .set('Cookie', cookie)
        .send({
          brandId,
          pageTitle: 'Updated Page Title',
          backgroundType: 'THEME',
          backgroundValue: 'midnight', // valid theme
          buttonStyle: 'square',
          links: [
            // Keep youtube link, but change title
            { id: createdLinkItemId, title: 'My Channel Youtube', url: 'youtube.com/channel/xyz' },
            // Add a new facebook link
            { title: 'Facebook Page', url: 'facebook.com/page' }
            // Personal website should be deleted automatically
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.pageTitle).toBe('Updated Page Title');
      expect(res.body.data.backgroundValue).toBe('midnight');
      expect(res.body.data.links).toHaveLength(2);
      
      const titles = res.body.data.links.map(l => l.title);
      expect(titles).toContain('My Channel Youtube');
      expect(titles).toContain('Facebook Page');
      expect(titles).not.toContain('Personal Website');

      const fbLink = res.body.data.links.find(l => l.title === 'Facebook Page');
      expect(fbLink.emoji).toBe('📘');
      expect(fbLink.iconUrl).toBe('facebook');
    });

    // ============================================
    // PUBLIC VIEWING AND ANALYTICS TRACKING
    // ============================================
    it('should fetch public bio page details by slug', async () => {
      const res = await request(app)
        .get(`/api/smart-links/public/${testSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(testSlug);
      expect(res.body.data.links).toHaveLength(2);
    });

    it('should track link clicks and increment the click count', async () => {
      // 1. Get initial click count
      const initialGet = await request(app)
        .get(`/api/smart-links?brandId=${brandId}`)
        .set('Cookie', cookie);
      
      const targetLink = initialGet.body.data.links.find(l => l.id === createdLinkItemId);
      const initialClicks = targetLink.clicks;

      // 2. Track click
      const trackRes = await request(app)
        .post(`/api/smart-links/click/${createdLinkItemId}`);
      
      expect(trackRes.status).toBe(200);

      // 3. Verify increment
      const afterGet = await request(app)
        .get(`/api/smart-links?brandId=${brandId}`)
        .set('Cookie', cookie);
      
      const updatedLink = afterGet.body.data.links.find(l => l.id === createdLinkItemId);
      expect(updatedLink.clicks).toBe(initialClicks + 1);
    });

  });
});
