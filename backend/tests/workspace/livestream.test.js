const request = require('supertest');
const app = require('../../src/app');

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'user@publicast.com', name: 'Test User' };
    next();
  }
}));

// Mock Permission Middleware
jest.mock('../../src/middlewares/permission.middleware', () => {
  return jest.fn(() => (req, res, next) => {
    next();
  });
});

describe('Livestream API Disabled Tests', () => {
  it('should return 503 and message when calling GET /api/livestreams/history', async () => {
    const res = await request(app)
      .get('/api/livestreams/history')
      .expect(503);

    expect(res.body.message).toBe('Livestream feature is temporarily disabled');
  });

  it('should return 503 and message when calling POST /api/livestreams/setup', async () => {
    const res = await request(app)
      .post('/api/livestreams/setup')
      .send({ title: 'Test Stream' })
      .expect(503);

    expect(res.body.message).toBe('Livestream feature is temporarily disabled');
  });
});
