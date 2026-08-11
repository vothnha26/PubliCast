jest.mock('../../src/services/workspace/media-library.service', () => ({
  getMediaFiles: jest.fn(),
  uploadFile: jest.fn(),
  deleteMedia: jest.fn(),
  saveDirectMedia: jest.fn(),
  renameMedia: jest.fn()
}));

const mediaLibraryService = require('../../src/services/workspace/media-library.service');
const mediaLibraryController = require('../../src/controllers/workspace/media-library.controller');
const mediaLibraryControllerV2 = require('../../src/controllers/workspace/media-library.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, file, user = { id: 'user-1' } } = {}) {
  const req = { params, query, body, file, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('MediaLibraryController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMediaFiles', () => {
    it('400s without brandId; both keep the flat {message, data, meta} shape otherwise', async () => {
      const v1a = mockReqRes({ query: {} });
      await callHandler(mediaLibraryController.getMediaFiles, v1a.req, v1a.res);
      expect(v1a.res.status).toHaveBeenCalledWith(400);

      mediaLibraryService.getMediaFiles.mockResolvedValue({ data: [{ id: 'm1' }], meta: { total: 1 } });

      const v1 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(mediaLibraryController.getMediaFiles, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Media files retrieved successfully', data: [{ id: 'm1' }], meta: { total: 1 } });

      const v2 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(mediaLibraryControllerV2.getMediaFiles, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Media files retrieved successfully', data: [{ id: 'm1' }], meta: { total: 1 } });
    });
  });

  describe('uploadMedia', () => {
    it('400s without a file, on both versions', async () => {
      const v1 = mockReqRes({ body: { brandId: 'b1' }, file: undefined });
      await callHandler(mediaLibraryController.uploadMedia, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: { brandId: 'b1' }, file: undefined });
      await callHandler(mediaLibraryControllerV2.uploadMedia, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('uploads and returns 201, on both versions', async () => {
      mediaLibraryService.uploadFile.mockResolvedValue({ id: 'm1' });

      const v2 = mockReqRes({ body: { brandId: 'b1' }, file: { buffer: Buffer.from('x') } });
      await callHandler(mediaLibraryControllerV2.uploadMedia, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'File uploaded successfully', data: { id: 'm1' } });
    });
  });

  describe('saveDirectMedia', () => {
    it('message reflects saveToLibrary flag identically on both versions', async () => {
      mediaLibraryService.saveDirectMedia.mockResolvedValue({ id: 'm1' });

      const v1 = mockReqRes({ body: { brandId: 'b1', fileInfo: {}, saveToLibrary: false } });
      await callHandler(mediaLibraryController.saveDirectMedia, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Media uploaded successfully', data: { id: 'm1' } });

      const v2 = mockReqRes({ body: { brandId: 'b1', fileInfo: {}, saveToLibrary: false } });
      await callHandler(mediaLibraryControllerV2.saveDirectMedia, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Media uploaded successfully', data: { id: 'm1' } });
    });
  });
});
