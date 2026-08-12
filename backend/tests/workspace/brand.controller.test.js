jest.mock('../../src/services/workspace/brand.service', () => ({
  getUserBrands: jest.fn(),
  getFullBrand: jest.fn(),
  createBrand: jest.fn(),
  updateBrand: jest.fn(),
  deleteBrand: jest.fn()
}));

const brandService = require('../../src/services/workspace/brand.service');
const brandController = require('../../src/controllers/workspace/brand.controller');
const brandControllerV2 = require('../../src/controllers/workspace/brand.controller.v2');

function mockReqRes({ params = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, body, user };
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

describe('BrandController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getBrands: v1 and v2 both return the same brands list', async () => {
    brandService.getUserBrands.mockResolvedValue([{ id: 'b1', name: 'Acme', socialAccounts: [] }]);

    const v1 = mockReqRes();
    await callHandler(brandController.getBrands, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Brands retrieved successfully', data: [{ id: 'b1', name: 'Acme', socialAccounts: [] }] });

    const v2 = mockReqRes();
    await callHandler(brandControllerV2.getBrands, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Brands retrieved successfully', data: [{ id: 'b1', name: 'Acme', socialAccounts: [] }] });
  });

  describe('getBrandById', () => {
    it('v2 returns full brand detail for the given id', async () => {
      brandService.getFullBrand.mockResolvedValue({ id: 'b1', name: 'Acme', socialAccounts: [{ id: 'sa1', accessToken: 'x' }] });

      const v2 = mockReqRes({ params: { id: 'b1' } });
      await callHandler(brandControllerV2.getBrandById, v2.req, v2.res);
      expect(brandService.getFullBrand).toHaveBeenCalledWith('b1', 'user-1');
      expect(v2.res.json).toHaveBeenCalledWith({
        message: 'Brand retrieved successfully',
        data: { id: 'b1', name: 'Acme', socialAccounts: [{ id: 'sa1', accessToken: 'x' }] }
      });
    });
  });

  describe('createBrand', () => {
    it('400s when name is missing or blank, on both versions', async () => {
      const v1 = mockReqRes({ body: { name: '  ' } });
      await callHandler(brandController.createBrand, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: { name: '  ' } });
      await callHandler(brandControllerV2.createBrand, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('creates and returns 201 with the brand, on both versions', async () => {
      brandService.createBrand.mockResolvedValue({ id: 'b1', name: 'Acme' });

      const v2 = mockReqRes({ body: { name: 'Acme' } });
      await callHandler(brandControllerV2.createBrand, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Brand created successfully', data: { id: 'b1', name: 'Acme' } });
    });
  });

  describe('deleteBrand', () => {
    it('v1 omits data; v2 returns data: null (standard envelope)', async () => {
      brandService.deleteBrand.mockResolvedValue(undefined);

      const v1 = mockReqRes({ params: { id: 'b1' } });
      await callHandler(brandController.deleteBrand, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Brand deleted successfully' });

      const v2 = mockReqRes({ params: { id: 'b1' } });
      await callHandler(brandControllerV2.deleteBrand, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Brand deleted successfully', data: null });
    });
  });
});
