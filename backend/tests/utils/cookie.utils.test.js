const cookieUtils = require('../../src/utils/cookie.utils');

describe('Cookie Utils Unit Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('buildCookieOptions()', () => {
    it('should return default cookie options with correct maxAge', () => {
      const maxAge = 5000;
      const options = cookieUtils.buildCookieOptions(maxAge);

      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge,
        path: '/'
      });
    });

    it('should set secure to true always for sameSite: none', () => {
      const options = cookieUtils.buildCookieOptions(1000);
      expect(options.secure).toBe(true);
    });
  });

  describe('setAuthCookies()', () => {
    it('should set accessToken and refreshToken on the response object', () => {
      // Mock Response object
      const res = {
        cookie: jest.fn()
      };

      const accessToken = 'mock-access-token-xyz';
      const refreshToken = 'mock-refresh-token-abc';

      cookieUtils.setAuthCookies(res, accessToken, refreshToken);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      
      // Verify accessToken call
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        accessToken,
        expect.objectContaining({
          maxAge: cookieUtils.ACCESS_TOKEN_MAX_AGE_MS,
          httpOnly: true,
          path: '/'
        })
      );

      // Verify refreshToken call
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        refreshToken,
        expect.objectContaining({
          maxAge: cookieUtils.REFRESH_TOKEN_MAX_AGE_MS,
          httpOnly: true,
          path: '/'
        })
      );
    });
  });
});
