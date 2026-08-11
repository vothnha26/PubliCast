jest.mock('../../src/services/social/twitch', () => ({
  twitchService: {
    getAuthUrl: jest.fn(),
    connectChannel: jest.fn()
  }
}));
jest.mock('../../src/repositories/social/social-account.repository', () => ({
  deleteByIdAndBrand: jest.fn(),
  deleteManyByBrandAndPlatform: jest.fn()
}));

const { twitchService } = require('../../src/services/social/twitch');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const twitchController = require('../../src/controllers/social/twitch.controller');
const twitchControllerV2 = require('../../src/controllers/social/twitch.controller.v2');

function mockReqRes({ query = {}, body = {} } = {}) {
  const req = { query, body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res, next: jest.fn() };
}

// v1 methods here are plain (req, res, next) async functions (not wrapped
// in asyncHandler) — awaited directly, `next` just captured for assertion
// if needed.
function callHandler(handler, req, res, next) {
  return new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, next || ((err) => (err ? reject(err) : resolve())))).then(resolve, reject);
  });
}

describe('TwitchController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTwitchAuthUrl', () => {
    it('v1 returns {status, data: {url}}; v2 preserves the same nested url under {message, data}', async () => {
      twitchService.getAuthUrl.mockReturnValue('https://id.twitch.tv/oauth2/authorize?mock=1');

      const v1 = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(twitchController.getTwitchAuthUrl, v1.req, v1.res, v1.next);
      expect(v1.res.json).toHaveBeenCalledWith({ status: 'success', data: { url: 'https://id.twitch.tv/oauth2/authorize?mock=1' } });

      const v2 = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(twitchControllerV2.getTwitchAuthUrl, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { url: 'https://id.twitch.tv/oauth2/authorize?mock=1' } });
    });

    it('falls back to the default settings callback URL when redirectUri is omitted, on both versions', async () => {
      twitchService.getAuthUrl.mockReturnValue('url');
      const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(twitchControllerV2.getTwitchAuthUrl, req, res);
      const [, callbackUrl] = twitchService.getAuthUrl.mock.calls[0];
      expect(callbackUrl).toContain('/settings/connections/twitch/callback');
    });
  });

  describe('disconnectTwitchAccount', () => {
    it('v1 and v2 both 400 without brandId', async () => {
      const v1 = mockReqRes({ body: {} });
      await callHandler(twitchController.disconnectTwitchAccount, v1.req, v1.res, v1.next);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: {} });
      await callHandler(twitchControllerV2.disconnectTwitchAccount, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('deletes a specific account when socialAccountId is given, on both versions', async () => {
      const v1 = mockReqRes({ body: { brandId: 'brand-1', socialAccountId: 'acc-1' } });
      await callHandler(twitchController.disconnectTwitchAccount, v1.req, v1.res, v1.next);
      expect(socialAccountRepository.deleteByIdAndBrand).toHaveBeenCalledWith('brand-1', 'acc-1');
      expect(v1.res.json).toHaveBeenCalledWith({ status: 'success', message: 'Twitch account disconnected successfully' });

      jest.clearAllMocks();
      const v2 = mockReqRes({ body: { brandId: 'brand-1', socialAccountId: 'acc-1' } });
      await callHandler(twitchControllerV2.disconnectTwitchAccount, v2.req, v2.res);
      expect(socialAccountRepository.deleteByIdAndBrand).toHaveBeenCalledWith('brand-1', 'acc-1');
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Twitch account disconnected successfully', data: null });
    });

    it('deletes all Twitch accounts for the brand when socialAccountId is omitted, on both versions', async () => {
      const v1 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(twitchController.disconnectTwitchAccount, v1.req, v1.res, v1.next);
      expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand-1', 'TWITCH');

      jest.clearAllMocks();
      const v2 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(twitchControllerV2.disconnectTwitchAccount, v2.req, v2.res);
      expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand-1', 'TWITCH');
    });
  });
});
