const request = require('supertest');
const app = require('../src/app');

describe('System Core & Billing V2 API Integration Tests', () => {
  describe('GET /api/v2/system/health', () => {
    it('should return 200 OK with health envelope response', async () => {
      const res = await request(app)
        .get('/api/v2/system/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'System healthy');
      expect(res.body.data).toHaveProperty('status', 'UP');
    });
  });

  describe('GET /api/v2/billing/subscriptions/plans', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/billing/subscriptions/plans');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});
