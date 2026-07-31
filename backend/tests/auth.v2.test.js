const request = require('supertest');
const app = require('../src/app');

describe('Auth V2 API Integration Tests', () => {
  describe('POST /api/v2/auth/login', () => {
    it('should return error response with message when login credentials missing', async () => {
      const res = await request(app)
        .post('/api/v2/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v2/profile/me', () => {
    it('should return 401 unauthenticated when no cookie provided', async () => {
      const res = await request(app)
        .get('/api/v2/profile/me');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});
