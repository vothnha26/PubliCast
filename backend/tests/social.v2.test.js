const request = require('supertest');
const app = require('../src/app');

describe('Social V2 API Integration Tests', () => {
  describe('GET /api/v2/social/youtube/published-videos', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/social/youtube/published-videos?brandId=brand123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v2/social/inbox', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/social/inbox?brandId=brand123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});
