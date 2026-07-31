const { issueCsrfToken, verifyCsrfToken, CSRF_COOKIE_NAME } = require('../../src/middlewares/csrf.middleware');

describe('CSRF Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'POST',
      cookies: {},
      headers: {},
      protocol: 'http'
    };
    res = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('issueCsrfToken', () => {
    it('issues a new csrfToken cookie if not present', () => {
      issueCsrfToken(req, res, next);
      expect(res.cookie).toHaveBeenCalledWith(
        CSRF_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({ httpOnly: false, path: '/' })
      );
      expect(next).toHaveBeenCalled();
    });

    it('does not issue a new token if csrfToken cookie already exists', () => {
      req.cookies[CSRF_COOKIE_NAME] = 'existing-token-123';
      issueCsrfToken(req, res, next);
      expect(res.cookie).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifyCsrfToken', () => {
    it('bypasses CSRF check for GET request', () => {
      req.method = 'GET';
      verifyCsrfToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks POST request without CSRF cookie or header', () => {
      verifyCsrfToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('passes POST request with matching CSRF cookie and header', () => {
      const token = 'a'.repeat(64);
      req.cookies[CSRF_COOKIE_NAME] = token;
      req.headers['x-csrf-token'] = token;

      verifyCsrfToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks POST request when header token does not match cookie token', () => {
      req.cookies[CSRF_COOKIE_NAME] = 'a'.repeat(64);
      req.headers['x-csrf-token'] = 'b'.repeat(64);

      verifyCsrfToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_MISMATCH' })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
