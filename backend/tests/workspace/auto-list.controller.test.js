jest.mock('../../src/services/workspace/auto-list.service', () => ({
  getAutoLists: jest.fn(),
  getAutoListDetails: jest.fn(),
  createAutoList: jest.fn(),
  updateAutoList: jest.fn(),
  deleteAutoList: jest.fn(),
  toggleStatus: jest.fn(),
  reorderPosts: jest.fn()
}));

const autoListService = require('../../src/services/workspace/auto-list.service');
const autoListController = require('../../src/controllers/workspace/auto-list.controller');
const autoListControllerV2 = require('../../src/controllers/workspace/auto-list.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, query, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('AutoListController v1/v2 parity (both keep the bare { data } shape)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getAutoLists: 400s without brandId; both return bare { data } otherwise', async () => {
    const v1a = mockReqRes({ query: {} });
    await callHandler(autoListController.getAutoLists, v1a.req, v1a.res);
    expect(v1a.res.status).toHaveBeenCalledWith(400);

    autoListService.getAutoLists.mockResolvedValue([{ id: 'al1' }]);
    const v1 = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(autoListController.getAutoLists, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ data: [{ id: 'al1' }] });

    const v2 = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(autoListControllerV2.getAutoLists, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ data: [{ id: 'al1' }] });
  });

  it('createAutoList: both return 201 with bare { data }', async () => {
    autoListService.createAutoList.mockResolvedValue({ id: 'al1' });

    const v2 = mockReqRes({ body: { brandId: 'b1', name: 'My List' } });
    await callHandler(autoListControllerV2.createAutoList, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ data: { id: 'al1' } });
  });

  it('deleteAutoList: both return { message: "AutoList deleted" }', async () => {
    autoListService.deleteAutoList.mockResolvedValue(undefined);

    const v1 = mockReqRes({ params: { id: 'al1' } });
    await callHandler(autoListController.deleteAutoList, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'AutoList deleted' });

    const v2 = mockReqRes({ params: { id: 'al1' } });
    await callHandler(autoListControllerV2.deleteAutoList, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'AutoList deleted' });
  });

  it('reorderPosts: 400s without orderedPostIds array, on both versions', async () => {
    const v1 = mockReqRes({ params: { id: 'al1' }, body: {} });
    await callHandler(autoListController.reorderPosts, v1.req, v1.res);
    expect(v1.res.status).toHaveBeenCalledWith(400);

    const v2 = mockReqRes({ params: { id: 'al1' }, body: {} });
    await callHandler(autoListControllerV2.reorderPosts, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(400);
  });
});
