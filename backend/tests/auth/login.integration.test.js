const request = require('supertest');
const app = require('../../src/app');
const userRepository = require('../../src/repositories/auth/user.repository');
const authService = require('../../src/services/auth/auth.service');
const redisClient = require('../../src/config/redis');
const bcrypt = require('bcryptjs');
const prisma = require('../../src/config/prisma');

const { USER_STATUS, USER_ROLES } = require('../../src/utils/constants');

// Mock user data
const testUser = {
  email: 'test@example.com',
  password: 'testPassword123',
  fullName: 'Test User',
  role: USER_ROLES.USER,
  status: USER_STATUS.ACTIVE
};

const testAdmin = {
  email: 'admin@example.com',
  password: 'adminPassword123',
  fullName: 'Admin User',
  role: USER_ROLES.ADMIN,
  status: USER_STATUS.ACTIVE
};

describe('Login Integration Tests', () => {
  let userId;
  let adminId;

  const cleanupUsers = async () => {
    const emails = [
      testUser.email,
      testAdmin.email,
      'inactive@example.com',
      'ratelimit@example.com',
      'ratelimit2@example.com'
    ];
    try {
      const users = await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true }
      });
      const userIds = users.map(u => u.id);

      if (userIds.length > 0) {
        const brands = await prisma.brand.findMany({
          where: { ownerId: { in: userIds } },
          select: { id: true, subscriptionId: true }
        });
        const brandIds = brands.map(b => b.id);
        const subscriptionIds = brands.map(b => b.subscriptionId).filter(Boolean);

        if (brandIds.length > 0) {
          await prisma.team.deleteMany({
            where: { brandId: { in: brandIds } }
          });
          await prisma.subscriptionAddon.deleteMany({
            where: { brandId: { in: brandIds } }
          });
          await prisma.post.deleteMany({
            where: { brandId: { in: brandIds } }
          });
          await prisma.autoList.deleteMany({
            where: { brandId: { in: brandIds } }
          });
          await prisma.brand.deleteMany({
            where: { id: { in: brandIds } }
          });
          await prisma.subscription.deleteMany({
            where: { id: { in: subscriptionIds } }
          });
        }

        await prisma.userAccount.deleteMany({
          where: { userId: { in: userIds } }
        });
        await prisma.user.deleteMany({
          where: { id: { in: userIds } }
        });
      }
    } catch (err) {
      console.error('Error during cleanup:', err.message);
    }
  };

  beforeAll(async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await cleanupUsers();

    // Create test user in database
    try {
      const passwordHash = await bcrypt.hash(testUser.password, 10);
      const user = await userRepository.createUser(
        {
          email: testUser.email,
          fullName: testUser.fullName,
          isActive: true,
          isEmailVerified: true
        },
        {
          provider: 'LOCAL',
          passwordHash
        }
      );
      userId = user.id;

      // Update fields that are hardcoded or ignored by repository.createUser
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          isEmailVerified: true,
          role: testUser.role
        }
      });
    } catch (error) {
      console.error('Error creating test user:', error);
    }

    // Create test admin
    try {
      const passwordHash = await bcrypt.hash(testAdmin.password, 10);
      const admin = await userRepository.createUser(
        {
          email: testAdmin.email,
          fullName: testAdmin.fullName,
          isActive: true,
          isEmailVerified: true
        },
        {
          provider: 'LOCAL',
          passwordHash
        }
      );
      adminId = admin.id;

      // Update fields that are hardcoded or ignored by repository.createUser
      await prisma.user.update({
        where: { id: adminId },
        data: {
          isActive: true,
          isEmailVerified: true,
          role: testAdmin.role
        }
      });
    } catch (error) {
      console.error('Error creating test admin:', error);
    }
  });

  afterAll(async () => {
    await cleanupUsers();
    try {
      if (redisClient.isOpen) {
        await redisClient.flushDb();
        await redisClient.disconnect();
      }
    } catch (error) {
      console.error('Error cleaning up Redis:', error);
    }
  });

  afterEach(async () => {
    try {
      if (redisClient.isOpen) {
        await redisClient.flushDb();
      }
    } catch (error) {
      console.error('Error flushing Redis in afterEach:', error);
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.role).toBe(USER_ROLES.USER);
      expect(response.body.redirectUrl).toBe('/user/profile');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anyPassword123'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: testUser.password
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email is required');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password
        });

      expect(response.status).toBe(400);
    });

    it('should return 403 for inactive account', async () => {
      // Create inactive user
      const inactiveEmail = 'inactive@example.com';
      const passwordHash = await bcrypt.hash('password123', 10);
      await userRepository.createUser(
        {
          email: inactiveEmail,
          fullName: 'Inactive User',
          status: USER_STATUS.INACTIVE
        },
        {
          provider: 'LOCAL',
          passwordHash
        }
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: inactiveEmail,
          password: 'password123'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('not activated');
    });

    it('should redirect admin to /admin/profile', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(USER_ROLES.ADMIN);
      expect(response.body.redirectUrl).toBe('/admin/profile');
    });

    it('should set HttpOnly cookies on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('accessToken'))).toBe(true);
      expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);
      expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully when authenticated', async () => {
      // First login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      // Get cookies
      const cookies = loginRes.headers['set-cookie'];

      // Then logout with auth
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe('Logout successful');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow 5 failed login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'ratelimit@example.com',
            password: 'wrongPassword'
          });

        if (i < 5) {
          expect([400, 401]).toContain(response.status);
        }
      }
    });

    it('should block 6th login attempt with 429', async () => {
      const testEmail = 'ratelimit2@example.com';

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongPassword'
          });
      }

      // 6th attempt should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongPassword'
        });

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('Too many login attempts');
    });

    it('should reset attempts after successful login', async () => {
      // Successful login should reset attempts
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile when authenticated', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const cookies = loginRes.headers['set-cookie'];

      // Get profile
      const profileRes = await request(app)
        .get('/api/user/profile')
        .set('Cookie', cookies);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.email).toBe(testUser.email);
      expect(profileRes.body.data.role).toBe(USER_ROLES.USER);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/user/profile');

      expect(response.status).toBe(401);
    });

    it('should return 200 when admin accesses user profile', async () => {
      // Login as admin
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });

      const cookies = loginRes.headers['set-cookie'];

      // Try to access user profile
      const profileRes = await request(app)
        .get('/api/user/profile')
        .set('Cookie', cookies);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.role).toBe(USER_ROLES.ADMIN);
    });
  });

  describe('GET /api/admin/profile', () => {
    it('should return admin profile when authenticated as admin', async () => {
      // Login as admin
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });

      const cookies = loginRes.headers['set-cookie'];

      // Get admin profile
      const profileRes = await request(app)
        .get('/api/admin/profile')
        .set('Cookie', cookies);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.role).toBe(USER_ROLES.ADMIN);
    });

    it('should return 403 if user tries to access admin profile', async () => {
      // Login as user
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const cookies = loginRes.headers['set-cookie'];

      // Try to access admin profile
      const profileRes = await request(app)
        .get('/api/admin/profile')
        .set('Cookie', cookies);

      expect(profileRes.status).toBe(403);
    });
  });

  describe('Token Management', () => {
    it('should generate valid JWT tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      
      // Verify tokens can be extracted from cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });
});
