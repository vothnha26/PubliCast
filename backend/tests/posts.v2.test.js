const request = require('supertest');
const app = require('../src/app');

describe('Posts & Content Extras V2 API Integration Tests', () => {
  describe('GET /api/v2/posts/platform-limits', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/posts/platform-limits');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v2/content-extras/smart-links', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/content-extras/smart-links?brandId=brand123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});
