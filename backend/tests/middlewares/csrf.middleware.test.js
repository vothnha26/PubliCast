const { issueCsrfToken, verifyCsrfToken, enforceCsrfGlobally, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require('../../src/middlewares/csrf.middleware');

describe('CSRF middleware', () => {
  describe('issueCsrfToken', () => {
    it('sets a csrfToken cookie when the client has none', () => {
      const req = { cookies: {} };
      const res = { cookie: jest.fn() };
      const next = jest.fn();

      issueCsrfToken(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        CSRF_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({ httpOnly: false, sameSite: 'none', secure: true })
      );
      expect(next).toHaveBeenCalled();
    });

    it('does not overwrite an existing csrfToken cookie', () => {
      const req = { cookies: { [CSRF_COOKIE_NAME]: 'existing-token' } };
      const res = { cookie: jest.fn() };
      const next = jest.fn();

      issueCsrfToken(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifyCsrfToken', () => {
    it('rejects when the header is missing', () => {
      const req = { cookies: { [CSRF_COOKIE_NAME]: 'token-123' }, headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects when the cookie is missing', () => {
      const req = { cookies: {}, headers: { [CSRF_HEADER_NAME]: 'token-123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects when the header and cookie values do not match', () => {
      const req = {
        cookies: { [CSRF_COOKIE_NAME]: 'token-123' },
        headers: { [CSRF_HEADER_NAME]: 'different-token' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows the request through when header matches cookie', () => {
      const req = {
        cookies: { [CSRF_COOKIE_NAME]: 'token-123' },
        headers: { [CSRF_HEADER_NAME]: 'token-123' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('enforceCsrfGlobally', () => {
    it('skips GET requests entirely', () => {
      const req = { method: 'GET', path: '/api/brands', cookies: {}, headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      enforceCsrfGlobally(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it.each([
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/2fa/login-verify',
      '/oauth/authorize',
      '/api/webhooks/sepay',
      '/api/payments/sepay',
      '/api/integrations/convo/inbound',
      '/api/smart-links/click/some-id',
      '/api/social/facebook/webhook'
    ])('skips excluded path %s even without a CSRF header', (path) => {
      const req = { method: 'POST', path, cookies: {}, headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      enforceCsrfGlobally(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects a POST to a non-excluded path with no CSRF header', () => {
      const req = { method: 'POST', path: '/api/brands', cookies: { [CSRF_COOKIE_NAME]: 'token-123' }, headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      enforceCsrfGlobally(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows a POST to a non-excluded path with a matching CSRF header', () => {
      const req = {
        method: 'POST',
        path: '/api/brands',
        cookies: { [CSRF_COOKIE_NAME]: 'token-123' },
        headers: { [CSRF_HEADER_NAME]: 'token-123' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      enforceCsrfGlobally(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
