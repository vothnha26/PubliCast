const request = require('supertest');

// Mock Redis config to prevent connection attempts during tests
jest.mock('../../src/config/redis', () => ({
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true
}));

let mockUser = { id: 'admin-id-123', email: 'admin@publicast.com', role: 'ADMIN' };

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

describe('Admin User Management API Integration Tests', () => {
  let testUserId = 'test-user-id-abc';
  let testAdminId = 'admin-id-123';

  beforeAll(async () => {
    // 1. Tìm hoặc tạo admin user
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@publicast.com' }
    });

    if (admin) {
      testAdminId = admin.id;
      mockUser.id = admin.id;
    } else {
      admin = await prisma.user.create({
        data: {
          id: testAdminId,
          email: 'admin@publicast.com',
          passwordHash: 'hashed_password',
          name: 'System Administrator',
          role: 'ADMIN',
          isActive: true,
          isEmailVerified: true
        }
      });
    }

    // 2. Dọn dẹp test user cũ nếu có
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: testUserId },
          { email: 'testuser@publicast.com' }
        ]
      }
    });

    // 3. Tạo test user mẫu
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'testuser@publicast.com',
        passwordHash: 'hashed_password',
        name: 'Test Regular User',
        role: 'USER',
        isActive: true,
        isEmailVerified: true
      }
    });
  });

  afterAll(async () => {
    // Dọn dẹp test user
    await prisma.user.deleteMany({
      where: {
        id: testUserId
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/admin/users', () => {
    it('should retrieve list of users with pagination and search criteria', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=Test Regular User')
        .expect(200);

      expect(res.body.message).toContain('thành công');
      expect(res.body.data.data).toBeDefined();
      expect(res.body.data.data.length).toBeGreaterThan(0);

      const retrievedUser = res.body.data.data.find(u => u.id === testUserId);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.name).toBe('Test Regular User');
      expect(retrievedUser.role).toBe('USER');
    });

    it('should filter users by role successfully', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=ADMIN')
        .expect(200);

      expect(res.body.data.data).toBeDefined();
      const hasOnlyAdmins = res.body.data.data.every(u => u.role === 'ADMIN');
      expect(hasOnlyAdmins).toBe(true);
    });
  });

  describe('PATCH /api/admin/users/:id/status', () => {
    it('should toggle user isActive status (ban user) successfully', async () => {
      // 1. Ban user
      const banRes = await request(app)
        .patch(`/api/admin/users/${testUserId}/status`)
        .send({ isActive: false })
        .expect(200);

      expect(banRes.body.message).toContain('Vô hiệu hóa');
      expect(banRes.body.data.isActive).toBe(false);

      // Verify in DB
      let dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(dbUser.isActive).toBe(false);

      // 2. Unban user
      const unbanRes = await request(app)
        .patch(`/api/admin/users/${testUserId}/status`)
        .send({ isActive: true })
        .expect(200);

      expect(unbanRes.body.message).toContain('Kích hoạt');
      expect(unbanRes.body.data.isActive).toBe(true);

      dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(dbUser.isActive).toBe(true);
    });

    it('should prevent admin from banning themselves', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${testAdminId}/status`)
        .send({ isActive: false })
        .expect(500); // errorHandler will map it to 500 Internal Server Error

      expect(res.body.message).toContain('không thể tự vô hiệu hóa');
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should change user role successfully', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${testUserId}/role`)
        .send({ role: 'STAFF' })
        .expect(200);

      expect(res.body.message).toContain('Thay đổi vai trò');
      expect(res.body.data.role).toBe('STAFF');

      // Verify in DB
      const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(dbUser.role).toBe('STAFF');
    });

    it('should prevent admin from changing their own role', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${testAdminId}/role`)
        .send({ role: 'USER' })
        .expect(500);

      expect(res.body.message).toContain('không thể tự thay đổi vai trò');
    });
  });
});
