const request = require('supertest');
const app = require('../src/app');

describe('Workspace Core & Media V2 API Integration Tests', () => {
  describe('GET /api/v2/media/signature', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/media/signature');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v2/workspace/brands', () => {
    it('should return 401 unauthenticated when no auth cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/workspace/brands');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});
