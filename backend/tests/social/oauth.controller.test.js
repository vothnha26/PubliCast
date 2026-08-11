jest.mock('../../src/services/social/google-oauth.service', () => ({
  getAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=1')
}));
jest.mock('../../src/services/social/google-drive-oauth.service', () => ({
  getAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?drive=1')
}));
jest.mock('../../src/services/social/youtube', () => ({}));
jest.mock('../../src/services/social/facebook', () => ({}));
jest.mock('../../src/services/social/tiktok', () => ({}));
jest.mock('../../src/services/social/instagram', () => ({}));
jest.mock('../../src/services/social/tiktok/tiktok.gateway', () => ({
  getAuthUrl: jest.fn().mockReturnValue('https://www.tiktok.com/auth/authorize?mock=1')
}));
jest.mock('../../src/services/social/threads/threads.gateway', () => ({
  getAuthUrl: jest.fn().mockReturnValue('https://threads.net/oauth/authorize?mock=1')
}));
jest.mock('../../src/services/core/notification.service', () => ({}));
jest.mock('../../src/config/redis', () => ({
  setEx: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn()
}));

const googleOAuthService = require('../../src/services/social/google-oauth.service');
const googleDriveOAuthService = require('../../src/services/social/google-drive-oauth.service');
const tiktokGateway = require('../../src/services/social/tiktok/tiktok.gateway');
const threadsGateway = require('../../src/services/social/threads/threads.gateway');
const redisClient = require('../../src/config/redis');
const oauthController = require('../../src/controllers/social/oauth.controller');
const oauthControllerV2 = require('../../src/controllers/social/oauth.controller.v2');

function mockReqRes(query = {}) {
  const req = { query, protocol: 'https', get: () => 'api.publicast.test' };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

// asyncHandler (src/utils/async-handler.js) is Express middleware shape —
// (req, res, next) => void — it fires the async handler and returns
// immediately rather than returning a Promise the caller can await; the
// handler's own res.json()/res.status() calls land on a later microtask.
// Calling through asyncHandler in a test needs a next() to await instead.
function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    // No error path taken (the controllers here always res.json/res.status
    // instead of calling next(err)) — resolve once microtasks flush.
    setImmediate(resolve);
  });
}

describe('OAuthController v1/v2 parity (auth-URL endpoints)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoogleAuthUrl', () => {
    it('v1 returns { url } directly', async () => {
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getGoogleAuthUrl, req, res);
      expect(res.json).toHaveBeenCalledWith({ url: 'https://accounts.google.com/o/oauth2/auth?mock=1' });
    });

    it('v2 wraps the same URL in the {message, data} envelope', async () => {
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthControllerV2.getGoogleAuthUrl, req, res);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Success',
        data: { url: 'https://accounts.google.com/o/oauth2/auth?mock=1' }
      });
    });

    it('400s without a brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(oauthController.getGoogleAuthUrl, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(oauthControllerV2.getGoogleAuthUrl, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('forwards the correct redirect URI to the underlying service', async () => {
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getGoogleAuthUrl, req, res);
      const [, , redirectUri] = googleOAuthService.getAuthUrl.mock.calls[0];
      expect(redirectUri).toBe('https://api.publicast.test/api/social/google/callback');
    });
  });

  describe('getGoogleDriveAuthUrl', () => {
    it('v1 and v2 return the same URL from googleDriveOAuthService', async () => {
      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getGoogleDriveAuthUrl, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ url: 'https://accounts.google.com/o/oauth2/auth?drive=1' });

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthControllerV2.getGoogleDriveAuthUrl, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({
        message: 'Success',
        data: { url: 'https://accounts.google.com/o/oauth2/auth?drive=1' }
      });
    });
  });

  describe('getFacebookAuthUrl', () => {
    it('v1 and v2 both build a facebook.com dialog URL containing the brand state', async () => {
      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getFacebookAuthUrl, v1.req, v1.res);
      const v1Url = v1.res.json.mock.calls[0][0].url;
      expect(v1Url).toContain('facebook.com');
      expect(v1Url).toContain('state=facebook:brand-1');

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthControllerV2.getFacebookAuthUrl, v2.req, v2.res);
      expect(v2.res.json.mock.calls[0][0].data.url).toBe(v1Url);
    });
  });

  describe('getInstagramAuthUrl', () => {
    it('reuses the Facebook callback redirect URI (App Console whitelist constraint) and matches v1/v2', async () => {
      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getInstagramAuthUrl, v1.req, v1.res);
      const v1Url = v1.res.json.mock.calls[0][0].url;
      expect(v1Url).toContain(encodeURIComponent('https://api.publicast.test/api/social/facebook/callback'));
      expect(v1Url).toContain('state=instagram:brand-1');

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthControllerV2.getInstagramAuthUrl, v2.req, v2.res);
      expect(v2.res.json.mock.calls[0][0].data.url).toBe(v1Url);
    });
  });

  describe('getTikTokAuthUrl', () => {
    it('v1 stores the PKCE code verifier in Redis and returns the gateway URL', async () => {
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getTikTokAuthUrl, req, res);

      expect(redisClient.setEx).toHaveBeenCalledWith('tiktok_oauth_verifier:brand-1', 600, expect.any(String));
      expect(res.json).toHaveBeenCalledWith({ url: 'https://www.tiktok.com/auth/authorize?mock=1' });
    });

    it('v2 also stores the verifier (once) and wraps the same URL', async () => {
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthControllerV2.getTikTokAuthUrl, req, res);

      expect(redisClient.setEx).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Success',
        data: { url: 'https://www.tiktok.com/auth/authorize?mock=1' }
      });
    });

    it('passes a distinct code_challenge derived from a fresh code_verifier on each call', async () => {
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getTikTokAuthUrl, req, res);
      const [, , , codeChallenge1] = tiktokGateway.getAuthUrl.mock.calls[0];

      jest.clearAllMocks();
      const { req: req2, res: res2 } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getTikTokAuthUrl, req2, res2);
      const [, , , codeChallenge2] = tiktokGateway.getAuthUrl.mock.calls[0];

      expect(codeChallenge1).not.toBe(codeChallenge2);
    });
  });

  describe('getThreadsAuthUrl', () => {
    it('v1 and v2 both return the threads gateway URL for the same redirect URI', async () => {
      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthController.getThreadsAuthUrl, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ url: 'https://threads.net/oauth/authorize?mock=1' });
      expect(threadsGateway.getAuthUrl).toHaveBeenCalledWith('brand-1', 'https://api.publicast.test/api/social/threads/callback');

      jest.clearAllMocks();
      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(oauthControllerV2.getThreadsAuthUrl, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({
        message: 'Success',
        data: { url: 'https://threads.net/oauth/authorize?mock=1' }
      });
    });
  });
});
