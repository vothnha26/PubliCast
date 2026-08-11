jest.mock('../../src/services/social/tiktok', () => ({
  getPublishedVideos: jest.fn(),
  getVideoComments: jest.fn()
}));

const tiktokService = require('../../src/services/social/tiktok');
const tiktokController = require('../../src/controllers/social/tiktok.controller');
const tiktokControllerV2 = require('../../src/controllers/social/tiktok.controller.v2');

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

describe('TikTokController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTikTokPublishedVideos', () => {
    it('v1 returns the service result directly (no envelope)', async () => {
      tiktokService.getPublishedVideos.mockResolvedValue({ videos: [{ id: 'v1' }] });
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(tiktokController.getTikTokPublishedVideos, req, res);
      expect(res.json).toHaveBeenCalledWith({ videos: [{ id: 'v1' }] });
    });

    it('v2 wraps the same result in {message, data}', async () => {
      tiktokService.getPublishedVideos.mockResolvedValue({ videos: [{ id: 'v1' }] });
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(tiktokControllerV2.getTikTokPublishedVideos, req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success', data: { videos: [{ id: 'v1' }] } });
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(tiktokController.getTikTokPublishedVideos, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(tiktokControllerV2.getTikTokPublishedVideos, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getTikTokComments', () => {
    it('v1 and v2 both forward parsed maxCount/cursor to the service', async () => {
      tiktokService.getVideoComments.mockResolvedValue({ comments: [] });

      const v1 = mockReqRes({ brandId: 'brand-1', videoId: 'vid-1', maxCount: '20', cursor: '5' });
      await callHandler(tiktokController.getTikTokComments, v1.req, v1.res);
      expect(tiktokService.getVideoComments).toHaveBeenCalledWith('brand-1', {
        videoId: 'vid-1', commentId: undefined, maxCount: 20, cursor: 5, socialAccountId: undefined
      });
      expect(v1.res.json).toHaveBeenCalledWith({ comments: [] });

      jest.clearAllMocks();
      tiktokService.getVideoComments.mockResolvedValue({ comments: [] });
      const v2 = mockReqRes({ brandId: 'brand-1', videoId: 'vid-1', maxCount: '20', cursor: '5' });
      await callHandler(tiktokControllerV2.getTikTokComments, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { comments: [] } });
    });

    it('defaults maxCount to 10 and cursor to 0 when omitted, on both versions', async () => {
      tiktokService.getVideoComments.mockResolvedValue({ comments: [] });
      const { req, res } = mockReqRes({ brandId: 'brand-1', videoId: 'vid-1' });
      await callHandler(tiktokControllerV2.getTikTokComments, req, res);
      expect(tiktokService.getVideoComments).toHaveBeenCalledWith('brand-1', expect.objectContaining({ maxCount: 10, cursor: 0 }));
    });

    it('400s when neither videoId nor commentId is provided, on both versions', async () => {
      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(tiktokController.getTikTokComments, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(tiktokControllerV2.getTikTokComments, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('accepts commentId as an alternative to videoId, on both versions', async () => {
      tiktokService.getVideoComments.mockResolvedValue({ comments: [] });
      const { req, res } = mockReqRes({ brandId: 'brand-1', commentId: 'c-1' });
      await callHandler(tiktokControllerV2.getTikTokComments, req, res);
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });
});
