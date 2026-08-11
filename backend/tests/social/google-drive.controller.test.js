jest.mock('../../src/services/social/social.service', () => ({
  getGoogleDriveContext: jest.fn(),
  downloadDriveFile: jest.fn()
}));

const socialService = require('../../src/services/social/social.service');
const googleDriveController = require('../../src/controllers/social/google-drive.controller');
const googleDriveControllerV2 = require('../../src/controllers/social/google-drive.controller.v2');

function mockReqRes({ query = {}, body = {} } = {}) {
  const req = { query, body };
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

describe('GoogleDriveController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoogleDriveFiles', () => {
    it('v1 returns the service context directly (no envelope)', async () => {
      socialService.getGoogleDriveContext.mockResolvedValue({ files: [{ id: 'f1' }] });
      const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(googleDriveController.getGoogleDriveFiles, req, res);
      expect(res.json).toHaveBeenCalledWith({ files: [{ id: 'f1' }] });
    });

    it('v2 wraps the same context in {message, data}', async () => {
      socialService.getGoogleDriveContext.mockResolvedValue({ files: [{ id: 'f1' }] });
      const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(googleDriveControllerV2.getGoogleDriveFiles, req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success', data: { files: [{ id: 'f1' }] } });
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(googleDriveController.getGoogleDriveFiles, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(googleDriveControllerV2.getGoogleDriveFiles, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('downloadGoogleDriveFile', () => {
    it('v1 and v2 both return the same videoUrl', async () => {
      socialService.downloadDriveFile.mockResolvedValue('https://cdn.example.com/video.mp4');

      const v1 = mockReqRes({ body: { brandId: 'brand-1', fileId: 'file-1', fileName: 'clip.mp4' } });
      await callHandler(googleDriveController.downloadGoogleDriveFile, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ videoUrl: 'https://cdn.example.com/video.mp4' });

      const v2 = mockReqRes({ body: { brandId: 'brand-1', fileId: 'file-1', fileName: 'clip.mp4' } });
      await callHandler(googleDriveControllerV2.downloadGoogleDriveFile, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { videoUrl: 'https://cdn.example.com/video.mp4' } });
    });

    it('400s when any of brandId/fileId/fileName is missing, on both versions', async () => {
      const v1 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(googleDriveController.downloadGoogleDriveFile, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);
      expect(socialService.downloadDriveFile).not.toHaveBeenCalled();

      const v2 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(googleDriveControllerV2.downloadGoogleDriveFile, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
      expect(socialService.downloadDriveFile).not.toHaveBeenCalled();
    });
  });
});
