const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/social/tiktok', () => ({
  getPublishedVideos: jest.fn()
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'user-1' };
    next();
  }
}));

jest.mock('../../src/middlewares/permission.middleware', () => {
  const middleware = jest.fn(() => (req, res, next) => next());
  middleware.requireBrandMember = (req, res, next) => next();
  return middleware;
});

const tiktokService = require('../../src/services/social/tiktok');
const tiktokRoutesV2 = require('../../src/routes/social/tiktok.routes.v2');

describe('TikTok API v2 — response envelope', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v2/social/tiktok', tiktokRoutesV2);
  });

  it('wraps a raw (unwrapped in v1) service result as { message, data }', async () => {
    const rawResult = { videos: [{ id: 'tt1' }], nextPageToken: 'abc' };
    tiktokService.getPublishedVideos.mockResolvedValue(rawResult);

    const res = await request(app)
      .get('/api/v2/social/tiktok/published-videos')
      .query({ brandId: 'brand-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Success', data: rawResult });
  });

  it('still returns 400 with the plain error shape when brandId is missing (unchanged validation)', async () => {
    const res = await request(app).get('/api/v2/social/tiktok/published-videos');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'brandId is required' });
    expect(tiktokService.getPublishedVideos).not.toHaveBeenCalled();
  });
});
