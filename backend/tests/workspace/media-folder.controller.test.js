jest.mock('../../src/services/workspace/media-folder.service', () => ({
  createFolder: jest.fn(),
  getFolders: jest.fn(),
  updateFolder: jest.fn(),
  deleteFolder: jest.fn()
}));

const mediaFolderService = require('../../src/services/workspace/media-folder.service');
const mediaFolderController = require('../../src/controllers/workspace/media-folder.controller');
const mediaFolderControllerV2 = require('../../src/controllers/workspace/media-folder.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {} } = {}) {
  const req = { params, query, body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('MediaFolderController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('createFolder: 400s without name/brandId; both return 201 with the folder otherwise', async () => {
    const v1a = mockReqRes({ body: {} });
    await callHandler(mediaFolderController.createFolder, v1a.req, v1a.res);
    expect(v1a.res.status).toHaveBeenCalledWith(400);

    mediaFolderService.createFolder.mockResolvedValue({ id: 'f1', name: 'Ads' });
    const v2 = mockReqRes({ body: { name: 'Ads', brandId: 'b1' } });
    await callHandler(mediaFolderControllerV2.createFolder, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Folder created successfully', data: { id: 'f1', name: 'Ads' } });
  });

  it('getFolders: both return the same list', async () => {
    mediaFolderService.getFolders.mockResolvedValue([{ id: 'f1' }]);

    const v1 = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(mediaFolderController.getFolders, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Folders retrieved successfully', data: [{ id: 'f1' }] });

    const v2 = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(mediaFolderControllerV2.getFolders, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Folders retrieved successfully', data: [{ id: 'f1' }] });
  });

  it('deleteFolder: v2 returns data: null', async () => {
    mediaFolderService.deleteFolder.mockResolvedValue(undefined);

    const v2 = mockReqRes({ params: { id: 'f1' }, body: { brandId: 'b1' } });
    await callHandler(mediaFolderControllerV2.deleteFolder, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Folder deleted successfully', data: null });
  });
});
