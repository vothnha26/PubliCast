const crypto = require('crypto');

jest.mock('../../src/services/social/bluesky', () => ({
  blueskyService: {
    getPostComments: jest.fn(),
    getPublishedVideos: jest.fn()
  }
}));
jest.mock('../../src/services/social/bluesky/bluesky-oauth.helper', () => ({
  generateES256KeyPair: jest.fn(),
  sendPARRequest: jest.fn()
}));
jest.mock('../../src/config/redis', () => ({
  setEx: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn()
}));
jest.mock('../../src/services/core/notification.service', () => ({}));

const { blueskyService } = require('../../src/services/social/bluesky');
const blueskyOAuthHelper = require('../../src/services/social/bluesky/bluesky-oauth.helper');
const blueskyController = require('../../src/controllers/social/bluesky.controller');
const blueskyControllerV2 = require('../../src/controllers/social/bluesky.controller.v2');

function mockReqRes(query = {}) {
  const req = { query, protocol: 'https', get: () => 'api.publicast.test' };
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

function realKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { privateKey, publicKey, jwk: publicKey.export({ format: 'jwk' }) };
}

describe('BlueskyController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBlueskyAuthUrl', () => {
    it('v1 and v2 both return the PAR-flow auth URL on success', async () => {
      blueskyOAuthHelper.generateES256KeyPair.mockReturnValue(realKeyPair());
      blueskyOAuthHelper.sendPARRequest.mockResolvedValue({ requestUri: 'urn:par:abc123' });

      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyController.getBlueskyAuthUrl, v1.req, v1.res);
      const v1Url = v1.res.json.mock.calls[0][0].url;
      expect(v1Url).toContain('request_uri=');
      expect(v1Url).toContain(encodeURIComponent('urn:par:abc123'));

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyControllerV2.getBlueskyAuthUrl, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { url: v1Url } });
    });

    it('v1 and v2 both fall back to a direct authorize URL when the PAR request fails', async () => {
      blueskyOAuthHelper.generateES256KeyPair.mockReturnValue(realKeyPair());
      blueskyOAuthHelper.sendPARRequest.mockRejectedValue(new Error('PAR endpoint unreachable'));

      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyController.getBlueskyAuthUrl, v1.req, v1.res);
      const v1Url = v1.res.json.mock.calls[0][0].url;
      expect(v1Url).toContain('response_type=code');
      expect(v1Url).toContain('code_challenge_method=S256');

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyControllerV2.getBlueskyAuthUrl, v2.req, v2.res);
      const v2Url = v2.res.json.mock.calls[0][0].data.url;
      expect(v2Url).toContain('response_type=code');
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(blueskyController.getBlueskyAuthUrl, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(blueskyControllerV2.getBlueskyAuthUrl, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getBlueskyComments', () => {
    it('v1 returns the service result directly (no envelope)', async () => {
      blueskyService.getPostComments.mockResolvedValue({ thread: [] });
      const { req, res } = mockReqRes({ brandId: 'brand-1', uri: 'at://post/1' });
      await callHandler(blueskyController.getBlueskyComments, req, res);
      expect(res.json).toHaveBeenCalledWith({ thread: [] });
    });

    it('v2 wraps the same result in {message, data}', async () => {
      blueskyService.getPostComments.mockResolvedValue({ thread: [] });
      const { req, res } = mockReqRes({ brandId: 'brand-1', uri: 'at://post/1' });
      await callHandler(blueskyControllerV2.getBlueskyComments, req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success', data: { thread: [] } });
    });

    it('400s without uri, on both versions', async () => {
      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyController.getBlueskyComments, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyControllerV2.getBlueskyComments, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getBlueskyPublishedPosts', () => {
    it('v1 returns the service result directly; v2 wraps it', async () => {
      blueskyService.getPublishedVideos.mockResolvedValue({ data: [{ id: 'b1' }] });

      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyController.getBlueskyPublishedPosts, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ data: [{ id: 'b1' }] });

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(blueskyControllerV2.getBlueskyPublishedPosts, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { data: [{ id: 'b1' }] } });
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(blueskyController.getBlueskyPublishedPosts, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(blueskyControllerV2.getBlueskyPublishedPosts, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });
});
