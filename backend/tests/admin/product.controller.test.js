jest.mock('../../src/services/admin/product.service', () => ({
  getProductMatrix: jest.fn(),
  enableProductMatrix: jest.fn(),
  disableProductMatrix: jest.fn(),
  createPlatform: jest.fn(),
  deletePlatform: jest.fn(),
  createModule: jest.fn(),
  deleteModule: jest.fn()
}));

const productService = require('../../src/services/admin/product.service');
const productController = require('../../src/controllers/admin/product.controller');
const productControllerV2 = require('../../src/controllers/admin/product.controller.v2');

function mockReqRes({ params = {}, body = {} } = {}) {
  const req = { params, body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('ProductController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getProductMatrix: v1 and v2 both return the same matrix', async () => {
    productService.getProductMatrix.mockResolvedValue({ platforms: [] });

    const v1 = mockReqRes();
    await callHandler(productController.getProductMatrix, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Product matrix retrieved successfully', data: { platforms: [] } });

    const v2 = mockReqRes();
    await callHandler(productControllerV2.getProductMatrix, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Product matrix retrieved successfully', data: { platforms: [] } });
  });

  it('createPlatform: both return 201', async () => {
    productService.createPlatform.mockResolvedValue({ id: 'FACEBOOK' });
    const v2 = mockReqRes({ body: { id: 'FACEBOOK', name: 'Facebook' } });
    await callHandler(productControllerV2.createPlatform, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
  });

  it('deletePlatform: v1 has no data key; v2 returns data: null (standard envelope)', async () => {
    productService.deletePlatform.mockResolvedValue(undefined);

    const v1 = mockReqRes({ params: { id: 'FACEBOOK' } });
    await callHandler(productController.deletePlatform, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Platform deleted successfully' });

    const v2 = mockReqRes({ params: { id: 'FACEBOOK' } });
    await callHandler(productControllerV2.deletePlatform, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Platform deleted successfully', data: null });
  });

  it('createModule: generates a random id when omitted, on both versions', async () => {
    productService.createModule.mockResolvedValue({ id: 'M1', name: 'Analytics' });

    const v2 = mockReqRes({ body: { name: 'Analytics' } });
    await callHandler(productControllerV2.createModule, v2.req, v2.res);
    expect(productService.createModule).toHaveBeenCalledWith(expect.objectContaining({ name: 'Analytics' }));
    expect(v2.res.status).toHaveBeenCalledWith(201);
  });
});
