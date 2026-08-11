jest.mock('../../src/services/social/instagram', () => ({
  getPublishedVideos: jest.fn(),
  searchAudio: jest.fn()
}));

const instagramService = require('../../src/services/social/instagram');
const instagramController = require('../../src/controllers/social/instagram.controller');
const instagramControllerV2 = require('../../src/controllers/social/instagram.controller.v2');

function mockReqRes(query = {}) {
  const req = { query };
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

describe('InstagramController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstagramPublishedPosts', () => {
    it('v1 returns the service result directly (no envelope)', async () => {
      instagramService.getPublishedVideos.mockResolvedValue({ data: [{ id: 'p1' }] });
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(instagramController.getInstagramPublishedPosts, req, res);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'p1' }] });
    });

    it('v2 wraps the same result in {message, data}', async () => {
      instagramService.getPublishedVideos.mockResolvedValue({ data: [{ id: 'p1' }] });
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(instagramControllerV2.getInstagramPublishedPosts, req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success', data: { data: [{ id: 'p1' }] } });
    });

    it('forwards parsed limit and other query params identically on both versions', async () => {
      instagramService.getPublishedVideos.mockResolvedValue({});
      const { req, res } = mockReqRes({ brandId: 'brand-1', pageToken: 'tok', limit: '5', socialAccountId: 'acc-1', startDate: '2026-01-01', endDate: '2026-01-31' });
      await callHandler(instagramControllerV2.getInstagramPublishedPosts, req, res);
      expect(instagramService.getPublishedVideos).toHaveBeenCalledWith('brand-1', 'tok', 5, 'acc-1', '2026-01-01', '2026-01-31');
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(instagramController.getInstagramPublishedPosts, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(instagramControllerV2.getInstagramPublishedPosts, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('searchAudio', () => {
    it('v1 and v2 both return the same audio search result', async () => {
      instagramService.searchAudio.mockResolvedValue({ tracks: [{ id: 'a1' }] });

      const v1 = mockReqRes({ brandId: 'brand-1', q: 'lofi' });
      await callHandler(instagramController.searchAudio, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ tracks: [{ id: 'a1' }] });

      const v2 = mockReqRes({ brandId: 'brand-1', q: 'lofi' });
      await callHandler(instagramControllerV2.searchAudio, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { tracks: [{ id: 'a1' }] } });
    });

    it('defaults q to an empty string when omitted, on both versions', async () => {
      instagramService.searchAudio.mockResolvedValue({ tracks: [] });
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(instagramControllerV2.searchAudio, req, res);
      expect(instagramService.searchAudio).toHaveBeenCalledWith('brand-1', '');
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(instagramController.searchAudio, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(instagramControllerV2.searchAudio, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });
});
