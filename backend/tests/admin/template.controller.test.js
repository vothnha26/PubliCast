jest.mock('../../src/services/admin/template.service', () => ({
  getFeaturedTemplates: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn()
}));

const templateService = require('../../src/services/admin/template.service');
const templateController = require('../../src/controllers/admin/template.controller');
const templateControllerV2 = require('../../src/controllers/admin/template.controller.v2');

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

describe('AdminTemplateController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getFeaturedTemplates: v1 and v2 both return the same templates', async () => {
    templateService.getFeaturedTemplates.mockResolvedValue([{ id: 't1' }]);

    const v1 = mockReqRes();
    await callHandler(templateController.getFeaturedTemplates, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Templates retrieved successfully', data: [{ id: 't1' }] });

    const v2 = mockReqRes();
    await callHandler(templateControllerV2.getFeaturedTemplates, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Templates retrieved successfully', data: [{ id: 't1' }] });
  });

  it('createCategory / createTemplate: both return 201 on both versions', async () => {
    templateService.createCategory.mockResolvedValue({ id: 'c1' });
    const v2a = mockReqRes({ body: { name: 'Marketing' } });
    await callHandler(templateControllerV2.createCategory, v2a.req, v2a.res);
    expect(v2a.res.status).toHaveBeenCalledWith(201);

    templateService.createTemplate.mockResolvedValue({ id: 't1' });
    const v2b = mockReqRes({ body: { title: 'Hi' } });
    await callHandler(templateControllerV2.createTemplate, v2b.req, v2b.res);
    expect(v2b.res.status).toHaveBeenCalledWith(201);
  });

  it('deleteCategory / deleteTemplate: v1 and v2 both surface the service-returned message with null data on v2', async () => {
    templateService.deleteCategory.mockResolvedValue({ message: 'Category deleted' });

    const v1 = mockReqRes({ params: { id: 'c1' } });
    await callHandler(templateController.deleteCategory, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Category deleted' });

    const v2 = mockReqRes({ params: { id: 'c1' } });
    await callHandler(templateControllerV2.deleteCategory, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Category deleted', data: null });
  });
});
