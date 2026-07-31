const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/social/youtube', () => ({
  getPublishedVideos: jest.fn(),
  getVideoInsights: jest.fn(),
  getTrackedVideos: jest.fn()
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

const youtubeService = require('../../src/services/social/youtube');
const youtubeRoutesV2 = require('../../src/routes/social/youtube.routes.v2');

describe('YouTube API v2 — response envelope', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v2/social/youtube', youtubeRoutesV2);
  });

  it('wraps a raw (unwrapped in v1) service result as { message, data }', async () => {
    const rawResult = { videos: [{ id: 'v1' }], nextPageToken: 'abc', prevPageToken: null };
    youtubeService.getPublishedVideos.mockResolvedValue(rawResult);

    const res = await request(app)
      .get('/api/v2/social/youtube/published-videos')
      .query({ brandId: 'brand-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Success', data: rawResult });
  });

  it('wraps getVideoInsights (also raw in v1) as { message, data }', async () => {
    const rawResult = { views: 100, likes: 10 };
    youtubeService.getVideoInsights.mockResolvedValue(rawResult);

    const res = await request(app)
      .get('/api/v2/social/youtube/video-insights')
      .query({ brandId: 'brand-1', videoId: 'video-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Success', data: rawResult });
  });

  it('still returns the { message, data } shape for an already-wrapped v1 endpoint', async () => {
    const videos = [{ id: 'tracked-1' }];
    youtubeService.getTrackedVideos.mockResolvedValue(videos);

    const res = await request(app)
      .get('/api/v2/social/youtube/tracked-videos')
      .query({ brandId: 'brand-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Success', data: videos });
  });
});
