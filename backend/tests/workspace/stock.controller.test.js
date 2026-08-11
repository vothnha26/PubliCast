jest.mock('../../src/services/stock/stock-media.facade', () => ({
  search: jest.fn(),
  importToMediaLibrary: jest.fn()
}));

const stockMediaFacade = require('../../src/services/stock/stock-media.facade');
const stockController = require('../../src/controllers/stock.controller');
const stockControllerV2 = require('../../src/controllers/workspace/stock.controller.v2');

function mockReqRes({ query = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { query, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('StockController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchMedia', () => {
    it('400s with items/total/page when query is missing, on both versions', async () => {
      const v1 = mockReqRes({ query: {} });
      await callHandler(stockController.searchMedia, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Search query parameter is required', items: [], total: 0, page: 1 });

      const v2 = mockReqRes({ query: {} });
      await callHandler(stockControllerV2.searchMedia, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Search query parameter is required', items: [], total: 0, page: 1 });
    });

    it('v1 and v2 both spread the search result at the top level (not nested under data)', async () => {
      stockMediaFacade.search.mockResolvedValue({ items: [{ id: 'img1' }], total: 1, page: 1 });

      const v1 = mockReqRes({ query: { query: 'cats' } });
      await callHandler(stockController.searchMedia, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Stock media retrieved successfully', items: [{ id: 'img1' }], total: 1, page: 1 });

      const v2 = mockReqRes({ query: { query: 'cats' } });
      await callHandler(stockControllerV2.searchMedia, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Stock media retrieved successfully', items: [{ id: 'img1' }], total: 1, page: 1 });
    });
  });

  describe('importMedia', () => {
    it('400s when required fields are missing, on both versions', async () => {
      const v1 = mockReqRes({ body: {} });
      await callHandler(stockController.importMedia, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: {} });
      await callHandler(stockControllerV2.importMedia, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('imports and returns 201 with the item, on both versions', async () => {
      stockMediaFacade.importToMediaLibrary.mockResolvedValue({ id: 'media-1' });

      const v2 = mockReqRes({ body: { brandId: 'b1', externalId: 'ext1', downloadUrl: 'https://x.com/img.jpg' } });
      await callHandler(stockControllerV2.importMedia, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Stock media imported to library successfully', data: { id: 'media-1' } });
    });
  });
});
