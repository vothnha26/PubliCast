jest.mock('../../src/services/social/social.service', () => ({
  disconnectAccount: jest.fn(),
  syncPublishedPostsNow: jest.fn(),
  setDefaultAccount: jest.fn()
}));
jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findById: jest.fn()
}));
jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findByPlatformAccountIdAndPlatform: jest.fn()
}));
jest.mock('../../src/services/social/connection-conflict.guard', () => ({
  ConnectionConflictGuard: { reassignAccount: jest.fn() }
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkPermission: jest.fn()
}));

const socialService = require('../../src/services/social/social.service');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { ConnectionConflictGuard: connectionConflictGuard } = require('../../src/services/social/connection-conflict.guard');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const socialConnectionController = require('../../src/controllers/social/social-connection.controller');
const socialConnectionControllerV2 = require('../../src/controllers/social/social-connection.controller.v2');

function mockReqRes({ body = {}, user = { id: 'user-1' } } = {}) {
  const req = { body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

// See tests/social/oauth.controller.test.js for why this indirection is
// needed — asyncHandler's (req, res, next) shape doesn't return a Promise
// the caller can await directly.
function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('SocialConnectionController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('disconnectFacebookAccount', () => {
    it('v1 returns {success: true, message}; v2 drops `success` (unused by any frontend caller) but keeps the same message', async () => {
      socialService.disconnectAccount.mockResolvedValue({ count: 1 });

      const v1 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(socialConnectionController.disconnectFacebookAccount, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, message: 'Facebook page disconnected successfully' });

      const v2 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(socialConnectionControllerV2.disconnectFacebookAccount, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Facebook page disconnected successfully', data: null });
      expect(socialService.disconnectAccount).toHaveBeenCalledWith('brand-1', 'FACEBOOK', undefined);
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(socialConnectionController.disconnectFacebookAccount, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(socialConnectionControllerV2.disconnectFacebookAccount, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('syncPublishedPostsNow', () => {
    it('v1 and v2 both return the sync result under `data`', async () => {
      socialService.syncPublishedPostsNow.mockResolvedValue({ synced: 3 });

      const v1 = mockReqRes({ body: { brandId: 'brand-1', platform: 'FACEBOOK', socialAccountId: 'acc-1' } });
      await callHandler(socialConnectionController.syncPublishedPostsNow, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, message: 'Sync triggered successfully', data: { synced: 3 } });

      const v2 = mockReqRes({ body: { brandId: 'brand-1', platform: 'FACEBOOK', socialAccountId: 'acc-1' } });
      await callHandler(socialConnectionControllerV2.syncPublishedPostsNow, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Sync triggered successfully', data: { synced: 3 } });
    });

    it('propagates the service error statusCode (e.g. 429 cooldown) on both versions', async () => {
      const cooldownError = new Error('Please wait before refreshing again');
      cooldownError.statusCode = 429;
      socialService.syncPublishedPostsNow.mockRejectedValue(cooldownError);

      const v1 = mockReqRes({ body: { brandId: 'brand-1', platform: 'FACEBOOK', socialAccountId: 'acc-1' } });
      await callHandler(socialConnectionController.syncPublishedPostsNow, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(429);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Please wait before refreshing again' });

      const v2 = mockReqRes({ body: { brandId: 'brand-1', platform: 'FACEBOOK', socialAccountId: 'acc-1' } });
      await callHandler(socialConnectionControllerV2.syncPublishedPostsNow, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(429);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Please wait before refreshing again' });
    });
  });

  describe('setDefaultAccount', () => {
    it('v1 and v2 both return the updated account under `data`', async () => {
      socialService.setDefaultAccount.mockResolvedValue({ id: 'acc-1', isDefault: true });

      const v1 = mockReqRes({ body: { brandId: 'brand-1', socialAccountId: 'acc-1' } });
      await callHandler(socialConnectionController.setDefaultAccount, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, message: 'Default account updated successfully', data: { id: 'acc-1', isDefault: true } });

      const v2 = mockReqRes({ body: { brandId: 'brand-1', socialAccountId: 'acc-1' } });
      await callHandler(socialConnectionControllerV2.setDefaultAccount, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Default account updated successfully', data: { id: 'acc-1', isDefault: true } });
    });
  });

  describe('reassignSocialAccount', () => {
    const body = { platform: 'FACEBOOK', platformAccountId: 'fb-page-123', targetBrandId: 'brand-target' };

    it('v1 and v2 both 404 when the target brand does not exist', async () => {
      brandRepository.findById.mockResolvedValue(null);

      const v1 = mockReqRes({ body });
      await callHandler(socialConnectionController.reassignSocialAccount, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(404);

      const v2 = mockReqRes({ body });
      await callHandler(socialConnectionControllerV2.reassignSocialAccount, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(404);
    });

    it('v1 and v2 both 403 with the Vietnamese "nguồn" message when lacking permission on the source brand', async () => {
      brandRepository.findById.mockResolvedValue({ id: 'brand-target' });
      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue({ brandId: 'brand-source' });
      authorizationFacade.checkPermission.mockImplementation((userId, brandId) => Promise.resolve(brandId !== 'brand-source'));

      const v1 = mockReqRes({ body });
      await callHandler(socialConnectionController.reassignSocialAccount, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(403);
      expect(v1.res.json.mock.calls[0][0].message).toContain('nguồn');

      const v2 = mockReqRes({ body });
      await callHandler(socialConnectionControllerV2.reassignSocialAccount, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(403);
      expect(v2.res.json.mock.calls[0][0].message).toContain('nguồn');
    });

    it('v1 and v2 both reassign successfully when the caller has permission on both brands', async () => {
      brandRepository.findById.mockResolvedValue({ id: 'brand-target' });
      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue({ brandId: 'brand-source' });
      authorizationFacade.checkPermission.mockResolvedValue(true);
      connectionConflictGuard.reassignAccount.mockResolvedValue({ ok: true });

      const v1 = mockReqRes({ body });
      await callHandler(socialConnectionController.reassignSocialAccount, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, message: 'Social account reassigned successfully' });

      const v2 = mockReqRes({ body });
      await callHandler(socialConnectionControllerV2.reassignSocialAccount, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Social account reassigned successfully', data: null });
    });
  });
});
