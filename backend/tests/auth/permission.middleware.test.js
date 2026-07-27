const request = require('supertest');
const express = require('express');
const checkPermission = require('../../src/middlewares/permission.middleware');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

jest.mock('../../src/services/auth/authorization.facade');

describe('Permission Middleware Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
  });

  it('should return 400 if brandId is missing', async () => {
    app.use((req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    app.get('/test', checkPermission('CREATE_POSTS'), (req, res) => {
      res.status(200).json({ success: true });
    });

    const response = await request(app).get('/test');
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Không tìm thấy thông tin thương hiệu');
  });

  it('should return 401 if user is not authenticated', async () => {
    app.get('/test', checkPermission('CREATE_POSTS'), (req, res) => {
      res.status(200).json({ success: true });
    });

    const response = await request(app).get('/test?brandId=test-brand-id');
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Không thể xác thực danh tính người dùng');
  });

  it('should return 403 if user lacks permission', async () => {
    app.use((req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    authorizationFacade.checkPermission.mockResolvedValue(false);

    app.get('/test', checkPermission('CREATE_POSTS'), (req, res) => {
      res.status(200).json({ success: true });
    });

    const response = await request(app).get('/test?brandId=test-brand-id');
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Bạn không có quyền thực hiện thao tác này');
    expect(authorizationFacade.checkPermission).toHaveBeenCalledWith('test-user-id', 'test-brand-id', 'CREATE_POSTS');
  });

  it('should call next() and proceed if user has permission', async () => {
    app.use((req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    authorizationFacade.checkPermission.mockResolvedValue(true);

    app.get('/test', checkPermission('CREATE_POSTS'), (req, res) => {
      res.status(200).json({ success: true });
    });

    const response = await request(app).get('/test?brandId=test-brand-id');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(authorizationFacade.checkPermission).toHaveBeenCalledWith('test-user-id', 'test-brand-id', 'CREATE_POSTS');
  });
});
