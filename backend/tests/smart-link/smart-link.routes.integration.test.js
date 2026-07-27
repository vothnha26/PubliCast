const request = require('supertest');
const app = require('../../src/app');

describe('SmartLink Routes Integration Smoke Tests', () => {
  describe('SL_IT_001 - public smartlink missing slug', () => {
    it('should return 404 for a missing public slug', async () => {
      const res = await request(app).get('/api/smart-links/public/does-not-exist-12345');

      expect(res.status).toBe(404);
    });
  });

  describe('SL_IT_002 - click missing link item', () => {
    it('should return 404 for a missing link item click', async () => {
      const res = await request(app).post('/api/smart-links/click/does-not-exist-12345');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Link Item not found');
    });
  });
});
