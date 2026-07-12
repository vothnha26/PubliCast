const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock middlewares before loading routes
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'mock-user-id' };
    next();
  }
}));

jest.mock('../../src/middlewares/permission.middleware', () => {
  return () => (req, res, next) => next();
});

jest.mock('../../src/services/workspace/video/video-processor.facade', () => ({
  processVideo: jest.fn().mockResolvedValue('/uploads/media/trimmed-mock.mp4'),
  _resolveFile: jest.fn().mockResolvedValue()
}));

const mockTranscribe = jest.fn().mockResolvedValue([
  { start: 0.5, end: 3.2, text: "Welcome to PubliCast! 🚀" }
]);

jest.mock('../../src/services/workspace/ai/transcription/transcription-strategy.factory', () => ({
  getStrategy: () => ({
    transcribe: mockTranscribe
  })
}));

const postRoutes = require('../../src/routes/workspace/post.routes');

describe('Video Editor API Integration Tests (MockMvc Equivalent)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/posts', postRoutes);
  });

  it('POST /api/posts/trim should return 200 and trimmed video URL', async () => {
    const res = await request(app)
      .post('/api/posts/trim')
      .send({
        videoUrl: '/uploads/media/original.mp4',
        startTime: 2,
        endTime: 7,
        brandId: 'brand_123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('videoUrl');
    expect(res.body.videoUrl).toBe('/uploads/media/trimmed-mock.mp4');
  });

  it('POST /api/posts/transcribe should return 200 and transcription subtitles', async () => {
    const res = await request(app)
      .post('/api/posts/transcribe')
      .send({
        videoUrl: '/uploads/media/original.mp4',
        brandId: 'brand_123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('subtitles');
    expect(res.body.subtitles).toBeInstanceOf(Array);
    expect(res.body.subtitles[0].text).toBe("Welcome to PubliCast! 🚀");
  });

  it('GET /api/posts/music should return 200 and audio tracks list', async () => {
    const res = await request(app)
      .get('/api/posts/music')
      .query({ mood: 'chill' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data[0]).toHaveProperty('url');
  });
});
