const request = require('supertest');

// Mock Redis config to prevent connection attempts during tests
jest.mock('../../src/config/redis', () => ({
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true
}));

let mockUser = { id: 'admin-123', email: 'admin@publicast.com', role: 'ADMIN' };

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => {
  const verifyAuth = (req, res, next) => {
    req.user = mockUser;
    next();
  };
  return { verifyAuth, verifyAuthFromQuery: verifyAuth };
});

// Mock Authorization Middleware
jest.mock('../../src/middlewares/authorization.middleware', () => ({
  authorize: () => (req, res, next) => next(),
  authorizeAdmin: (req, res, next) => next(),
  authorizeUser: (req, res, next) => next(),
  authorizeAny: (req, res, next) => next()
}));

const app = require('../../src/app');
const prisma = require('../../src/config/prisma');

describe('Product Matrix Admin API Integration Tests', () => {
  let testPlatformId = 'TST';
  let testModuleId = 'TM1';

  beforeAll(async () => {
    // Cleanup any leftovers from aborted tests
    await prisma.product.deleteMany({
      where: {
        OR: [
          { platformId: testPlatformId },
          { moduleId: testModuleId },
          { platformId: 'NEW' }
        ]
      }
    });

    await prisma.platform.deleteMany({
      where: {
        id: { in: [testPlatformId, 'NEW'] }
      }
    });

    await prisma.module.deleteMany({
      where: {
        id: { in: [testModuleId, 'NM1'] }
      }
    });

    // Create test platform and module
    await prisma.platform.create({
      data: { id: testPlatformId, name: 'Test Platform', color: '#123456' }
    });

    await prisma.module.create({
      data: { id: testModuleId, name: 'Test Module', description: 'Test Module Desc' }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.product.deleteMany({
      where: {
        OR: [
          { platformId: testPlatformId },
          { moduleId: testModuleId },
          { platformId: 'NEW' }
        ]
      }
    });

    await prisma.platform.deleteMany({
      where: {
        id: { in: [testPlatformId, 'NEW'] }
      }
    });

    await prisma.module.deleteMany({
      where: {
        id: { in: [testModuleId, 'NM1'] }
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/admin/products/matrix', () => {
    it('should retrieve matrix, platforms and modules successfully', async () => {
      const res = await request(app)
        .get('/api/admin/products/matrix')
        .expect(200);

      expect(res.body.message).toContain('retrieved successfully');
      expect(res.body.data.platforms).toBeDefined();
      expect(res.body.data.modules).toBeDefined();
      expect(res.body.data.matrix).toBeDefined();

      // Verify our created test platform and module are in response
      const hasPlatform = res.body.data.platforms.some(p => p.id === testPlatformId);
      const hasModule = res.body.data.modules.some(m => m.id === testModuleId);
      expect(hasPlatform).toBe(true);
      expect(hasModule).toBe(true);
    });
  });

  describe('POST /api/admin/products/platforms', () => {
    it('should create a new platform successfully', async () => {
      const res = await request(app)
        .post('/api/admin/products/platforms')
        .send({
          id: 'NEW',
          name: 'New Social Network',
          color: '#ffffff'
        })
        .expect(201);

      expect(res.body.message).toContain('created successfully');
      expect(res.body.data.id).toBe('NEW');
      expect(res.body.data.name).toBe('New Social Network');

      // Verify in DB
      const dbPlatform = await prisma.platform.findUnique({ where: { id: 'NEW' } });
      expect(dbPlatform).not.toBeNull();
    });
  });

  describe('POST /api/admin/products/modules', () => {
    it('should create a new module successfully', async () => {
      const res = await request(app)
        .post('/api/admin/products/modules')
        .send({
          id: 'NM1',
          name: 'New Module X',
          description: 'Custom features'
        })
        .expect(201);

      expect(res.body.message).toContain('created successfully');
      expect(res.body.data.id).toBe('NM1');
      expect(res.body.data.name).toBe('New Module X');

      // Verify in DB
      const dbModule = await prisma.module.findUnique({ where: { id: 'NM1' } });
      expect(dbModule).not.toBeNull();
    });
  });

  describe('POST /api/admin/products/matrix (Enable)', () => {
    it('should enable (create product) for platform-module pair', async () => {
      const res = await request(app)
        .post('/api/admin/products/matrix')
        .send({
          platformId: testPlatformId,
          moduleId: testModuleId,
          sku: 'SKU-TEST-M1'
        })
        .expect(200);

      expect(res.body.message).toContain('enabled successfully');
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.sku).toBe('SKU-TEST-M1');

      // Verify in DB
      const dbProduct = await prisma.product.findFirst({
        where: { platformId: testPlatformId, moduleId: testModuleId }
      });
      expect(dbProduct).not.toBeNull();
      expect(dbProduct.status).toBe('ACTIVE');
    });
  });

  describe('POST /api/admin/products/matrix/disable', () => {
    it('should disable (status = INACTIVE) platform-module pair', async () => {
      const res = await request(app)
        .post('/api/admin/products/matrix/disable')
        .send({
          platformId: testPlatformId,
          moduleId: testModuleId
        })
        .expect(200);

      expect(res.body.message).toContain('disabled successfully');
      expect(res.body.data.status).toBe('INACTIVE');

      // Verify in DB
      const dbProduct = await prisma.product.findFirst({
        where: { platformId: testPlatformId, moduleId: testModuleId }
      });
      expect(dbProduct.status).toBe('INACTIVE');
    });
  });

  describe('DELETE /api/admin/products/platforms/:id', () => {
    it('should delete a platform and clean up products', async () => {
      await request(app)
        .delete(`/api/admin/products/platforms/NEW`)
        .expect(200);

      const dbPlatform = await prisma.platform.findUnique({ where: { id: 'NEW' } });
      expect(dbPlatform).toBeNull();
    });
  });

  describe('DELETE /api/admin/products/modules/:id', () => {
    it('should delete a module successfully', async () => {
      await request(app)
        .delete(`/api/admin/products/modules/NM1`)
        .expect(200);

      const dbModule = await prisma.module.findUnique({ where: { id: 'NM1' } });
      expect(dbModule).toBeNull();
    });
  });
});
