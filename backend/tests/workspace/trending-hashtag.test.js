const request = require('supertest');
const app = require('../../src/app');

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'user@publicast.com', name: 'Test User' };
    next();
  }
}));

describe('Trending Hashtag API Tests', () => {
  it('should return trending hashtags for INSTAGRAM', async () => {
    const res = await request(app)
      .get('/api/hashtags/trending?platform=INSTAGRAM&limit=5')
      .expect(200);

    expect(res.body.trending).toBeDefined();
    expect(Array.isArray(res.body.trending)).toBe(true);
    expect(res.body.trending).toHaveLength(5);
    expect(res.body.trending[0].hashtag).toBe('#photography');
    expect(res.body.trending[0].postsCount).toBeDefined();
    expect(res.body.trending[0].reach).toBeDefined();
    expect(res.body.trending[0].growthRate).toBeDefined();
  });

  it('should return trending hashtags for TIKTOK', async () => {
    const res = await request(app)
      .get('/api/hashtags/trending?platform=TIKTOK&limit=3')
      .expect(200);

    expect(res.body.trending).toBeDefined();
    expect(Array.isArray(res.body.trending)).toBe(true);
    expect(res.body.trending).toHaveLength(3);
    expect(res.body.trending[0].hashtag).toBe('#foryoupage');
  });

  it('should return fallback trending hashtags when platform is MOCK or invalid', async () => {
    const res = await request(app)
      .get('/api/hashtags/trending?platform=INVALID&limit=5')
      .expect(200);

    expect(res.body.trending).toBeDefined();
    expect(Array.isArray(res.body.trending)).toBe(true);
    expect(res.body.trending).toHaveLength(5);
    expect(res.body.trending[0].hashtag).toBe('#viral');
  });
});
