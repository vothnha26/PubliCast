jest.mock('../../src/services/auth/auth.service', () => ({
  handleGoogleCallback: jest.fn()
}));
jest.mock('../../src/utils/cookie.utils', () => ({
  setAuthCookies: jest.fn()
}));

const authService = require('../../src/services/auth/auth.service');
const { setAuthCookies } = require('../../src/utils/cookie.utils');
const authController = require('../../src/controllers/auth/auth.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
}

describe('AuthController#googleCallback redirect (URL token leak fix)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, FRONTEND_URL: 'https://app.example.com' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('redirects to the dashboard without access/refresh tokens in the URL — auth is via the HttpOnly cookies set above', async () => {
    authService.handleGoogleCallback.mockResolvedValue({
      accessToken: 'secret-access-token',
      refreshToken: 'secret-refresh-token'
    });

    const req = { query: { code: 'auth-code' }, cookies: {}, protocol: 'https', get: () => 'app.example.com' };
    const res = mockRes();

    await authController.googleCallback(req, res, jest.fn());

    expect(setAuthCookies).toHaveBeenCalledWith(res, 'secret-access-token', 'secret-refresh-token');
    expect(res.redirect).toHaveBeenCalledWith('https://app.example.com/dashboard?success=google_login');

    const redirectUrl = res.redirect.mock.calls[0][0];
    expect(redirectUrl).not.toContain('secret-access-token');
    expect(redirectUrl).not.toContain('secret-refresh-token');
    expect(redirectUrl).not.toContain('token=');
  });

  it('still redirects to Settings without leaking tokens when linking from an existing session', async () => {
    authService.handleGoogleCallback.mockResolvedValue({
      accessToken: 'secret-access-token',
      refreshToken: 'secret-refresh-token'
    });

    const req = { query: { code: 'auth-code', state: 'settings' }, cookies: {}, protocol: 'https', get: () => 'app.example.com' };
    const res = mockRes();

    await authController.googleCallback(req, res, jest.fn());

    expect(res.redirect).toHaveBeenCalledWith('https://app.example.com/settings?tab=access&success=google_linked');
    expect(res.redirect.mock.calls[0][0]).not.toContain('secret-access-token');
  });
});
