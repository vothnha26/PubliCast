// Mock otplib to prevent Jest from compiling its ES modules dependencies
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: () => 'TESTSECRET',
    generate: () => '123456',
    verify: ({ token, secret }) => {
      return token === '123456' && secret === 'TESTSECRET';
    },
    keyuri: () => 'otpauth://totp/PubliCast:2fa-test@example.com?secret=TESTSECRET&issuer=PubliCast'
  }
}));

const request = require('supertest');
const app = require('../../src/app');
const userRepository = require('../../src/repositories/auth/user.repository');
const prisma = require('../../src/config/prisma');
const redisClient = require('../../src/config/redis');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');

const testUser = {
  email: '2fa-test@example.com',
  password: 'testPassword123',
  fullName: '2FA Test User',
  isActive: true,
  isEmailVerified: true
};

describe('Two-Factor Authentication (2FA) Integration Tests', () => {
  let userId;
  let cookies;
  let backupCodes = [];
  let userSecret = '';

  const cleanup = async () => {
    try {
      const user = await prisma.user.findFirst({
        where: { email: testUser.email }
      });
      if (user) {
        await prisma.userAccount.deleteMany({
          where: { userId: user.id }
        });
        await prisma.brand.deleteMany({
          where: { ownerId: user.id }
        });
        await prisma.user.delete({
          where: { id: user.id }
        });
      }
    } catch (err) {
      console.error('Error in cleanup:', err.message);
    }
  };

  beforeAll(async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await cleanup();

    // Create test user
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
        isEmailVerified: true
      }
    });

    // Login to get cookies
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    cookies = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await cleanup();
    try {
      if (redisClient.isOpen) {
        await redisClient.flushDb();
        await redisClient.disconnect();
      }
    } catch (error) {
      console.error('Error cleaning up Redis:', error);
    }
  });

  describe('Step 1: Setup 2FA', () => {
    it('should return secret and qrCodeDataUrl when setup is requested', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', cookies || []);

      expect(response.status).toBe(200);
      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCodeDataUrl).toBeDefined();
      userSecret = response.body.secret;
    });

    it('should prevent setup for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/setup');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 2: Verify 2FA to enable it', () => {
    it('should return 400 for incorrect OTP code', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Cookie', cookies || [])
        .send({ code: '000000' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('không hợp lệ');
    });

    it('should successfully enable 2FA with valid OTP code', async () => {
      // Generate valid token using authenticator
      const validToken = authenticator.generate(userSecret);

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Cookie', cookies || [])
        .send({ code: validToken });

      // Gán backupCodes trước đề phòng assert fail thì các test case sau vẫn có data
      if (response.body && response.body.backupCodes) {
        backupCodes = response.body.backupCodes;
      }

      expect(response.status).toBe(200);
      expect(response.body.backupCodes).toBeDefined();
      expect(response.body.backupCodes.length).toBe(10);
    });
  });

  describe('Step 3: Two-step Login Enforcement', () => {
    let preAuthToken = '';

    it('should require 2FA authentication when logging in with email/password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.require2FA).toBe(true);
      expect(response.body.preAuthToken).toBeDefined();
      
      preAuthToken = response.body.preAuthToken;
    });

    it('should login successfully using the valid OTP code and preAuthToken', async () => {
      const validToken = authenticator.generate(userSecret);

      const response = await request(app)
        .post('/api/auth/2fa/login-verify')
        .send({
          preAuthToken,
          code: validToken
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successful');
      expect(response.headers['set-cookie']).toBeDefined();
      cookies = response.headers['set-cookie'];
    });

    it('should allow login using a valid backup code', async () => {
      // Get a new preAuthToken first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      const newPreAuthToken = loginRes.body.preAuthToken;
      const backupCodeToUse = backupCodes[0];

      // Verify login using backup code
      const response = await request(app)
        .post('/api/auth/2fa/login-verify')
        .send({
          preAuthToken: newPreAuthToken,
          code: backupCodeToUse
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successful');
    });

    it('should consume the backup code so it cannot be used again', async () => {
      // Get a new preAuthToken
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      const newPreAuthToken = loginRes.body.preAuthToken;
      const backupCodeToUse = backupCodes[0]; // Same code as before

      // Verify login using already consumed backup code
      const response = await request(app)
        .post('/api/auth/2fa/login-verify')
        .send({
          preAuthToken: newPreAuthToken,
          code: backupCodeToUse
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('không chính xác');
    });
  });

  describe('Step 4: Disable 2FA', () => {
    it('should successfully disable 2FA with a valid OTP code', async () => {
      const validToken = authenticator.generate(userSecret);

      const response = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Cookie', cookies || [])
        .send({ code: validToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('thành công');

      // Verify database
      const userInDb = await prisma.user.findUnique({
        where: { id: userId }
      });
      expect(userInDb.isTwoFactorEnabled).toBe(false);
      expect(userInDb.twoFactorSecret).toBeNull();
      expect(userInDb.twoFactorBackupCodes).toBeNull();
    });
  });
});
