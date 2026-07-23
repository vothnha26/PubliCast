const request = require('supertest');

// Mock otplib to prevent ESModule parsing errors on @scure/base in Jest
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    verify: jest.fn()
  }
}));

jest.mock('../../src/services/auth/auth.service', () => ({
  handleGoogleCallback: jest.fn()
}));

jest.mock('../../src/utils/cookie.utils', () => ({
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn()
}));

const authService = require('../../src/services/auth/auth.service');
const app = require('../../src/app');

describe('GET /api/auth/google/callback (#172)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects to the dashboard without leaking the access/refresh tokens in the URL', async () => {
    authService.handleGoogleCallback.mockResolvedValue({
      accessToken: 'secret-access-token',
      refreshToken: 'secret-refresh-token',
      user: { id: 'user-1' }
    });

    const res = await request(app).get('/api/auth/google/callback?code=abc');

    expect(res.status).toBe(302);
    expect(res.headers.location).not.toContain('token=');
    expect(res.headers.location).not.toContain('secret-access-token');
    expect(res.headers.location).not.toContain('secret-refresh-token');
  });
});
