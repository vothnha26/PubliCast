/**
 * Regression tests for #118 M5: 5xx responses previously always returned the
 * raw err.message, which frequently embeds Prisma/driver internals (table,
 * column, constraint names, file paths) — a production information leak.
 * 4xx messages remain intentionally user-facing (validation errors, "not
 * found", etc.) and must be unaffected.
 */
const errorHandler = require('../../src/middlewares/error-handler.middleware');

describe('errorHandler (#118 M5)', () => {
  let req, res, next;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJestWorkerId = process.env.JEST_WORKER_ID;

  beforeEach(() => {
    req = { method: 'GET', url: '/api/test' };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JEST_WORKER_ID = originalJestWorkerId;
  });

  it('replaces the raw error message with a generic one on a 500 in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JEST_WORKER_ID;

    const err = new Error("Unknown column 'brandIdd' in 'field list'");
    err.statusCode = 500;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Internal Server Error');
    expect(body.message).not.toContain('brandIdd');
  });

  it('keeps the raw error message on a 500 in development for debuggability', () => {
    process.env.NODE_ENV = 'development';

    const err = new Error('Detailed dev-only failure reason');
    err.statusCode = 500;

    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Detailed dev-only failure reason');
  });

  it('does not alter a 4xx message even in production (still user-facing)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JEST_WORKER_ID;

    const err = new Error('Email không được để trống.');
    err.statusCode = 400;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Email không được để trống.');
  });
});
