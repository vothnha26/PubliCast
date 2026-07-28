const request = require('supertest');

// Mock otplib to prevent ESModule parsing errors on @scure/base in Jest
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    verify: jest.fn()
  }
}));

// Mock auth so req.user is controllable per test.
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'caller-user-id', email: 'caller@publicast.com', role: 'USER' };
    next();
  }
}));

jest.mock('../../src/middlewares/csrf.middleware', () => ({
  issueCsrfToken: (req, res, next) => next(),
  enforceCsrfGlobally: (req, res, next) => next(),
  verifyCsrfToken: (req, res, next) => next(),
  CSRF_COOKIE_NAME: 'csrfToken',
  CSRF_HEADER_NAME: 'x-csrf-token'
}));

jest.mock('../../src/services/auth/authorization.facade');
jest.mock('../../src/services/social/social.service');
jest.mock('../../src/repositories/workspace/brand.repository');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/connection-conflict.guard', () => ({
  ConnectionConflictGuard: { reassignAccount: jest.fn() },
  ConnectionConflictError: class ConnectionConflictError extends Error {}
}));

const app = require('../../src/app');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const socialService = require('../../src/services/social/social.service');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { ConnectionConflictGuard: connectionConflictGuard } = require('../../src/services/social/connection-conflict.guard');

describe('Social connection routes — permission enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/social/facebook/disconnect', () => {
    it('returns 403 when the caller lacks MANAGE_CONNECTIONS on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/social/facebook/disconnect')
        .send({ brandId: 'brand-1' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
      expect(socialService.disconnectAccount).not.toHaveBeenCalled();
    });

    it('disconnects when the caller has MANAGE_CONNECTIONS on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(true);
      socialService.disconnectAccount.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/social/facebook/disconnect')
        .send({ brandId: 'brand-1' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(socialService.disconnectAccount).toHaveBeenCalledWith('brand-1', 'FACEBOOK');
    });
  });

  describe('POST /api/social/reassign', () => {
    const body = {
      platform: 'FACEBOOK',
      platformAccountId: 'fb-page-123',
      targetBrandId: 'brand-target'
    };

    it('returns 404 when the target brand does not exist', async () => {
      brandRepository.findById.mockResolvedValue(null);

      const res = await request(app).post('/api/social/reassign').send(body).expect(404);

      expect(res.body.message).toContain('Target brand not found');
    });

    it('returns 404 when the social account does not exist', async () => {
      brandRepository.findById.mockResolvedValue({ id: 'brand-target', ownerId: 'someone-else' });
      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(null);

      const res = await request(app).post('/api/social/reassign').send(body).expect(404);

      expect(res.body.message).toContain('Social account not found');
    });

    it('returns 403 when the caller lacks MANAGE_CONNECTIONS on the source brand', async () => {
      brandRepository.findById.mockResolvedValue({ id: 'brand-target', ownerId: 'someone-else' });
      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue({ brandId: 'brand-source' });
      authorizationFacade.checkPermission.mockImplementation((userId, brandId) =>
        Promise.resolve(brandId !== 'brand-source')
      );

      const res = await request(app).post('/api/social/reassign').send(body).expect(403);

      expect(res.body.message).toContain('thương hiệu nguồn');
      expect(connectionConflictGuard.reassignAccount).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller lacks MANAGE_CONNECTIONS on the target brand', async () => {
      brandRepository.findById.mockResolvedValue({ id: 'brand-target', ownerId: 'someone-else' });
      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue({ brandId: 'brand-source' });
      authorizationFacade.checkPermission.mockImplementation((userId, brandId) =>
        Promise.resolve(brandId !== 'brand-target')
      );

      const res = await request(app).post('/api/social/reassign').send(body).expect(403);

      expect(res.body.message).toContain('thương hiệu đích');
      expect(connectionConflictGuard.reassignAccount).not.toHaveBeenCalled();
    });

    it('reassigns when the caller has MANAGE_CONNECTIONS on both brands', async () => {
      brandRepository.findById.mockResolvedValue({ id: 'brand-target', ownerId: 'someone-else' });
      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue({ brandId: 'brand-source' });
      authorizationFacade.checkPermission.mockResolvedValue(true);
      connectionConflictGuard.reassignAccount.mockResolvedValue({ ok: true });

      const res = await request(app).post('/api/social/reassign').send(body).expect(200);

      expect(res.body.success).toBe(true);
      expect(connectionConflictGuard.reassignAccount).toHaveBeenCalledWith('FACEBOOK', 'fb-page-123', 'brand-target');
    });
  });
});
