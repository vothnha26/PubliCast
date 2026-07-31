const request = require('supertest');
const app = require('../src/app');

describe('Analytics, Reports & Support V2 API Integration Tests', () => {
  describe('GET /api/v2/analytics-support/reports', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/analytics-support/reports?brandId=brand123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v2/analytics-support/ad-accounts/performance', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/analytics-support/ad-accounts/performance?brandId=brand123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});
